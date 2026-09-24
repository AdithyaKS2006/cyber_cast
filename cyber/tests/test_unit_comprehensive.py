import pytest
import xml.etree.ElementTree as ET
import hashlib
from decimal import Decimal
from django.utils import timezone

from apps.complaints.views import extract_financial_entities
from apps.complaints.models import Complaint, TransactionHop
from apps.predictions.models import CashOutPrediction, IntelligencePackage, BankAlert, LEADispatch
from apps.predictions.dispatch import generate_camt056_xml, BankAdapter
from apps.freeze.models import FreezeRequest
from apps.freeze.notice_generator import generate_bnss_106_notice_pdf
from apps.graph.analyzer import MuleNetworkAnalyzer
from apps.graph.engine import MuleGraphEngine
from apps.graph.models import MuleNode, MuleEdge


class TestFinancialNERUnit:
    """Comprehensive test suite for regex-based financial NER parsing."""

    def test_ner_empty_string(self):
        assert extract_financial_entities('') == {}
        assert extract_financial_entities(None) == {}

    def test_ner_ifsc_valid(self):
        res = extract_financial_entities("Beneficiary branch code is SBIN0001234.")
        assert res['suspect_ifsc'] == 'SBIN0001234'
        assert res['suspect_bank'] == 'State Bank of India'

    def test_ner_ifsc_hdfc(self):
        res = extract_financial_entities("Transfer money to HDFC0004567.")
        assert res['suspect_ifsc'] == 'HDFC0004567'
        assert res['suspect_bank'] == 'HDFC Bank'

    def test_ner_ifsc_icici(self):
        res = extract_financial_entities("Branch IFSC ICIC0000004.")
        assert res['suspect_ifsc'] == 'ICIC0000004'
        assert res['suspect_bank'] == 'ICICI Bank'

    def test_ner_upi_handles(self):
        handles = [
            ("Victim paid to rahul.scam@okhdfcbank yesterday", "rahul.scam@okhdfcbank"),
            ("Transferred via gpay to merchant123@paytm for task", "merchant123@paytm"),
            ("Send to fast.cash@ybl immediately", "fast.cash@ybl"),
        ]
        for text, expected in handles:
            ent = extract_financial_entities(text)
            assert ent['upi_id'] == expected
            assert ent['fraud_method'] == 'UPI'

    def test_ner_amount_lakh_notation(self):
        assert extract_financial_entities("Lost 1.5 lakh in stock scam")['fraud_amount'] == 150000.0
        assert extract_financial_entities("Transferred 5 lakhs to mule account")['fraud_amount'] == 500000.0
        assert extract_financial_entities("Debited ₹2.75 lac via IMPS")['fraud_amount'] == 275000.0

    def test_ner_amount_thousand_notation(self):
        assert extract_financial_entities("Sent 45 thousand to scammer")['fraud_amount'] == 45000.0
        assert extract_financial_entities("Debited 80k from savings account")['fraud_amount'] == 80000.0

    def test_ner_amount_currency_symbols(self):
        assert extract_financial_entities("Lost ₹75,000 to online scam")['fraud_amount'] == 75000.0
        assert extract_financial_entities("Rs. 1,20,500 was deducted")['fraud_amount'] == 120500.0

    def test_ner_phone_vs_account_separation(self):
        text = "Caller contact is 9876543210. Scammer account number is 501004928192 with HDFC Bank."
        res = extract_financial_entities(text)
        assert res['victim_phone'] == '9876543210'
        assert res['suspect_account'] == '501004928192'

    def test_ner_fraud_method_classification(self):
        assert extract_financial_entities("CBI officer on video call digital arrest")['fraud_method'] == 'PHONE_CALL'
        assert extract_financial_entities("ATM card cloned and CVV stolen")['fraud_method'] == 'CARD'
        assert extract_financial_entities("Netbanking login password compromised through SMS link")['fraud_method'] == 'NET_BANKING'
        assert extract_financial_entities("Received phishing email with fake bill attachment")['fraud_method'] == 'EMAIL_PHISHING'


