import os
import logging
import joblib
import math
import numpy as np
from django.conf import settings

from apps.ml_engine.zones import ZONES, ZONE_BY_ID, get_candidate_atms_for_zone, get_dbscan_micro_clusters

logger = logging.getLogger('crimecast.ml_engine')

class CashOutPredictor:
    def __init__(self):
        self.models_dir = os.path.join(settings.BASE_DIR, 'ml_models', 'saved_models')
        os.makedirs(self.models_dir, exist_ok=True)
        
        self.lgbm_path = os.path.join(self.models_dir, 'lgbm_model.joblib')
        self.le_path = os.path.join(self.models_dir, 'label_encoder.joblib')
        
        self.lgbm_model = None
        self.le = None
        self.is_loaded = False

    def load_models(self):
        """Loads serialized models if they exist."""
        try:
            if os.path.exists(self.lgbm_path):
                self.lgbm_model = joblib.load(self.lgbm_path)
                logger.info('LightGBM model loaded from %s', self.lgbm_path)
            if os.path.exists(self.le_path):
                self.le = joblib.load(self.le_path)
                logger.info('Label Encoder loaded from %s', self.le_path)

            self.is_loaded = bool(self.lgbm_model)
            if not self.is_loaded:
                logger.warning('No ML models found at %s', self.models_dir)
        except Exception as e:
            logger.error('Model load failed: %s', e, exc_info=True)
            self.is_loaded = False

    def predict(self, features, feature_names=None, complaint=None):
        """
        Runs two-tier spatial inference to predict top 5 cashout zones and candidate ATMs.
        
        Architecture:
          - Tier 1 (Macro): Single calibrated LightGBM model ranks 40 spatial zones.
          - Tier 2 (Micro): DBSCAN GIS clustering pinpoints high-density ATM hotspots within top zones.
          - Interdiction Estimator: Velocity-based window estimator based on RBI settlement cycles.
        
        features: numpy array of shape (1, n_features) or (n_features,)
        """
        if not self.is_loaded:
            self.load_models()
            
        if not self.is_loaded:
            logger.error("ML models are not loaded. Cannot perform inference.")
            raise RuntimeError("CrimeCast ML models are not loaded. Run `python train_cashout_model.py` to train them.")

        features_2d = np.array(features).reshape(1, -1)

        # Predict probabilities
        if self.lgbm_model:
            final_probs = self.lgbm_model.predict_proba(features_2d)[0]
        else:
            raise RuntimeError("No model available for prediction")
        
        # Get top 5 indices
        top5_indices = np.argsort(final_probs)[-5:][::-1]
        
        results = []
        for rank, idx in enumerate(top5_indices):
            if self.le:
                try:
                    zone_id = int(self.le.inverse_transform([idx])[0])
                    zone = ZONE_BY_ID.get(zone_id)
                except Exception:
                    zone = ZONE_BY_ID.get(idx + 1)
            else:
                zone_id = idx + 1
                zone = ZONE_BY_ID.get(zone_id)
                
            if not zone:
                continue
                
            prob = float(final_probs[idx])
            candidate_atms = get_candidate_atms_for_zone(zone["zone_id"])
            dbscan_clusters = get_dbscan_micro_clusters(zone["zone_id"])
            eta_val = self._estimate_eta(zone, complaint)

            results.append({
                "rank": rank + 1,
                "zone_id": zone["zone_id"],
                "zone_name": zone["zone_name"],
                "lat": zone["lat"],
                "lon": zone["lon"],
                "district": zone["district"],
                "state": zone["state"],
                "probability": round(prob, 4),
                "eta_hours": eta_val,
                "interdiction_window_hours": eta_val,
                "spatial_architecture": "Hierarchical Two-Tier (LightGBM Macro + DBSCAN Micro GIS)",
                "candidate_atms": candidate_atms,
                "dbscan_clusters": dbscan_clusters
            })

        if not results:
            return []

        top_pred = results[0]
        
        # Compute exact SHAP values for this specific sample if available via LightGBM booster
        top_pred["feature_importance_json"] = {}
        top_pred["shap_attributions"] = {}
        try:
            raw_booster = getattr(self.lgbm_model, 'booster_', None)
            if hasattr(self.lgbm_model, 'estimator'):
                raw_booster = getattr(self.lgbm_model.estimator, 'booster_', None)

            if raw_booster:
                contribs = raw_booster.predict(features_2d, pred_contrib=True)
                # Parse per-class SHAP contribution
                if len(contribs.shape) == 3:
                    sample_shap = contribs[0, top5_indices[0], :-1]
                elif len(contribs.shape) == 2:
                    sample_shap = contribs[0, :-1]
                else:
                    sample_shap = None

                if sample_shap is not None and feature_names:
                    shap_pairs = {feature_names[i]: round(float(sample_shap[i]), 5) for i in range(len(feature_names))}
                    top_pred["shap_attributions"] = shap_pairs
                    top_pred["feature_importance_json"] = dict(sorted(shap_pairs.items(), key=lambda x: abs(x[1]), reverse=True)[:5])

            if not top_pred["feature_importance_json"]:
                fi_path = os.path.join(self.models_dir, "feature_importance.joblib")
                if os.path.exists(fi_path):
                    fi_data = joblib.load(fi_path)
                    importance = fi_data.get('shap_importance', fi_data.get('importance_gain', {}))
                    top_features = dict(sorted(importance.items(), key=lambda x: abs(x[1]), reverse=True)[:5])
                    top_pred["feature_importance_json"] = top_features
        except Exception as e:
            logger.warning(f"Could not compute SHAP feature importance: {e}")
            
        return results

    @staticmethod
    def haversine(lat1, lon1, lat2, lon2):
        """Calculate the great-circle distance between two points on the Earth surface."""
        R = 6371  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2) * math.sin(dlat/2) + \
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
            math.sin(dlon/2) * math.sin(dlon/2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c

    def _estimate_eta(self, zone, complaint=None):
        """
        Estimate ETA based on Haversine distance from victim to zone, 
        plus fraud-method specific velocity (from I4C & RBI documented baselines).
        This no longer relies on model prediction confidence.
        """
        distance_km = 0
        method = getattr(complaint, 'fraud_method', 'UNKNOWN') if complaint else 'UNKNOWN'

        if complaint:
            origin_lat, origin_lon = None, None
            # Find origin coordinates (last known hop)
            try:
                hops = list(complaint.transaction_hops.all().order_by('hop_number'))
                if hops:
                    last_hop = hops[-1]
                    if last_hop.latitude and last_hop.longitude:
                        origin_lat, origin_lon = float(last_hop.latitude), float(last_hop.longitude)
            except Exception:
                pass
            
            if origin_lat is not None and origin_lon is not None:
                distance_km = self.haversine(origin_lat, origin_lon, zone['lat'], zone['lon'])
        
        # Dynamic Multi-Variable Spatial-Temporal Interdiction ETA Model (PRD 5.3)
        # ETA = t_settlement(method) + (dist_km / v_transit) + (hops * dt_hop) - t_elapsed
        method_base = {
            'UPI': 1.5,
            'CARD': 4.5,
            'NET_BANKING': 14.0,
            'EMAIL_PHISHING': 22.0,
            'PHONE_CALL': 2.5,
        }
        base_time = method_base.get(method, 4.0)

        # Layering hop latency (each hop adds ~0.75 hours of bank/mule movement coordination)
        hop_count = 1
        elapsed_hours = 0.0
        if complaint:
            try:
                hops_list = list(complaint.transaction_hops.all())
                hop_count = max(1, len(hops_list))
            except Exception:
                hop_count = 1
                
            try:
                from django.utils import timezone
                if hasattr(complaint, 'created_at') and complaint.created_at:
                    elapsed = (timezone.now() - complaint.created_at).total_seconds() / 3600.0
                    elapsed_hours = max(0.0, elapsed)
            except Exception:
                elapsed_hours = 0.0

        hop_delay = hop_count * 0.75
        spatial_transit_time = distance_km / 350.0  # Regional courier / physical transit speed (~350 km/h)
        
        eta = (base_time + hop_delay + spatial_transit_time) - elapsed_hours
        return round(min(72.0, max(0.5, eta)), 1)

    def generate_narrative(self, prediction_result, complaint):
        """Formats a human-readable investigation brief."""
        zone = prediction_result.get("zone_name", "Unknown Zone")
        prob = prediction_result.get("probability", 0.0) * 100
        eta = prediction_result.get("eta_hours", 0.0)
        amount = getattr(complaint, 'fraud_amount', 'N/A')
        method = getattr(complaint, 'fraud_method', 'N/A')
        
        atms = prediction_result.get("candidate_atms", [])
        atm_summary = ", ".join([f"{a['bank']} ({a['atm_id']})" for a in atms[:2]]) if atms else "District ATMs"
        
        features = prediction_result.get("feature_importance_json", {})
        top_factors = ", ".join([f"{k.replace('_', ' ').title()}" for k in features.keys()]) or "Transaction Velocity, Hotspot Prior"
        
        brief = f"""
CRIMECAST INVESTIGATION BRIEF
-----------------------------
Complaint Number: {getattr(complaint, 'complaint_number', 'Unknown')}
Fraud Method: {method}
Amount at Risk: ₹{amount}

PREDICTION ALERT:
Our ML engine predicts a {prob:.1f}% probability of cash-out activity at {zone}.
Estimated Time of Arrival (ETA): {eta} hours.

KEY TARGET LOCATIONS:
Monitored ATMs: {atm_summary}

KEY RISK FACTORS:
Driving factors: {top_factors}.

RECOMMENDATION:
Dispatch LEA units or notify bank networks for targeted monitoring at {zone} candidate ATMs within the next {eta} hours.
"""
        return brief.strip()
