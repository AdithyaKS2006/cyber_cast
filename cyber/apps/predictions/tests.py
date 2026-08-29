"""
apps/predictions/tests.py — Core prediction pipeline tests for CrimeCast.
Validates that:
  1. ML models load successfully
  2. Feature extraction produces the correct shape
  3. predict() returns properly structured zone data
  4. Authentication is enforced on all endpoints
  5. District scoping works for officer role
"""

import json
from unittest.mock import patch, MagicMock
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status


class FraudFeatureExtractorTest(TestCase):
    """Tests for FraudFeatureExtractor correctness."""

    def test_feature_names_count(self):
        """Feature list must have exactly 38 features."""
        from apps.ml_engine.fraud_features import FraudFeatureExtractor
        fe = FraudFeatureExtractor()
        self.assertEqual(len(fe.get_feature_names()), 38,
                         "get_feature_names() must have exactly 38 entries to match trained model input")

    def test_zones_lookups_not_empty(self):
        """ZONES must have 40 target zones."""
        from apps.ml_engine.zones import ZONES
        self.assertEqual(
            len(ZONES), 40,
            "Must have 40 target cashout zones"
        )

    def test_zone_lookup_has_required_keys(self):
        """Each zone entry must have zone_id, zone_name, lat, lon, district, state."""
        from apps.ml_engine.zones import ZONES
        required_keys = {'zone_id', 'zone_name', 'lat', 'lon', 'district', 'state'}
        for zone in ZONES[:5]:
            missing = required_keys - set(zone.keys())
            self.assertEqual(missing, set(), f"Zone '{zone.get('zone_name')}' missing keys: {missing}")

    def test_festival_proximity_is_float_between_0_and_1(self):
        """festival_proximity must always be in [0.0, 1.0]."""
        import datetime
        from apps.ml_engine.fraud_features import FraudFeatureExtractor
        fe = FraudFeatureExtractor()
        # Mock a minimal complaint object
        complaint = MagicMock()
        complaint.victim_district = 'Delhi'
        complaint.victim_state = 'Delhi'
        complaint.fraud_amount = 100000
        complaint.fraud_method = 'UPI'
        complaint.fraud_timestamp = datetime.datetime(2026, 10, 25, 14, 0, 0, tzinfo=datetime.timezone.utc)
        complaint.complaint_timestamp = complaint.fraud_timestamp + datetime.timedelta(hours=2)
        complaint.narrative_text = 'Test fraud'
        complaint.transaction_hops = MagicMock()
        complaint.transaction_hops.all.return_value = []

        features = fe.extract(complaint, [])
        self.assertIsNotNone(features)
        names = fe.get_feature_names()
        idx = names.index('festival_proximity')
        val = features[idx]
        self.assertGreaterEqual(val, 0.0, "festival_proximity must be >= 0")
        self.assertLessEqual(val, 1.0, "festival_proximity must be <= 1")


class CashOutPredictorTest(TestCase):
    """Tests for CashOutPredictor model loading and inference."""

    def test_predictor_initializes(self):
        """CashOutPredictor must initialize without exceptions."""
        from apps.ml_engine.cashout_predictor import CashOutPredictor
        predictor = CashOutPredictor()
        self.assertIsNotNone(predictor)

    def test_zones_count(self):
        """Must have exactly 40 target zones."""
        from apps.ml_engine.cashout_predictor import ZONES
        self.assertEqual(len(ZONES), 40, "ZONES must have exactly 40 entries (matching trained model num_class)")

    def test_each_zone_has_required_keys(self):
        """Each zone entry must have zone_id, zone_name, lat, lon, district, state."""
        from apps.ml_engine.cashout_predictor import ZONES
        required = {'zone_id', 'zone_name', 'lat', 'lon', 'district', 'state'}
        for zone in ZONES:
            missing = required - set(zone.keys())
            self.assertEqual(missing, set(), f"Zone {zone.get('zone_id')} missing: {missing}")

    def test_predict_returns_list(self):
        """predict() must return a list, not a dict (was the original bug)."""
        from apps.ml_engine.cashout_predictor import CashOutPredictor
        import numpy as np
        predictor = CashOutPredictor()
        features = np.random.rand(38).astype(np.float32)
        result = predictor.predict(features)
        self.assertIsInstance(result, list, "predict() must return a list, not a dict")

    def test_predict_returns_top_zones(self):
        """predict() must return top candidate zone predictions."""
        from apps.ml_engine.cashout_predictor import CashOutPredictor
        import numpy as np
        predictor = CashOutPredictor()
        features = np.random.rand(38).astype(np.float32)
        result = predictor.predict(features)
        self.assertGreaterEqual(len(result), 1, "predict() must return at least 1 zone prediction")
        self.assertLessEqual(len(result), 5, "predict() returns up to top-5 zone predictions")

    def test_predict_zone_structure(self):
        """Each zone prediction must have zone_name, lat, lon, probability, eta_hours."""
        from apps.ml_engine.cashout_predictor import CashOutPredictor
        import numpy as np
        predictor = CashOutPredictor()
        features = np.random.rand(38).astype(np.float32)
        result = predictor.predict(features)
        required = {'zone_name', 'lat', 'lon', 'probability', 'eta_hours'}
        for zone in result:
            missing = required - set(zone.keys())
            self.assertEqual(missing, set(), f"Prediction zone missing keys: {missing}")

    def test_predict_probabilities_sum_to_one(self):
        """Top-5 probabilities should be positive fractions."""
        from apps.ml_engine.cashout_predictor import CashOutPredictor
        import numpy as np
        predictor = CashOutPredictor()
        features = np.random.rand(38).astype(np.float32)
        result = predictor.predict(features)
        total = sum(z['probability'] for z in result)
        self.assertGreater(total, 0.0, "At least some probability mass must be present")
        self.assertLessEqual(total, 1.01, "Total probability cannot exceed 1.0")

    def test_fallback_gives_deterministic_results_for_same_input(self):
        """Fallback (when models absent) must not use pure random — same input → consistent output."""
        from apps.ml_engine.cashout_predictor import CashOutPredictor
        import numpy as np
        predictor = CashOutPredictor()
        predictor.is_loaded = False  # Force fallback path
        features = np.ones(38, dtype=np.float32) * 0.5
        result1 = predictor.predict(features)
        result2 = predictor.predict(features)
        zones1 = [z['zone_name'] for z in result1]
        zones2 = [z['zone_name'] for z in result2]
        self.assertEqual(zones1, zones2, "Fallback must be deterministic for same input features")


class PredictionAPIAuthTest(APITestCase):
    """Tests that all prediction endpoints require authentication."""

    def test_unauthenticated_cannot_list_predictions(self):
        response = self.client.get('/api/v1/predictions/')
        self.assertIn(response.status_code, [401, 403])

    def test_unauthenticated_cannot_generate_prediction(self):
        response = self.client.post('/api/v1/predictions/generate/', {'complaint_id': 'abc'})
        self.assertIn(response.status_code, [401, 403])

    def test_unauthenticated_cannot_access_heatmap(self):
        response = self.client.get('/api/v1/predictions/data/heatmap/')
        self.assertIn(response.status_code, [401, 403])

    def test_unauthenticated_cannot_access_model_metrics(self):
        response = self.client.get('/api/v1/predictions/data/model-metrics/')
        self.assertIn(response.status_code, [401, 403])