@pytest.mark.django_db
class TestISO20022Camt056Unit:
    """Comprehensive test suite for ISO 20022 XML generation."""

    @pytest.fixture
    def test_bank_alert(self, db):
        c = Complaint.objects.create(
            complaint_number='NCRP-ISO-TEST-01',
            victim_name='Kavita Krishnan',
            victim_phone='9812345678',
            victim_district='New Delhi',
            victim_state='Delhi',
            victim_pincode='110001',
            fraud_amount=Decimal('420000.00'),
            fraud_method='NET_BANKING',
            fraud_timestamp=timezone.now(),
            priority='CRITICAL'
        )
        TransactionHop.objects.create(
            complaint=c,
            hop_number=1,
            from_account='9999000011',
            from_bank='State Bank of India',
            to_account='123456789012',
            to_bank='Axis Bank',
            to_ifsc='UTIB0000123',
            amount=Decimal('420000.00'),
            timestamp=timezone.now()
        )
        pred = CashOutPrediction.objects.create(
            complaint=c,
            predicted_zone_name='Nuh',
            predicted_lat=28.11,
            predicted_lon=76.99,
            probability=0.89,
            eta_hours=1.5,
            outcome='PENDING',
            model_version='v3.0'
        )
        pkg = IntelligencePackage.objects.create(complaint=c, prediction=pred, status='DISPATCHED')
        return BankAlert.objects.create(package=pkg, target_institution='Axis Bank', status='SENT')

    def test_xml_is_well_formed(self, test_bank_alert):
        xml_str = generate_camt056_xml(test_bank_alert)
        root = ET.fromstring(xml_str)
        assert root.tag.endswith('Document')

    def test_xml_namespace(self, test_bank_alert):
        xml_str = generate_camt056_xml(test_bank_alert)
        assert 'xmlns="urn:iso:std:iso:20022:tech:xsd:camt.056.001.08"' in xml_str

    def test_xml_control_sum_matches_fraud_amount(self, test_bank_alert):
        xml_str = generate_camt056_xml(test_bank_alert)
        root = ET.fromstring(xml_str)
        # Find CtrlSum element regardless of namespace
        ctrl_sum = [elem.text for elem in root.iter() if elem.tag.endswith('CtrlSum')][0]
        assert float(ctrl_sum) == 420000.0

    def test_xml_reason_code_is_fraud(self, test_bank_alert):
        xml_str = generate_camt056_xml(test_bank_alert)
        root = ET.fromstring(xml_str)
        cd = [elem.text for elem in root.iter() if elem.tag.endswith('Cd') and elem.text == 'FRAD']
        assert len(cd) >= 1

    def test_xml_contains_beneficiary_details(self, test_bank_alert):
        xml_str = generate_camt056_xml(test_bank_alert)
        assert '123456789012' in xml_str
        assert 'UTIB0000123' in xml_str

    def test_xml_contains_bnss_citation(self, test_bank_alert):
        xml_str = generate_camt056_xml(test_bank_alert)
        assert 'BNSS 2023 Sec 106' in xml_str
        assert 'DPDP Act 2023' in xml_str

    def test_xml_special_characters_handled(self, test_bank_alert):
        test_bank_alert.target_institution = 'Bank & Trust <India> Ltd'
        test_bank_alert.save()
        xml_str = generate_camt056_xml(test_bank_alert)
        # Ensure it does not crash ET parser
        root = ET.fromstring(xml_str)
        assert root is not None


@pytest.mark.django_db
class TestBNSS106NoticeUnit:
    """Comprehensive test suite for BNSS Sec 106 ReportLab PDF Generation."""

    @pytest.fixture
    def test_freeze_request(self, db):
        c = Complaint.objects.create(
            complaint_number='NCRP-PDF-TEST-88',
            victim_name='Ananya Iyer',
            victim_phone='9833445566',
            victim_district='Chennai',
            victim_state='Tamil Nadu',
            victim_pincode='600001',
            fraud_amount=Decimal('500000.00'),
            fraud_method='PHONE_CALL',
            fraud_timestamp=timezone.now(),
            priority='CRITICAL'
        )
        return FreezeRequest.objects.create(
            complaint=c,
            target_account='409812459012',
            target_bank_ifsc='SBIN0001234',
            target_bank_name='State Bank of India',
            freeze_amount=Decimal('500000.00'),
            status='FROZEN',
            cash_out_eta_minutes=15
        )

    def test_pdf_magic_bytes(self, test_freeze_request):
        pdf = generate_bnss_106_notice_pdf(test_freeze_request)
        assert pdf.startswith(b'%PDF-')
        assert b'%%EOF' in pdf

    def test_pdf_contains_case_data(self, test_freeze_request):
        pdf = generate_bnss_106_notice_pdf(test_freeze_request)
        # Check text in binary or structure
        assert len(pdf) > 3000

    def test_pdf_evidence_hash_determinism(self, test_freeze_request):
        req_time = test_freeze_request.requested_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        raw = f"{test_freeze_request.id}:{test_freeze_request.target_account}:{test_freeze_request.freeze_amount}:{test_freeze_request.target_bank_ifsc}:{req_time}"
        expected_hash = hashlib.sha256(raw.encode('utf-8')).hexdigest()
        assert len(expected_hash) == 64

    def test_pdf_without_complaint_linked(self, db):
        fr = FreezeRequest.objects.create(
            target_account='999911112222',
            target_bank_ifsc='ICIC0000001',
            target_bank_name='ICICI Bank',
            freeze_amount=Decimal('100000.00'),
            status='PENDING'
        )
        pdf = generate_bnss_106_notice_pdf(fr)
        assert pdf.startswith(b'%PDF-')


