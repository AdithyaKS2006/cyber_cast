from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.core import mail
from django.urls import reverse
from rest_framework.test import APIClient
from decimal import Decimal
from apps.ingest.models import ProactiveAlert
from apps.freeze.models import FreezeRequest
from apps.freeze.i4c_client import I4CClient
from apps.freeze.decider import evaluate_and_freeze
from apps.freeze.nodal_registry import get_nodal_officer
from apps.freeze.nodal_ping import ping_nodal_officer


class FreezeRequestModelTest(TestCase):
    def test_create_freeze_request(self):
        req = FreezeRequest.objects.create(
            target_account="1122334455",
            target_bank_ifsc="HDFC0001234",
            target_bank_name="HDFC Bank",
            freeze_amount=Decimal("150000.00"),
            auto_triggered=True
        )
        self.assertEqual(req.status, 'PENDING')
        self.assertEqual(req.cash_out_eta_minutes, 15)
        self.assertTrue(req.auto_triggered)
        self.assertIn("1122334455", str(req))


class I4CClientTests(TestCase):
    @override_settings(I4C_MOCK_MODE=True)
    def test_mock_request_freeze(self):
        client = I4CClient()
        res = client.request_freeze("9876543210", "SBIN0001234", 250000.0, "REF-001")
        self.assertEqual(res["status"], "FROZEN")
        self.assertTrue(res["freeze_id"].startswith("MOCK-I4C-"))

    @override_settings(I4C_MOCK_MODE=True)
    def test_mock_check_status_and_revoke(self):
        client = I4CClient()
        status_res = client.check_freeze_status("MOCK-I4C-1234")
        self.assertEqual(status_res["status"], "FROZEN")

        revoke_res = client.revoke_freeze("MOCK-I4C-1234", "False alarm")
        self.assertEqual(revoke_res["status"], "REVOKED")

    @override_settings(I4C_MOCK_MODE=False, I4C_API_BASE_URL="https://api.i4c.gov.in/v1", I4C_API_TOKEN="test-token")
    @patch('requests.post')
    def test_real_mode_request_freeze_success(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"freeze_id": "REAL-I4C-9999", "status": "FROZEN"}
        mock_post.return_value = mock_resp

        client = I4CClient()
        res = client.request_freeze("9876543210", "SBIN0001234", 250000.0, "REF-001")

        self.assertEqual(res["status"], "FROZEN")
        self.assertEqual(res["freeze_id"], "REAL-I4C-9999")
        mock_post.assert_called_once()

    @override_settings(I4C_MOCK_MODE=False)
    @patch('requests.post', side_effect=Exception("Connection timed out"))
    def test_real_mode_request_freeze_failure(self, mock_post):
        client = I4CClient()
        res = client.request_freeze("9876543210", "SBIN0001234", 250000.0, "REF-001")
        self.assertEqual(res["status"], "FAILED")
        self.assertIn("Connection timed out", res["error"])


@override_settings(I4C_MOCK_MODE=True, NODAL_PING_MOCK_MODE=True)
class DeciderEngineTests(TestCase):
    def setUp(self):
        self.alert_high = ProactiveAlert.objects.create(
            alert_id="DEC-001",
            source="NPCI",
            to_account="9988776655",
            to_bank_ifsc="HDFC0001234",
            amount=200000.0,
            fraud_score=0.92
        )
        self.alert_medium = ProactiveAlert.objects.create(
            alert_id="DEC-002",
            source="NPCI",
            to_account="8877665544",
            to_bank_ifsc="SBIN0005678",
            amount=100000.0,
            fraud_score=0.78
        )
        self.alert_large_amount = ProactiveAlert.objects.create(
            alert_id="DEC-003",
            source="NPCI",
            to_account="7766554433",
            to_bank_ifsc="ICIC0001111",
            amount=750000.0,
            fraud_score=0.96
        )

    def test_high_score_auto_freeze_success(self):
        freeze_req = evaluate_and_freeze(self.alert_high)
        self.assertIsNotNone(freeze_req)
        self.assertEqual(freeze_req.status, 'FROZEN')
        self.assertTrue(freeze_req.auto_triggered)
        self.assertTrue(freeze_req.i4c_freeze_id.startswith("MOCK-I4C-"))

    def test_medium_score_qualifying_amount_auto_freeze(self):
        freeze_req = evaluate_and_freeze(self.alert_medium)
        self.assertIsNotNone(freeze_req)
        self.assertEqual(freeze_req.status, 'FROZEN')

    def test_large_amount_skips_auto_freeze_needs_officer(self):
        freeze_req = evaluate_and_freeze(self.alert_large_amount)
        self.assertIsNone(freeze_req)
        self.assertFalse(FreezeRequest.objects.filter(proactive_alert=self.alert_large_amount).exists())


class NodalRegistryAndPingTests(TestCase):
    def test_get_nodal_officer_lookup(self):
        hdfc = get_nodal_officer("HDFC0001234")
        self.assertEqual(hdfc["name"], "HDFC Bank Nodal Officer")
        self.assertEqual(hdfc["email"], "nodalfocell@hdfcbank.com")

        unknown = get_nodal_officer("XXXX0001234")
        self.assertIsNone(unknown["email"])

    @override_settings(NODAL_PING_MOCK_MODE=True)
    def test_ping_nodal_officer_mock_mode(self):
        req = FreezeRequest.objects.create(
            target_account="9988776655",
            target_bank_ifsc="SBIN0001234",
            freeze_amount=Decimal("100000.00")
        )
        res = ping_nodal_officer(req)
        self.assertTrue(res)

    @override_settings(NODAL_PING_MOCK_MODE=False)
    def test_ping_nodal_officer_real_email_mode(self):
        req = FreezeRequest.objects.create(
            target_account="9988776655",
            target_bank_ifsc="ICIC0001234",
            freeze_amount=Decimal("150000.00")
        )
        res = ping_nodal_officer(req)
        self.assertTrue(res)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["headcybercrime@icicibank.com"])
        self.assertIn("ICICI Bank Nodal Officer", mail.outbox[0].body)

    @override_settings(NODAL_PING_MOCK_MODE=False)
    def test_ping_nodal_officer_missing_email(self):
        req = FreezeRequest.objects.create(
            target_account="9988776655",
            target_bank_ifsc="UNKNOWN001",
            freeze_amount=Decimal("50000.00")
        )
        res = ping_nodal_officer(req)
        self.assertFalse(res)
        self.assertEqual(len(mail.outbox), 0)


class FreezeAPIViewsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.req1 = FreezeRequest.objects.create(
            target_account="1234123412",
            target_bank_ifsc="HDFC0001234",
            target_bank_name="HDFC Bank",
            freeze_amount=Decimal("200000.00"),
            status='PENDING'
        )
        self.req2 = FreezeRequest.objects.create(
            target_account="5678567856",
            target_bank_ifsc="SBIN0005678",
            target_bank_name="SBI Bank",
            freeze_amount=Decimal("100000.00"),
            status='FROZEN'
        )

    def test_freeze_queue_endpoint(self):
        url = reverse('freeze:freeze-queue')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["target_account"], "5678567856")

    @override_settings(NODAL_PING_MOCK_MODE=True)
    def test_freeze_manual_ping_endpoint(self):
        url = reverse('freeze:freeze-manual-ping', kwargs={'freeze_id': self.req1.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "PING_DISPATCHED")
        self.assertTrue(response.data["success"])

    def test_system_config_endpoint(self):
        url = reverse('system_config')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("demo_mode", response.data)
        self.assertTrue(response.data["demo_mode"])
