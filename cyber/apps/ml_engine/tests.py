from django.test import TestCase
from django.utils import timezone
from apps.complaints.models import Complaint, TransactionHop
from apps.ml_engine.fraud_features import FraudFeatureExtractor
from apps.ml_engine.cashout_predictor import CashOutPredictor

class MLEngineTestCase(TestCase):
    def setUp(self):
        self.complaint = Complaint.objects.create(
            complaint_number="CC-2026-99999",
            victim_name="Test Victim",
            victim_phone="9876543210",
            victim_district="South Delhi",
            victim_state="Delhi",
            victim_pincode="110001",
            fraud_method="UPI",
            fraud_amount=50000.0,
            status="NEW",
            priority="HIGH",
            fraud_timestamp=timezone.now(),
            narrative_text="Fraud transaction report test"
        )
        self.hop1 = TransactionHop.objects.create(
            complaint=self.complaint,
            hop_number=1,
            from_account="11111111",
            from_bank="State Bank of India",
            to_account="22222222",
            to_bank="HDFC Bank",
            amount=50000.0,
            timestamp=timezone.now()
        )

    def test_feature_extraction(self):
        extractor = FraudFeatureExtractor()
        hops = [self.hop1]
        features = extractor.extract(self.complaint, hops)
        names = extractor.get_feature_names()
        
        self.assertEqual(len(features), len(names))
        self.assertEqual(len(features), 38)
        self.assertIn("fraud_amount", names)
        self.assertNotIn("target_cashout_zone", names)  # Non-circular guarantee

    def test_cashout_predictor_inference(self):
        extractor = FraudFeatureExtractor()
        hops = [self.hop1]
        features = extractor.extract(self.complaint, hops)
        names = extractor.get_feature_names()
        
        predictor = CashOutPredictor()
        predictions = predictor.predict(features, feature_names=names)
        
        self.assertIsInstance(predictions, list)
        self.assertGreaterEqual(len(predictions), 1)
        top_pred = predictions[0]
        self.assertIn("zone_name", top_pred)
        self.assertIn("probability", top_pred)
        self.assertIn("candidate_atms", top_pred)
        self.assertIsInstance(top_pred["candidate_atms"], list)
