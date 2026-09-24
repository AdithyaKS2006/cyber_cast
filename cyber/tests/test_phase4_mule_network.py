import pytest
from decimal import Decimal
from django.utils import timezone
from django.test import Client
from apps.complaints.models import Complaint, TransactionHop
from apps.graph.analyzer import MuleNetworkAnalyzer
from apps.graph.models import MuleNode, MuleEdge


@pytest.fixture
def multi_case_data(db):
    """Creates two distinct complaints sharing the same mule account."""
    c1 = Complaint.objects.create(
        complaint_number='NCRP-2026-CASE-01',
        victim_name='Amit Verma',
        victim_phone='9811001100',
        victim_district='Bengaluru Urban',
        victim_state='Karnataka',
        victim_pincode='560001',
        fraud_amount=Decimal('150000.00'),
        fraud_method='UPI',
        fraud_timestamp=timezone.now(),
        priority='HIGH'
    )
    TransactionHop.objects.create(
        complaint=c1,
        hop_number=1,
        from_account='1000000001',
        from_bank='State Bank of India',
        from_ifsc='SBIN0001234',
        to_account='501004928192',
        to_bank='HDFC Bank',
        to_ifsc='HDFC0001234',
        amount=Decimal('150000.00'),
        timestamp=timezone.now()
    )

    c2 = Complaint.objects.create(
        complaint_number='NCRP-2026-CASE-02',
        victim_name='Sunita Patil',
        victim_phone='9822002200',
        victim_district='Pune',
        victim_state='Maharashtra',
        victim_pincode='411001',
        fraud_amount=Decimal('220000.00'),
        fraud_method='PHONE_CALL',
        fraud_timestamp=timezone.now(),
        priority='HIGH'
    )
    TransactionHop.objects.create(
        complaint=c2,
        hop_number=1,
        from_account='2000000002',
        from_bank='ICICI Bank',
        from_ifsc='ICIC0000002',
        to_account='501004928192',  # Same shared mule account!
        to_bank='HDFC Bank',
        to_ifsc='HDFC0001234',
        amount=Decimal('220000.00'),
        timestamp=timezone.now()
    )
    return c1, c2


@pytest.mark.django_db
class TestPhase4MuleNetwork:
    def test_cross_complaint_detection(self, multi_case_data):
        analyzer = MuleNetworkAnalyzer()
        confirmed = analyzer.detect_confirmed_mules(threshold=2)

        assert len(confirmed) >= 1
        shared_mule = next((m for m in confirmed if m['bank_ifsc'] == 'HDFC0001234'), None)
        assert shared_mule is not None
        assert shared_mule['complaint_count'] == 2
        assert 'NCRP-2026-CASE-01' in shared_mule['complaints']
        assert 'NCRP-2026-CASE-02' in shared_mule['complaints']
        assert shared_mule['risk_score'] >= 0.85

    def test_cross_complaint_network_endpoint(self, multi_case_data):
        client = Client()
        res = client.get('/api/v2/graph/network/?min_complaints=1')
        assert res.status_code == 200
        data = res.json()

        assert 'nodes' in data
        assert 'edges' in data
        assert 'summary' in data
        assert data['summary']['confirmed_mules_count'] >= 1
        assert data['summary']['total_fraud_volume_inr'] >= 370000.0

        # Verify confirmed mule node annotation
        confirmed_nodes = [n for n in data['nodes'] if n['is_confirmed_mule']]
        assert len(confirmed_nodes) >= 1
        assert confirmed_nodes[0]['node_type'] == 'CONFIRMED_MULE'
        assert confirmed_nodes[0]['complaint_count'] >= 2

    def test_confirmed_mules_endpoint(self, multi_case_data):
        client = Client()
        res = client.get('/api/v2/graph/confirmed-mules/?threshold=2')
        assert res.status_code == 200
        data = res.json()
        assert data['threshold'] == 2
        assert data['confirmed_mules_count'] >= 1
        assert len(data['mules']) >= 1
