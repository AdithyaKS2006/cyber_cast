import numpy as np
import datetime
import math
import logging
from django.utils import timezone

from apps.ml_engine.zones import FEATURE_COLS, ZONES, ZONE_BY_ID

logger = logging.getLogger('crimecast.ml_engine')

class FraudFeatureExtractor:
    FRAUD_METHOD_MAP = {
        'UPI': 0, 'NET_BANKING': 1, 'CARD': 2, 'CRYPTO': 3, 'OTHER': 4
    }

    def get_feature_names(self):
        return FEATURE_COLS

    def _nlp_scores(self, text):
        text = str(text).lower()
        
        negative_words = ['lost', 'stolen', 'cheated', 'fraud', 'scam', 'fake', 'urgent', 'help', 'money']
        sentiment = 0.0
        for w in negative_words:
            if w in text:
                sentiment -= 0.1
        sentiment = max(-1.0, sentiment)

        urgency_words = ['urgent', 'immediately', 'quick', 'fast', 'now', 'asap']
        urgency = 0.0
        for w in urgency_words:
            if w in text:
                urgency += 0.2
        urgency = min(1.0, urgency)

        risk_words = ['otp', 'password', 'pin', 'link', 'app', 'anydesk', 'teamviewer', 'kyc']
        risk = 0.0
        for w in risk_words:
            if w in text:
                risk += 0.2
        risk = min(1.0, risk)

        return sentiment, urgency, risk

    def _haversine(self, lat1, lon1, lat2, lon2):
        if None in (lat1, lon1, lat2, lon2):
            return 0.0
        R = 6371  # Earth radius km
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1-a))

    def _find_zone(self, district_name):
        if not district_name:
            return ZONE_BY_ID[1] # fallback Jamtara
        district_lower = str(district_name).lower()
        for z in ZONES:
            if z['district'].lower() in district_lower or district_lower in z['district'].lower():
                return z
        logger.warning(
            "District '%s' not registered in 40-zone Northern Cyber Belt Phase 1 pilot grid. "
            "Falling back to default baseline zone (Jamtara). "
            "Nationwide 766-district expansion requires live NCRP district-level feed.",
            district_name
        )
        return ZONE_BY_ID[1] # fallback

    def extract(self, complaint, transaction_chain):
        f = {}
        
        # 1. Complaint Features (12)
        f['fraud_amount'] = float(complaint.fraud_amount) / 500000.0 if complaint.fraud_amount else 0.0
        
        complaint_ts = complaint.complaint_timestamp or datetime.datetime.now()
        fraud_ts = complaint.fraud_timestamp or complaint_ts
        
        f['complaint_hour'] = complaint_ts.hour / 23.0
        f['complaint_day_of_week'] = complaint_ts.weekday() / 6.0
        f['time_since_fraud'] = max(0.0, (complaint_ts - fraud_ts).total_seconds() / 3600.0) / 1440.0
        f['fraud_method_encoded'] = self.FRAUD_METHOD_MAP.get(str(complaint.fraud_method).upper(), 4) / 4.0
        
        geo = self._find_zone(complaint.victim_district)
        
        # Dynamic victim features
        victim_age = float(getattr(complaint, 'victim_age', 35) or 35)
        f['victim_age_group'] = min(1.0, max(0.0, victim_age / 100.0))
        
        unique_states_list = sorted(list(set(z['state'] for z in ZONES)))
        state_name = getattr(complaint, 'victim_state', None) or geo['state']
        state_idx = unique_states_list.index(state_name) if state_name in unique_states_list else 0
        f['victim_state_encoded'] = float(state_idx) / max(1.0, float(len(unique_states_list) - 1))
        
        v_lon = float(getattr(complaint, 'victim_lon', None) or geo['lon'])
        f['victim_district_encoded'] = float(int((v_lon - 68.1) / 29.3 * 700.0) % 700) / 700.0
        f['repeat_victim_flag'] = 1.0 if getattr(complaint, 'is_repeat_victim', False) else 0.0
        
        sent, urg, risk = self._nlp_scores(getattr(complaint, 'narrative_text', '') or '')
        f['complaint_text_sentiment'] = sent
        f['urgency_score'] = urg
        f['keyword_risk_score'] = risk
        
        # 2. Transaction Chain Features (14)
        hops = list(transaction_chain) if transaction_chain else []
        f['hop_count'] = len(hops) / 12.0
        f['total_chain_amount'] = sum(float(getattr(h, 'amount', 0)) for h in hops) / 500000.0 if hops else f['fraud_amount']
        
        if hops:
            first_ts = getattr(hops[0], 'timestamp', fraud_ts) or fraud_ts
            last_ts = getattr(hops[-1], 'timestamp', fraud_ts) or fraud_ts
            f['chain_duration_minutes'] = max(0.0, (last_ts - first_ts).total_seconds() / 60.0) / 2880.0
        else:
            f['chain_duration_minutes'] = 0.0
            
        f['amount_split_ratio'] = f['total_chain_amount'] / f['fraud_amount'] if f['fraud_amount'] > 0 else 1.0
        
        unique_banks = set()
        for h in hops:
            unique_banks.add(getattr(h, 'from_bank', ''))
            unique_banks.add(getattr(h, 'to_bank', ''))
        f['unique_banks_in_chain'] = len(unique_banks) / 6.0
        
        hop_states = []
        for h in hops:
            hop_district = getattr(h, 'district', None)
            z = self._find_zone(hop_district)
            hop_states.append(z['state'])
        unique_states = len(set(hop_states)) if hop_states else 1
        f['cross_state_hops'] = (unique_states - 1) / 4.0
        
        # Dynamic hop distribution calculations
        if hops:
            account_ages = [float(getattr(h, 'account_age_days', getattr(h, 'mule_account_age_days', 30)) or 30) for h in hops]
            f['avg_account_age_days'] = (sum(account_ages) / len(account_ages)) / 365.0
            
            new_acc_cnt = sum(1 for h in hops if float(getattr(h, 'account_age_days', getattr(h, 'mule_account_age_days', 30)) or 30) <= 30)
            f['new_account_ratio'] = float(new_acc_cnt) / float(len(hops))
            
            round_cnt = sum(1 for h in hops if (float(getattr(h, 'amount', 0)) % 1000) == 0)
            f['round_amount_ratio'] = float(round_cnt) / float(len(hops))
            
            night_cnt = sum(1 for h in hops if (getattr(h, 'timestamp', fraud_ts) or fraud_ts).hour >= 22 or (getattr(h, 'timestamp', fraud_ts) or fraud_ts).hour <= 6)
            f['nighttime_transfer_ratio'] = float(night_cnt) / float(len(hops))
            
            max_hop_amt = max(float(getattr(h, 'amount', 0)) for h in hops)
            f['max_single_hop_amount'] = max_hop_amt / 500000.0
            
            last_to_bank = str(getattr(hops[-1], 'to_bank', '') or '').upper().strip()
            bank_hash = sum(ord(c) for c in last_to_bank[:4]) if last_to_bank else 0
            f['beneficiary_bank_code'] = (bank_hash % 28) / 28.0
            
            last_mule_age = float(getattr(hops[-1], 'account_age_days', getattr(hops[-1], 'mule_account_age_days', 15)) or 15)
            f['mule_account_age_days'] = min(1.0, max(0.0, last_mule_age / 180.0))
        else:
            f['avg_account_age_days'] = 30.0 / 365.0
            f['new_account_ratio'] = 0.5
            f['round_amount_ratio'] = 0.4
            f['nighttime_transfer_ratio'] = 0.2
            f['max_single_hop_amount'] = f['fraud_amount']
            f['beneficiary_bank_code'] = 0.5
            f['mule_account_age_days'] = 15.0 / 180.0
            
        f['weekend_transfer_flag'] = 1.0 if complaint_ts.weekday() >= 5 else 0.0
        
        # 3. Safe Geo Features (6)
        f['victim_lat'] = (geo['lat'] - 8.0) / 24.0
        f['victim_lon'] = (geo['lon'] - 68.0) / 24.0
        
        if hops and hasattr(hops[0], 'latitude') and getattr(hops[0], 'latitude'):
            hop_lat = float(hops[0].latitude)
            hop_lon = float(hops[0].longitude)
            f['distance_from_victim_km'] = min(1.0, self._haversine(geo['lat'], geo['lon'], hop_lat, hop_lon) / 1500.0)
        else:
            f['distance_from_victim_km'] = 50.0 / 1500.0
            
        f['nearest_state_border_km'] = min(1.0, (min(abs(geo['lat'] - 20.0), abs(geo['lon'] - 78.0)) * 111.0) / 300.0)
        f['has_txn_location'] = 1.0 if hops else 0.0
        f['hotspot_prior_score'] = float(geo.get('hotspot_weight', 0.5))
        
        # 4. Temporal Features (6)
        now = timezone.now() if hasattr(timezone, 'now') else datetime.datetime.now()
        f['hours_since_last_transfer'] = max(0.0, (now - fraud_ts).total_seconds() / 3600.0) / 48.0
        f['remaining_window_estimate'] = max(1.0, 48.0 - f['hours_since_last_transfer'] * 48.0) / 12.0
        f['day_of_month'] = now.day / 31.0

        today = now.date() if hasattr(now, 'date') else datetime.date.today()
        yr = today.year
        FESTIVAL_DATES = [
            datetime.date(y, m, d)
            for y in (yr - 1, yr, yr + 1)
            for m, d in [(1, 26), (3, 25), (8, 15), (10, 2), (10, 20), (10, 29), (11, 5), (12, 25)]
        ]
        days_to_nearest = min(abs((today - d).days) for d in FESTIVAL_DATES)
        f['festival_proximity'] = round(max(0.0, 1.0 - days_to_nearest / 30.0), 3)

        f['time_to_bank_closing'] = max(0.0, 17.0 - now.hour) / 8.0 if 9 <= now.hour <= 17 else 0.0
        if len(hops) > 1:
            first_ts = getattr(hops[0], 'timestamp', fraud_ts) or fraud_ts
            last_ts = getattr(hops[-1], 'timestamp', fraud_ts) or fraud_ts
            elapsed_hours = max(0.0, (last_ts - first_ts).total_seconds() / 3600.0)
            if elapsed_hours > 0.01: # Cap very small durations
                f['velocity_of_transfers'] = float(len(hops)) / elapsed_hours
            else:
                f['velocity_of_transfers'] = 0.0
        else:
            f['velocity_of_transfers'] = 0.0

        # Build feature vector matching FEATURE_COLS
        feature_array = []
        for name in FEATURE_COLS:
            feature_array.append(float(f.get(name, 0.0)))
            
        return np.array(feature_array, dtype=np.float32)
