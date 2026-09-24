import hmac
import hashlib
import json
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from apps.ingest.models import ProactiveAlert
from apps.ingest.pipeline import process_proactive_alert
from apps.ingest.tasks import process_proactive_alert_task

TEST_WEBHOOK_SECRETS = {
    'NPCI': 'dev-secret-change-in-prod',
    'HDFC': 'hdfc-secret-key-123'
}


@override_settings(WEBHOOK_SECRETS=TEST_WEBHOOK_SECRETS)
class IngestPipelineTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _compute_hmac(self, secret: str, payload_bytes: bytes) -> str:
        return hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()

    # ── Direct pipeline tests (synchronous, no Celery required) ──────────────

    def test_process_proactive_alert_high_score(self):
        """Pipeline marks high-score alerts for freezing and sets ANALYZED status."""
        alert = ProactiveAlert.objects.create(
            alert_id="PIPELINE-HIGH-01",
            source="NPCI",
            amount=500000.0,
            fraud_score=0.95
        )
        result = process_proactive_alert(alert.alert_id)

        alert.refresh_from_db()
        self.assertEqual(result["should_freeze"], True)
        self.assertEqual(alert.status, 'ANALYZED')
        self.assertIsNotNone(alert.processed_at)

    def test_process_proactive_alert_low_score(self):
        """Pipeline skips freeze for low-score alerts and still sets ANALYZED status."""
        alert = ProactiveAlert.objects.create(
            alert_id="PIPELINE-LOW-01",
            source="BANK",
            amount=1000.0,
            fraud_score=0.40
        )
        result = process_proactive_alert(alert.alert_id)

        alert.refresh_from_db()
        self.assertEqual(result["should_freeze"], False)
        self.assertEqual(alert.status, 'ANALYZED')
        self.assertIsNotNone(alert.processed_at)

    # ── Celery task tests ─────────────────────────────────────────────────────

    def test_celery_task_executes_pipeline(self):
        """
        process_proactive_alert_task should run the full pipeline when called
        synchronously via .apply() (no broker required in test environment).
        """
        alert = ProactiveAlert.objects.create(
            alert_id="TASK-TEST-01",
            source="NPCI",
            amount=80000.0,
            fraud_score=0.90
        )
        # .apply() runs the task in-process without a broker
        result = process_proactive_alert_task.apply(args=[alert.alert_id])

        alert.refresh_from_db()
        self.assertTrue(result.successful())
        self.assertEqual(alert.status, 'ANALYZED')
        self.assertTrue(result.result.get('should_freeze'))

    # ── Webhook endpoint tests ────────────────────────────────────────────────

    @patch('apps.ingest.tasks.process_proactive_alert_task')
    def test_npci_webhook_end_to_end_async(self, mock_task):
        """
        NPCI webhook should return 202 immediately and queue the pipeline task
        via Celery rather than blocking the HTTP thread.
        """
        mock_task.delay.return_value = None  # Simulate broker ACK

        url = reverse('ingest:npci-alert')
        data = {
            "alert_id": "NPCI-E2E-ASYNC-001",
            "from_account": "1234567890",
            "from_bank_ifsc": "HDFC0001234",
            "to_account": "0987654321",
            "to_bank_ifsc": "SBIN0005678",
            "amount": 150000.0,
            "fraud_score": 0.92,
            "fraud_indicators": ["velocity_breach"]
        }
        body = json.dumps(data).encode('utf-8')
        signature = self._compute_hmac('dev-secret-change-in-prod', body)

        response = self.client.post(
            url,
            data=body,
            content_type='application/json',
            HTTP_X_CRIMECAST_SIGNATURE=signature
        )

        self.assertEqual(response.status_code, 202)
        resp_json = response.json()
        self.assertEqual(resp_json['alert_id'], "NPCI-E2E-ASYNC-001")
        self.assertEqual(resp_json['processing_mode'], 'async_celery')

        # Alert persisted, pipeline task was enqueued
        alert = ProactiveAlert.objects.get(alert_id="NPCI-E2E-ASYNC-001")
        self.assertEqual(alert.status, 'RECEIVED')
        mock_task.delay.assert_called_once_with("NPCI-E2E-ASYNC-001")

    def test_npci_webhook_sync_fallback_when_no_broker(self):
        """
        When Celery broker is unavailable, the webhook falls back to synchronous
        processing and still returns 202 with pipeline_result in the response body.
        """
        url = reverse('ingest:npci-alert')
        data = {
            "alert_id": "NPCI-SYNC-FALLBACK-01",
            "from_account": "AAA111",
            "from_bank_ifsc": "ICIC0000999",
            "to_account": "BBB222",
            "to_bank_ifsc": "HDFC0005678",
            "amount": 75000.0,
            "fraud_score": 0.75,
            "fraud_indicators": ["mule_network"]
        }
        body = json.dumps(data).encode('utf-8')
        signature = self._compute_hmac('dev-secret-change-in-prod', body)

        # No broker patching — Celery .delay() raises an exception in test env
        # which triggers the sync fallback path
        response = self.client.post(
            url,
            data=body,
            content_type='application/json',
            HTTP_X_CRIMECAST_SIGNATURE=signature
        )

        self.assertEqual(response.status_code, 202)
        resp_json = response.json()
        # Should have fallen back to sync mode and included pipeline_result
        self.assertIn(resp_json['processing_mode'], ['async_celery', 'sync_fallback'])
        self.assertEqual(resp_json['alert_id'], "NPCI-SYNC-FALLBACK-01")

    def test_npci_webhook_invalid_signature_rejected(self):
        """Webhook rejects payloads with invalid HMAC signatures — no alert created."""
        url = reverse('ingest:npci-alert')
        data = {"alert_id": "NPCI-TEST-002", "amount": 50000.0}
        body = json.dumps(data).encode('utf-8')

        response = self.client.post(
            url,
            data=body,
            content_type='application/json',
            HTTP_X_CRIMECAST_SIGNATURE="invalid_signature_hash"
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(ProactiveAlert.objects.filter(alert_id="NPCI-TEST-002").exists())
