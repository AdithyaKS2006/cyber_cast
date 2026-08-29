import os
import sys
import django
import pandas as pd
from pathlib import Path

# Setup Django environment so we can query the ORM
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "crimecast.settings")
django.setup()

from apps.predictions.models import CashOutPrediction

def fetch_confirmed_outcomes():
    """
    Query the database for all CashOutPredictions that have a confirmed 
    field outcome (INTERCEPTED, MISSED, FALSE_ALARM).
    """
    print("[*] Fetching predictions with confirmed field outcomes...")
    qs = CashOutPrediction.objects.filter(
        outcome__in=['INTERCEPTED', 'MISSED', 'FALSE_ALARM']
    ).select_related('complaint')
    
    records = []
    for p in qs:
        complaint = p.complaint
        if not complaint:
            continue
            
        # If FALSE_ALARM, the true target zone was definitely NOT what we predicted.
        # If MISSED, it means it happened in the predicted zone but we missed the interdiction 
        # (or it happened elsewhere). For this demo script, we assume FALSE_ALARM means 
        # bad label, INTERCEPTED means good label.
        
        # We extract features for retraining
        features = complaint.extracted_features or {}
        
        row = {
            'complaint_number': complaint.complaint_number,
            'predicted_zone': p.predicted_zone_name,
            'probability': p.probability,
            'outcome': p.outcome,
            # Flatten some basic features for the retrain CSV
            'fraud_amount': complaint.fraud_amount,
            'velocity_of_transfers': features.get('velocity_of_transfers', 0),
            'mule_account_density': features.get('mule_account_density', 0),
            'time_to_cashout_hours': features.get('time_to_cashout_hours', 0),
        }
        records.append(row)
        
    return records

def export_retraining_data(records):
    """
    Format and export the records into a CSV that can be appended to 
    the master `fraud_data_clean.csv`.
    """
    if not records:
        print("[!] No confirmed outcomes found in the database. Cannot retrain.")
        return
        
    df = pd.DataFrame(records)
    output_dir = Path(__file__).resolve().parent.parent / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    export_path = output_dir / 'field_verified_outcomes.csv'
    df.to_csv(export_path, index=False)
    print(f"[+] Exported {len(df)} verified field outcomes to {export_path}")
    print("\n[i] RETRAINING LOOP SIMULATION:")
    print("    In a full production environment, this data would now be merged with ")
    print("    'fraud_data_clean.csv', re-balancing the weights to penalize ")
    print("    'FALSE_ALARM' patterns, followed by triggering 'train_ensemble.py'.")
    print("    This closes the feedback loop and automatically calibrates model drift.")

if __name__ == "__main__":
    print("===============================================================")
    print("   CrimeCast - Active Learning / Feedback Loop Simulator       ")
    print("===============================================================")
    records = fetch_confirmed_outcomes()
    export_retraining_data(records)