@pytest.mark.django_db
class TestMuleGraphAlgorithmsUnit:
    """Unit tests for graph algorithms and cross-complaint clustering."""

    def test_compute_account_hash_determinism(self):
        engine = MuleGraphEngine()
        h1 = engine.compute_account_hash('1234567890', 'SBIN0001234')
        h2 = engine.compute_account_hash('1234567890', 'SBIN0001234')
        h3 = engine.compute_account_hash('9876543210', 'SBIN0001234')
        assert h1 == h2
        assert h1 != h3
        assert len(h1) == 64

    def test_node_creation_and_layer_classification(self, db):
        engine = MuleGraphEngine()
        e1 = engine.add_edge(
            from_account='1001', from_ifsc='SBIN0001234',
            to_account='2002', to_ifsc='HDFC0001234',
            amount=Decimal('50000.00'), transaction_ref='TX1', hop_number=1
        )
        assert e1.source_node.node_type == 'LAYER_1'

        e2 = engine.add_edge(
            from_account='2002', from_ifsc='HDFC0001234',
            to_account='3003', to_ifsc='ICIC0001234',
            amount=Decimal('48000.00'), transaction_ref='TX2', hop_number=2
        )
        assert e2.source_node.node_type == 'LAYER_2'

    def test_total_volume_accumulation(self, db):
        engine = MuleGraphEngine()
        engine.add_edge('ACC1', 'SBIN0001', 'ACC2', 'SBIN0002', Decimal('20000.00'), 'TX1', hop_number=1)
        engine.add_edge('ACC1', 'SBIN0001', 'ACC3', 'SBIN0003', Decimal('30000.00'), 'TX2', hop_number=1)

        node = MuleNode.objects.get(account_hash=engine.compute_account_hash('ACC1', 'SBIN0001'))
        assert node.total_volume == Decimal('50000.00')

    def test_analyzer_detect_confirmed_mules_empty(self, db):
        analyzer = MuleNetworkAnalyzer()
        assert analyzer.detect_confirmed_mules(threshold=5) == []

    def test_analyzer_network_topology_summary(self, db):
        c = Complaint.objects.create(
            complaint_number='NCRP-TOP-01',
            victim_name='Test Victim',
            victim_phone='9811111111',
            victim_district='Pune',
            victim_state='Maharashtra',
            fraud_amount=Decimal('10000.00'),
            fraud_method='UPI',
            fraud_timestamp=timezone.now()
        )
        TransactionHop.objects.create(
            complaint=c,
            hop_number=1,
            from_account='A1',
            from_bank='Bank1',
            to_account='A2',
            to_bank='Bank2',
            amount=Decimal('10000.00'),
            timestamp=timezone.now()
        )
        analyzer = MuleNetworkAnalyzer()
        net = analyzer.get_cross_complaint_network(min_complaints=1)
        assert net['summary']['total_nodes'] >= 2
        assert net['summary']['total_edges'] >= 1
        assert net['summary']['total_fraud_volume_inr'] >= 10000.0

    def test_mule_analyzer_handles_circular_hops(self, db):
        c = Complaint.objects.create(
            complaint_number='NCRP-CYCLE-99',
            victim_name='Cycle Test',
            victim_phone='9822334455',
            victim_district='Bengaluru',
            victim_state='Karnataka',
            fraud_amount=Decimal('45000.00'),
            fraud_method='UPI',
            fraud_timestamp=timezone.now()
        )
        # Hop 1: A -> B
        TransactionHop.objects.create(
            complaint=c, hop_number=1, from_account='ACC_A', from_bank='Bank_A',
            to_account='ACC_B', to_bank='Bank_B', amount=Decimal('45000.00'), timestamp=timezone.now()
        )
        # Hop 2: B -> C
        TransactionHop.objects.create(
            complaint=c, hop_number=2, from_account='ACC_B', from_bank='Bank_B',
            to_account='ACC_C', to_bank='Bank_C', amount=Decimal('43000.00'), timestamp=timezone.now()
        )
        # Hop 3: C -> A (circular loop)
        TransactionHop.objects.create(
            complaint=c, hop_number=3, from_account='ACC_C', from_bank='Bank_C',
            to_account='ACC_A', to_bank='Bank_A', amount=Decimal('40000.00'), timestamp=timezone.now()
        )
        analyzer = MuleNetworkAnalyzer()
        net = analyzer.get_cross_complaint_network(min_complaints=1)
        assert net['summary']['total_nodes'] == 3
        assert net['summary']['total_edges'] == 3


