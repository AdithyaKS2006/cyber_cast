import os
import sys
import json
import numpy as np
import pandas as pd
import random
import datetime
import math

# Add the parent directory of `apps` to the python path so we can import from `apps`
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from apps.ml_engine.zones import ZONES, FEATURE_COLS

def _haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1-a))

def generate_fraud_data(num_samples=10000):
    np.random.seed(42)
    random.seed(42)
    
    fraud_amounts = np.clip(np.random.lognormal(mean=11.9, sigma=1.0, size=num_samples), 5000, 5000000)
    methods = ['UPI'] * 45 + ['Phone'] * 25 + ['Card'] * 15 + ['NetBanking'] * 10 + ['Other'] * 5
    method_encoded_map = {'UPI': 1, 'Card': 2, 'NetBanking': 3, 'Phone': 4, 'Other': 6}
    
    data = []
    
    for i in range(num_samples):
        amount = fraud_amounts[i]
        method = random.choice(methods)
        
        if method == 'UPI':
            hours_since_last = random.uniform(2, 4)
            cross_state = 0 if random.random() < 0.8 else 1
        elif method == 'Phone':
            hours_since_last = random.uniform(4, 8)
            cross_state = 1 if random.random() < 0.7 else 0
        elif method == 'Card':
            hours_since_last = random.uniform(1, 2)
            cross_state = 0
        else:
            hours_since_last = random.uniform(2, 10)
            cross_state = random.choice([0, 1])

        # Victim location (random anywhere)
        victim_lat = random.uniform(8.0, 37.0)
        victim_lon = random.uniform(68.0, 97.0)

        # Mule chain length
        n_hops = random.randint(2, 6)
        
        # Calculate probabilities for cashout zone
        zone_probs = []
        for z in ZONES:
            hotspot_weight = z['hotspot_weight']
            # method affinity
            method_affinity = 1.0
            if method == 'UPI' and z['urban_score'] > 0.8: method_affinity = 1.5
            if method == 'Phone' and z['urban_score'] < 0.5: method_affinity = 1.5
            
            # amount fit based on atm density
            amount_fit = 1.0
            if amount > 500000 and z['atm_density'] > 100: amount_fit = 1.5
            if amount <= 50000 and z['atm_density'] < 50: amount_fit = 1.2
            
            # distance decay (from victim for now, since we build chain towards cashout)
            dist = _haversine(victim_lat, victim_lon, z['lat'], z['lon'])
            distance_decay = 1.0 / (1.0 + (dist / 500.0))
            
            noise = random.uniform(0.8, 1.2)
            
            prob = hotspot_weight * method_affinity * amount_fit * distance_decay * noise
            zone_probs.append(prob)
            
        zone_probs = np.array(zone_probs) / sum(zone_probs)
        terminal_zone = np.random.choice(ZONES, p=zone_probs)
        zone_id = terminal_zone['zone_id']
        
        # Reveal only first ceil(n/2) hops
        revealed_hops = math.ceil(n_hops / 2.0)
        
        # The last known txn is an intermediate hop between victim and terminal zone
        # We simulate this by interpolating between victim and terminal, plus noise
        progress = revealed_hops / float(n_hops)
        last_known_lat = victim_lat + (terminal_zone['lat'] - victim_lat) * progress + random.uniform(-0.5, 0.5)
        last_known_lon = victim_lon + (terminal_zone['lon'] - victim_lon) * progress + random.uniform(-0.5, 0.5)
        has_txn = 1

        # Occasionally, no hops are known
        if random.random() < 0.1:
            has_txn = 0
            last_known_lat = victim_lat
            last_known_lon = victim_lon

        row = {}
        
        # Complaint
        row['fraud_amount'] = amount
        row['complaint_hour'] = random.randint(0, 23)
        row['complaint_day_of_week'] = random.randint(0, 6)
        row['time_since_fraud'] = hours_since_last + random.uniform(0.5, 2.0)
        row['fraud_method_encoded'] = method_encoded_map[method]
        row['victim_age_group'] = random.randint(1, 4)
        row['victim_state_encoded'] = random.randint(1, 28)
        row['victim_district_encoded'] = random.randint(1, len(ZONES))
        row['repeat_victim_flag'] = 1 if random.random() < 0.05 else 0
        row['complaint_text_sentiment'] = random.uniform(-1.0, -0.2)
        row['urgency_score'] = random.uniform(0.4, 1.0)
        row['keyword_risk_score'] = random.uniform(0.3, 1.0)
        
        # Transaction Chain
        row['hop_count'] = n_hops
        row['total_chain_amount'] = amount * random.uniform(1.0, 1.2)
        row['chain_duration_minutes'] = row['hop_count'] * random.uniform(5, 30)
        row['amount_split_ratio'] = row['total_chain_amount'] / amount
        row['cross_state_hops'] = cross_state
        row['unique_banks_in_chain'] = random.randint(1, row['hop_count'] + 1)
        row['avg_account_age_days'] = random.uniform(5, 365)
        row['new_account_ratio'] = random.uniform(0.1, 1.0)
        row['round_amount_ratio'] = random.uniform(0.0, 1.0)
        row['nighttime_transfer_ratio'] = random.uniform(0.0, 1.0)
        row['weekend_transfer_flag'] = 1 if random.random() < 0.3 else 0
        row['max_single_hop_amount'] = amount * random.uniform(0.4, 1.0)
        
        # Geographic
        row['victim_lat'] = victim_lat
        row['victim_lon'] = victim_lon
        row['last_known_txn_lat'] = last_known_lat
        row['last_known_txn_lon'] = last_known_lon
        row['distance_from_victim_km'] = _haversine(victim_lat, victim_lon, last_known_lat, last_known_lon)
        # Use intermediate hop logic for atm_density, etc, but we'll approximate based on terminal zone's characteristics masked by intermediate hop
        row['atm_density_radius_5km'] = max(10, int(terminal_zone['atm_density'] * random.uniform(0.5, 1.5)))
        row['has_txn_location'] = has_txn
        row['nearest_state_border_km'] = random.uniform(5, 100)
        row['urban_rural_score'] = min(1.0, max(0.0, terminal_zone['urban_score'] * random.uniform(0.7, 1.3)))
        row['police_station_density'] = random.randint(1, 50)
        
        # Temporal
        row['hours_since_last_transfer'] = hours_since_last
        row['predicted_cashout_window'] = random.uniform(2, 24)
        row['day_of_month'] = random.randint(1, 31)
        row['festival_proximity'] = random.uniform(0.0, 1.0)
        row['time_to_bank_closing'] = random.uniform(0, 8)
        row['velocity_of_transfers'] = row['hop_count'] / max(1, row['chain_duration_minutes'])
        
        row['target_zone_id'] = zone_id
        row['sim_day'] = random.randint(1, 90)
        
        # Keep only the features defined in FEATURE_COLS + target_zone_id in exactly the right order
        final_row = {f: row.get(f, 0.0) for f in FEATURE_COLS}
        final_row['target_zone_id'] = zone_id
        final_row['sim_day'] = row['sim_day']
        data.append(final_row)

    df = pd.DataFrame(data)
    
    # Save output
    base_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(base_dir)
    os.makedirs(parent_dir, exist_ok=True)
    
    csv_path = os.path.join(parent_dir, "training_data.csv")
    df.to_csv(csv_path, index=False)
    print(f"Generated {num_samples} samples and saved to {csv_path}")
    
    json_path = os.path.join(parent_dir, "atm_zones.json")
    with open(json_path, 'w') as f:
        json.dump(ZONES, f, indent=4)
    print(f"Saved ATM zones definitions to {json_path}")

if __name__ == "__main__":
    generate_fraud_data(55000)
