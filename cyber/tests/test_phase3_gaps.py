import pytest
import uuid
import xml.etree.ElementTree as ET
from decimal import Decimal
from django.utils import timezone
from django.test import Client

from apps.complaints.models import Complaint, TransactionHop
from apps.complaints.views import extract_financial_entities
from apps.predictions.models import (
    CashOutPrediction, IntelligencePackage, BankAlert, LEADispatch
)
from apps.predictions.dispatch import generate_camt056_xml, BankAdapter
from apps.freeze.models import FreezeRequest
from apps.freeze.notice_generator import generate_bnss_106_notice_pdf
from apps.users.models import User


@pytest.fixture
def test_user(db):
    user = User.objects.create_user(
        username='investigator1',
        password='TestPassword123!',
        email='investigator@cybercell.gov.in',
        role='analyst'
    )
    return user


@pytest.fixture
def auth_client(test_user):
    client = Client()
    client.force_login(test_user)
    return client


@pytest.fixture
def sample_complaint(db):
    c = Complaint.objects.create(
        complaint_number='NCRP-2026-TEST-999',
        victim_name='Rohan Sharma',
        victim_phone='9876543210',
        victim_email='rohan@example.com',
        victim_district='Bengaluru Urban',
        victim_state='Karnataka',
        victim_pincode='560001',
        fraud_amount=Decimal('250000.00'),
        fraud_method='UPI',
        fraud_timestamp=timezone.now(),
        narrative_text='Victim was coerced in digital arrest scam into transferring 250000 rupees to mule account.',
        priority='HIGH'
    )

    TransactionHop.objects.create(
        complaint=c,
        hop_number=1,
        from_account='1122334455',
        from_bank='State Bank of India',
        from_ifsc='SBIN0001234',
        to_account='501004928192',
        to_bank='HDFC Bank',
        to_ifsc='HDFC0001234',
        amount=Decimal('250000.00'),
        timestamp=timezone.now(),
        is_mule_flagged=True
    )
    return c