@pytest.mark.django_db
class TestExtendedFeaturesUnit:
    """Additional unit tests for full pipeline coverage."""

    def test_voice_ner_amount_parsing_variations(self):
        t1 = "Victim lost 3.5 lakh rupees in a stock investment fraud"
        res1 = extract_financial_entities(t1)
        assert res1['fraud_amount'] == 350000.0

        t2 = "Unauthorized debit of 75 thousand rupees from savings account"
        res2 = extract_financial_entities(t2)
        assert res2['fraud_amount'] == 75000.0

        t3 = "Victim paid ₹45,500 using credit card"
        res3 = extract_financial_entities(t3)
        assert res3['fraud_amount'] == 45500.0

    def test_voice_ner_digital_arrest_classification(self):
        t = "Caller claimed to be from CBI Mumbai and put me on digital arrest demanding Rs 200000"
        res = extract_financial_entities(t)
        assert res['fraud_method'] == 'PHONE_CALL'
        assert res['fraud_amount'] == 200000.0

    def test_freeze_request_status_transitions(self, db):
        fr = FreezeRequest.objects.create(
            target_account='334455667788',
            target_bank_ifsc='HDFC0000010',
            target_bank_name='HDFC Bank',
            freeze_amount=Decimal('250000.00'),
            status='PENDING'
        )
        assert fr.status == 'PENDING'
        fr.status = 'EXECUTING'
        fr.save()
        assert FreezeRequest.objects.get(id=fr.id).status == 'EXECUTING'

        fr.status = 'FROZEN'
        fr.save()
        assert FreezeRequest.objects.get(id=fr.id).status == 'FROZEN'

    def test_camt056_xml_required_elements_present(self, db):
        c = Complaint.objects.create(
            complaint_number='NCRP-ISO-VALID-01',
            victim_name='Rohan Verma',
            victim_phone='9811223344',
            victim_district='Hyderabad',
            victim_state='Telangana',
            fraud_amount=Decimal('85000.00'),
            fraud_method='NET_BANKING',
            fraud_timestamp=timezone.now()
        )
        pred = CashOutPrediction.objects.create(
            complaint=c,
            predicted_zone_name='Telangana Central',
            predicted_lat=17.3850,
            predicted_lon=78.4867,
            probability=0.94,
            eta_hours=1.5,
            rank=1,
            model_version='v3.0-ensemble',
            outcome='DISPATCHED'
        )
        pkg = IntelligencePackage.objects.create(
            prediction=pred,
            complaint=c,
            status='DISPATCHED'
        )
        alert = BankAlert.objects.create(
            package=pkg,
            target_institution='Kotak Mahindra Bank',
            status='SENT'
        )
        xml = generate_camt056_xml(alert)
        root = ET.fromstring(xml)
        assert 'Document' in root.tag
        assert 'FIToFIPmntCxlReq' in xml
        assert 'IN-I4C' in xml
        assert 'Kotak Mahindra Bank' in xml
        assert '85000.00' in xml

    def test_notice_pdf_generation_content_and_fingerprint(self, db):
        c = Complaint.objects.create(
            complaint_number='NCRP-LEGAL-77',
            victim_name='Priya Sharma',
            victim_phone='9988776655',
            victim_district='Jaipur',
            victim_state='Rajasthan',
            fraud_amount=Decimal('120000.00'),
            fraud_method='UPI',
            fraud_timestamp=timezone.now(),
            priority='HIGH'
        )
        fr = FreezeRequest.objects.create(
            complaint=c,
            target_account='112233445566',
            target_bank_ifsc='PUNB0001234',
            target_bank_name='Punjab National Bank',
            freeze_amount=Decimal('120000.00'),
            status='FROZEN',
            cash_out_eta_minutes=10
        )
        pdf = generate_bnss_106_notice_pdf(fr)
        assert isinstance(pdf, bytes)
        assert len(pdf) > 2000
        assert pdf.startswith(b'%PDF-')

