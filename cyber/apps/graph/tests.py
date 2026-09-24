import uuid
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from apps.graph.models import MuleNode, MuleEdge
from apps.graph.engine import MuleGraphEngine
from apps.complaints.models import Complaint
from apps.ingest.models import ProactiveAlert
from apps.ingest.pipeline import process_proactive_alert


class MuleGraphEngineTests(TestCase):
    def setUp(self):
        self.engine = MuleGraphEngine()
        self.complaint = Complaint.objects.create(
            complaint_number="CMP-9900",
            victim_name="Test Victim",
            victim_phone="9988776655",
            victim_district="Hyderabad",
            victim_state="Telangana",
            victim_pincode="500001",
            fraud_amount=Decimal("150000.00"),
            fraud_method="UPI",
            fraud_timestamp=timezone.now(),
            narrative_text="Fraudulent debit via UPI"
        )

    def test_get_or_create_node(self):
        node1 = self.engine.get_or_create_node("1234567890", "HDFC0001234", "VICTIM")
        self.assertIsNotNone(node1)
        self.assertEqual(node1.bank_ifsc, "HDFC0001234")
        self.assertEqual(node1.node_type, "VICTIM")
        self.assertEqual(node1.transaction_count, 1)

        # Retrieve existing
        node2 = self.engine.get_or_create_node("1234567890", "HDFC0001234")
        self.assertEqual(node1.id, node2.id)
        self.assertEqual(node2.transaction_count, 2)

    def test_add_edge_and_volume_update(self):
        edge = self.engine.add_edge(
            from_account="1111222233",
            from_ifsc="SBIN0001111",
            to_account="4444555566",
            to_ifsc="HDFC0004444",
            amount=50000.00,
            transaction_ref="TXN-001",
            hop_number=1,
            complaint=self.complaint
        )
        self.assertEqual(edge.amount, Decimal("50000.00"))
        self.assertEqual(edge.source_node.node_type, "LAYER_1")
        self.assertEqual(edge.source_node.total_volume, Decimal("50000.00"))

    def test_get_graph_for_complaint(self):
        self.engine.add_edge(
            from_account="1111222233",
            from_ifsc="SBIN0001111",
            to_account="4444555566",
            to_ifsc="HDFC0004444",
            amount=75000.00,
            transaction_ref="TXN-002",
            hop_number=1,
            complaint=self.complaint
        )

        graph_data = self.engine.get_graph_for_complaint(self.complaint.id)
        self.assertEqual(graph_data["complaint_id"], str(self.complaint.id))
        self.assertEqual(len(graph_data["nodes"]), 2)
        self.assertEqual(len(graph_data["edges"]), 1)
        self.assertEqual(graph_data["edges"][0]["amount"], 75000.00)


class GraphAPIViewsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.engine = MuleGraphEngine()
        self.complaint = Complaint.objects.create(
            complaint_number="CMP-9901",
            victim_name="Victim 2",
            victim_phone="8877665544",
            victim_district="Cyberabad",
            victim_state="Telangana",
            victim_pincode="500081",
            fraud_amount=Decimal("50000.00"),
            fraud_method="UPI",
            fraud_timestamp=timezone.now(),
            narrative_text="Fraudulent debit"
        )
        self.engine.add_edge(
            from_account="9999000011",
            from_ifsc="ICIC0009999",
            to_account="8888000022",
            to_ifsc="UTIB0008888",
            amount=50000.00,
            transaction_ref="TXN-003",
            hop_number=1,
            complaint=self.complaint
        )

    def test_complaint_graph_endpoint(self):
        url = reverse('graph:complaint-graph', kwargs={'complaint_id': self.complaint.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("nodes", response.data)
        self.assertIn("edges", response.data)
        self.assertEqual(len(response.data["nodes"]), 2)

    def test_node_list_endpoint(self):
        url = reverse('graph:node-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)


class PipelineGraphIntegrationTests(TestCase):
    def test_pipeline_creates_graph_edge(self):
        alert = ProactiveAlert.objects.create(
            alert_id="NPCI-GRAPH-001",
            source="NPCI",
            from_account="12340001",
            from_bank_ifsc="HDFC0001234",
            to_account="56780002",
            to_bank_ifsc="SBIN0005678",
            amount=250000.0,
            fraud_score=0.91
        )

        res = process_proactive_alert(alert.alert_id)
        self.assertEqual(res["status"], "ANALYZED")

        # Verify edge was inserted into Mule Graph
        src_hash = MuleGraphEngine.compute_account_hash("12340001", "HDFC0001234")
        tgt_hash = MuleGraphEngine.compute_account_hash("56780002", "SBIN0005678")

        self.assertTrue(MuleNode.objects.filter(account_hash=src_hash).exists())
        self.assertTrue(MuleNode.objects.filter(account_hash=tgt_hash).exists())
        self.assertTrue(MuleEdge.objects.filter(transaction_ref="NPCI-GRAPH-001").exists())