@pytest.mark.django_db
class TestPhase3RakshaNetGaps:
    def test_financial_ner_extraction(self):
        """Test regex-based Financial NER for audio transcripts."""
        text = (
            "Caller reports fraud debit of 2.5 lakh rupees via digital arrest scam. "
            "Phone number is 9876543210. Scammer asked to transfer to HDFC Bank "
            "account 501004928192 IFSC HDFC0001234 UPI handle fraudster.mule@okhdfc."
        )
        entities = extract_financial_entities(text)

        assert entities['fraud_amount'] == 250000.0
        assert entities['suspect_ifsc'] == 'HDFC0001234'
        assert entities['suspect_bank'] == 'HDFC Bank'
        assert entities['suspect_account'] == '501004928192'
        assert entities['victim_phone'] == '9876543210'
        assert entities['upi_id'] == 'fraudster.mule@okhdfc'
        assert entities['fraud_method'] == 'PHONE_CALL'

    def test_voice_transcribe_endpoint(self, auth_client):
        """Test POST /api/v1/complaints/voice-transcribe/"""
        payload = {
            'text': 'Transferred 50000 rupees via UPI scam to account 30981245678 IFSC SBIN0001234.'
        }
        res = auth_client.post('/api/v1/complaints/voice-transcribe/', data=payload, content_type='application/json')
        assert res.status_code == 200
        data = res.json()
        assert data['entities']['fraud_amount'] == 50000.0
        assert data['entities']['suspect_ifsc'] == 'SBIN0001234'
        assert data['entities']['suspect_bank'] == 'State Bank of India'
        assert 'BNSS 2023' in data['legal_compliance']['statutory_basis']
        assert 'DPDP Act 2023' in data['legal_compliance']['privacy_basis']

    def test_iso20022_camt056_xml_generation(self, sample_complaint):
        """Test ISO 20022 camt.056.001.08 XML generation from BankAlert."""
        pred = CashOutPrediction.objects.create(
            complaint=sample_complaint,
            predicted_zone_name='Jamtara',
            predicted_lat=24.21,
            predicted_lon=86.64,
            probability=0.88,
            eta_hours=2,
            outcome='PENDING',
            model_version='v3.0'
        )
        pkg = IntelligencePackage.objects.create(
            complaint=sample_complaint,
            prediction=pred,
            status='DISPATCHED'
        )
        bank_alert = BankAlert.objects.create(
            package=pkg,
            target_institution='HDFC Bank',
            status='SENT'
        )

        xml = generate_camt056_xml(bank_alert)
        assert xml.startswith('<?xml version="1.0" encoding="UTF-8"?>')
        assert 'urn:iso:std:iso:20022:tech:xsd:camt.056.001.08' in xml
        assert '<FIToFIPmntCxlReq>' in xml
        assert '<Cd>FRAD</Cd>' in xml
        assert '250000.00' in xml
        assert 'HDFC0001234' in xml
        assert 'BNSS 2023 Sec 106' in xml

        # Also test BankAdapter.send saves the xml in iso20022_payload
        BankAdapter.send(bank_alert)
        bank_alert.refresh_from_db()
        assert bank_alert.status == 'DELIVERED'
        assert 'FIToFIPmntCxlReq' in bank_alert.iso20022_payload

    def test_bnss_citations_in_payloads(self, sample_complaint):
        """Verify BNSS 2023 citations in BankAlert and LEADispatch payloads."""
        pred = CashOutPrediction.objects.create(
            complaint=sample_complaint,
            predicted_zone_name='Mewat',
            predicted_lat=28.02,
            predicted_lon=76.99,
            probability=0.92,
            eta_hours=1,
            outcome='PENDING',
            model_version='v3.0'
        )
        pkg = IntelligencePackage.objects.create(

            complaint=sample_complaint,
            prediction=pred,
            status='DISPATCHED'
        )
        bank_alert = BankAlert.objects.create(
            package=pkg,
            target_institution='HDFC Bank',
            status='SENT'
        )
        payload = bank_alert.to_payload()
        assert 'BNSS 2023 Section 106' in payload['legal_basis']
        assert payload['cfcfrms_mapping']['freeze_action'] == 'FREEZE_BENEFICIARY_ACCOUNT_SEC_106_BNSS_2023'
        assert 'DPDP Act 2023' in payload['privacy_basis']
        assert 'iso20022_xml' in payload
        assert len(payload['iso20022_xml']) > 100

        lea_dispatch = LEADispatch.objects.create(
            package=pkg,
            target_district='Mewat',
            status='SENT'
        )
        lea_payload = lea_dispatch.to_payload()
        assert 'BNSS 2023 Section 106' in lea_payload['legal_basis']
        assert 'DPDP Act 2023' in lea_payload['privacy_basis']

    def test_bnss_106_notice_pdf_generation(self, sample_complaint):
        """Test PDF generation for Section 106 Notice with ReportLab."""
        fr = FreezeRequest.objects.create(
            complaint=sample_complaint,
            target_account='501004928192',
            target_bank_ifsc='HDFC0001234',
            target_bank_name='HDFC Bank',
            freeze_amount=Decimal('250000.00'),
            status='FROZEN',
            cash_out_eta_minutes=15
        )

        pdf = generate_bnss_106_notice_pdf(fr)
        assert isinstance(pdf, bytes)
        assert pdf.startswith(b'%PDF-')
        assert len(pdf) > 2000

    def test_freeze_notice_endpoint(self, auth_client, sample_complaint):
        """Test GET /api/v2/freeze/<id>/notice/ endpoint."""
        fr = FreezeRequest.objects.create(
            complaint=sample_complaint,
            target_account='501004928192',
            target_bank_ifsc='HDFC0001234',
            target_bank_name='HDFC Bank',
            freeze_amount=Decimal('250000.00'),
            status='FROZEN',
            cash_out_eta_minutes=15
        )

        res = auth_client.get(f'/api/v2/freeze/{fr.id}/notice/')
        assert res.status_code == 200
        assert res['Content-Type'] == 'application/pdf'
        assert 'BNSS_Sec106_FreezeNotice' in res['Content-Disposition']
        assert res.content.startswith(b'%PDF-')
