"""
CrimeCast Full Pipeline Integration Tests
Validates end-to-end workflow:
1. Complaint ingestion & reference generation
2. Prediction execution & model status tracking
3. HITL review enforcement (<70% confidence requires explicit approval)
4. Dispatch intelligence package generation
5. Unauthenticated request blocking
"""

import datetime
from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.complaints.models import Complaint, TransactionHop
from apps.predictions.models import CashOutPrediction, IntelligencePackage

User = get_user_model()


class FullPipelineTest(TestCase):
    def setUp(self):
        self.analyst = User.objects.create_user(
            username='test_analyst',
            password='TestPassword123!',
            role='analyst',
            first_name='Test',
            last_name='Analyst'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.analyst)

    def _create_sample_complaint(self):
        return Complaint.objects.create(
            victim_name="Ramesh Kumar",
            victim_phone="+919876543210",
            victim_email="ramesh@example.com",
            victim_district="New Delhi",
            victim_state="Delhi",
            victim_pincode="110001",
            fraud_amount=150000,
            fraud_method="UPI",
            fraud_timestamp=datetime.datetime.now(tz=datetime.timezone.utc),
            narrative_text="Phishing link fraud via UPI transfer",
            status='NEW',
            priority='HIGH'
        )

    def test_complaint_number_auto_generation(self):
        complaint = self._create_sample_complaint()
        self.assertIsNotNone(complaint.complaint_number)
        self.assertTrue(complaint.complaint_number.startswith("CC-"))

    def test_prediction_pipeline_execution(self):
        from apps.predictions.tasks import run_prediction_pipeline
        complaint = self._create_sample_complaint()
        TransactionHop.objects.create(
            complaint=complaint,
            from_account="1122334455",
            from_bank="SBI",
            to_account="9988776655",
            to_bank="PNB",
            amount=150000,
            timestamp=datetime.datetime.now(tz=datetime.timezone.utc),
            hop_number=1,
            is_mule_flagged=True,
            latitude=28.6139,
            longitude=77.2090
        )
        preds = run_prediction_pipeline(complaint)
        complaint.refresh_from_db()
        self.assertIn(complaint.status, ['PREDICTION_ACTIVE', 'MODEL_UNAVAILABLE'])

    def test_hitl_review_gate_blocks_unauthorized_dispatch(self):
        """NEEDS_REVIEW predictions must block auto-dispatch without analyst approval."""
        complaint = self._create_sample_complaint()
        pred = CashOutPrediction.objects.create(
            complaint=complaint,
            predicted_zone_name="Jamtara",
            predicted_lat=23.97,
            predicted_lon=86.79,
            probability=0.45,
            eta_hours=8.0,
            rank=1,
            model_version='v1.0-lightgbm',
            outcome='NEEDS_REVIEW'
        )
        response = self.client.post(f'/api/v1/predictions/{pred.pk}/dispatch/', {})
        self.assertIn(response.status_code, [400, 403])

    def test_hitl_review_gate_allows_approved_dispatch(self):
        """NEEDS_REVIEW predictions succeed when analyst explicitly approves."""
        complaint = self._create_sample_complaint()
        pred = CashOutPrediction.objects.create(
            complaint=complaint,
            predicted_zone_name="Jamtara",
            predicted_lat=23.97,
            predicted_lon=86.79,
            probability=0.45,
            eta_hours=8.0,
            rank=1,
            model_version='v1.0-lightgbm',
            outcome='NEEDS_REVIEW'
        )
        response = self.client.post(
            f'/api/v1/predictions/{pred.pk}/dispatch/',
            {'analyst_approved': True},
            format='json'
        )
        self.assertIn(response.status_code, [200, 201])
        self.assertTrue(IntelligencePackage.objects.filter(prediction=pred).exists())

    def test_unauthenticated_requests_denied(self):
        unauth_client = APIClient()
        response = unauth_client.get('/api/v1/predictions/')
        self.assertIn(response.status_code, [401, 403])
