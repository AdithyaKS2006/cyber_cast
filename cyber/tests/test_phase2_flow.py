import hmac
import hashlib
import json
import pytest
from decimal import Decimal
from django.utils import timezone
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.ingest.models import ProactiveAlert
from apps.freeze.models import FreezeRequest
from apps.freeze.decider import evaluate_and_freeze
from apps.graph.models import MuleNode, MuleEdge
from apps.graph.engine import MuleGraphEngine

TEST_WEBHOOK_SECRETS = {
    'NPCI': 'dev-secret-change-in-prod',
    'HDFC': 'hdfc-secret-key-123'
}


def _compute_hmac(secret: str, payload_bytes: bytes) -> str:
    return hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()


@pytest.mark.django_db
@override_settings(WEBHOOK_SECRETS=TEST_WEBHOOK_SECRETS)
def test_webhook_receives_and_creates_alert():
    client = APIClient()
    url = reverse('ingest:npci-alert')
    payload_data = {
        "alert_id": "NPCI-FLOW-001",
        "from_account": "1122334455",
        "from_bank_ifsc": "HDFC0001234",
        "to_account": "9988776655",
        "to_bank_ifsc": "SBIN0005678",
        "amount": 200000.0,
        "fraud_score": 0.92,
        "fraud_indicators": ["high_velocity"]
    }
    body = json.dumps(payload_data).encode('utf-8')
    signature = _compute_hmac('dev-secret-change-in-prod', body)

    response = client.post(
        url,
        data=body,
        content_type='application/json',
        HTTP_X_CRIMECAST_SIGNATURE=signature
    )

    assert response.status_code == 202
    alert = ProactiveAlert.objects.get(alert_id="NPCI-FLOW-001")
    assert alert.from_account == "1122334455"
    assert alert.to_account == "9988776655"
    assert float(alert.amount) == 200000.0
    assert float(alert.fraud_score) == 0.92
    assert alert.source == "NPCI"
    assert alert.status == 'ANALYZED'


@pytest.mark.django_db
@override_settings(I4C_MOCK_MODE=True)
def test_freeze_decider_auto_triggers():
    alert = ProactiveAlert.objects.create(
        alert_id="NPCI-FREEZE-002",
        source="NPCI",
        from_account="1122334455",
        from_bank_ifsc="HDFC0001234",
        to_account="9988776655",
        to_bank_ifsc="SBIN0005678",
        amount=Decimal("200000.00"),
        fraud_score=0.92,
        status="RECEIVED"
    )

    freeze_req = evaluate_and_freeze(alert)

    assert freeze_req is not None
    assert freeze_req.proactive_alert == alert
    assert freeze_req.status == 'FROZEN'
    assert freeze_req.auto_triggered is True
    assert freeze_req.target_account == "9988776655"
    assert Decimal(str(freeze_req.freeze_amount)) == Decimal("200000.00")


@pytest.mark.django_db
def test_mule_graph_edge_creation():
    engine = MuleGraphEngine()
    now_time = timezone.now()

    edge = engine.add_edge(
        from_account='ACC1',
        from_ifsc='HDFC0001',
        to_account='ACC2',
        to_ifsc='SBIN0001',
        amount=200000,
        transaction_ref='TXN123',
        timestamp=now_time,
        hop_number=1
    )

    assert MuleNode.objects.count() == 2
    assert MuleEdge.objects.count() == 1
    assert edge.source_node.node_type == 'LAYER_1'
    assert edge.source_node.bank_ifsc == 'HDFC0001'
    assert edge.target_node.bank_ifsc == 'SBIN0001'
    assert float(edge.amount) == 200000.0


@pytest.mark.django_db
@override_settings(WEBHOOK_SECRETS=TEST_WEBHOOK_SECRETS)
def test_invalid_webhook_rejected():
    client = APIClient()
    url = reverse('ingest:npci-alert')
    payload_data = {
        "alert_id": "NPCI-REJECT-999",
        "amount": 50000.0,
        "fraud_score": 0.85
    }
    body = json.dumps(payload_data).encode('utf-8')

    response = client.post(
        url,
        data=body,
        content_type='application/json',
        HTTP_X_CRIMECAST_SIGNATURE="invalid_signature_hash_str"
    )

    assert response.status_code == 403
    assert not ProactiveAlert.objects.filter(alert_id="NPCI-REJECT-999").exists()
