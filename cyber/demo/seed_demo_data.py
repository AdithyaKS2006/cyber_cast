#!/usr/bin/env python3
"""
CrimeCast v3.0 - Demo Seed Data Generator
=========================================
Generates realistic, high-impact demo data for SIH 2026 jury presentations:
1. "Operation Garuda Intercept" - ₹5,00,000 CBI Digital Arrest scam
2. Multi-hop Mule Trail (5 hops with 22-min cash-out countdown)
3. ISO 20022 camt.056 XML interdiction alert
4. BNSS 2023 Sec 106 Freezing Directive with SHA-256 evidence fingerprint
5. Cross-complaint Mule Network Syndicate (triggers CONFIRMED_MULE clustering)
"""

import os
import sys
from decimal import Decimal
from datetime import timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crimecast.settings')

import django
django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.complaints.models import Complaint, TransactionHop
from apps.predictions.models import CashOutPrediction, IntelligencePackage, BankAlert, ATMAlert, LEADispatch
from apps.predictions.dispatch import generate_camt056_xml
from apps.freeze.models import FreezeRequest
from apps.freeze.notice_generator import generate_bnss_106_notice_pdf
from apps.graph.engine import MuleGraphEngine
from apps.graph.analyzer import MuleNetworkAnalyzer

User = get_user_model()


def seed_demo():
    print("=" * 70)
    print("  CRIMECAST v3.0 - DEMO SEED GENERATOR (SIH 2026 SHOWCASE)")
    print("=" * 70)

    now = timezone.now()

    # 1. Ensure Demo Users Exist
    admin_user, _ = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@cybercast.gov.in',
            'is_staff': True,
            'is_superuser': True,
            'role': 'admin',
            'first_name': 'Command',
            'last_name': 'Director'
        }
    )
    admin_user.set_password('admin123')
    admin_user.save()

    analyst_user, _ = User.objects.get_or_create(
        username='analyst',
        defaults={
            'email': 'analyst@cybercast.gov.in',
            'role': 'analyst',
            'first_name': 'Vikram',
            'last_name': 'Rathore'
        }
    )
    analyst_user.set_password('analyst123')
    analyst_user.save()
    print("✓ Demo credentials ready (admin / admin123, analyst / analyst123)")

    # 2. Case 1: Primary Showcase - "Operation Garuda Intercept"
    complaint_1, _ = Complaint.objects.update_or_create(
        complaint_number='NCRP-2026-BLR-09821',
        defaults={
            'victim_name': 'Dr. Arvind Swaminathan',
            'victim_phone': '9845012345',
            'victim_email': 'arvind.swaminathan@iisc.ac.in',
            'victim_district': 'Bengaluru Urban',
            'victim_state': 'Karnataka',
            'victim_pincode': '560012',
            'fraud_amount': Decimal('500000.00'),
            'fraud_method': 'PHONE_CALL',
            'fraud_timestamp': now - timedelta(minutes=18),
            'suspect_account_number': '50100492819201',
            'suspect_bank': 'HDFC Bank',
            'suspect_phone': '+91 99887 76655',
            'narrative_text': (
                "Victim received video call on WhatsApp from perpetrators impersonating CBI Officers & "
                "Mumbai Police Cyber Cell. Perpetrators displayed forged warrants claiming victim's Aadhaar "
                "was linked to a narcotics shipment in Mumbai. Under severe coercion (Digital Arrest for 6 hours), "
                "victim transferred ₹5,00,000 to purported 'RBI Escrow Verification Account'."
            ),
            'status': 'PREDICTION_ACTIVE',
            'priority': 'CRITICAL'
        }
    )
    print(f"✓ Case 1 seeded: {complaint_1.complaint_number} (₹5,00,000 Digital Arrest)")

    # 3. Transaction Hops for Case 1 (5 Hops across Mule Layers)
    TransactionHop.objects.filter(complaint=complaint_1).delete()

    # Hop 1: Victim -> Mule Layer 1 (Dinesh Kumar)
    h1 = TransactionHop.objects.create(
        complaint=complaint_1,
        hop_number=1,
        from_account='30894129841',
        from_bank='State Bank of India',
        from_ifsc='SBIN0001234',
        to_account='50100492819201',
        to_bank='HDFC Bank',
        to_ifsc='HDFC0001234',
        amount=Decimal('500000.00'),
        timestamp=now - timedelta(minutes=16),
        is_mule_flagged=True,
        latitude=12.9716,
        longitude=77.5946
    )

    # Hop 2: Mule Layer 1 -> Layer 2 (Nexus Trading Services)
    h2 = TransactionHop.objects.create(
        complaint=complaint_1,
        hop_number=2,
        from_account='50100492819201',
        from_bank='HDFC Bank',
        from_ifsc='HDFC0001234',
        to_account='002101928471',
        to_bank='ICICI Bank',
        to_ifsc='ICIC0000021',
        amount=Decimal('280000.00'),
        timestamp=now - timedelta(minutes=12),
        is_mule_flagged=True,
        latitude=19.0760,
        longitude=72.8777
    )

    # Hop 3: Mule Layer 1 -> Layer 2 Split (Suresh V)
    h3 = TransactionHop.objects.create(
        complaint=complaint_1,
        hop_number=3,
        from_account='50100492819201',
        from_bank='HDFC Bank',
        from_ifsc='HDFC0001234',
        to_account='921020019284918',
        to_bank='Axis Bank',
        to_ifsc='UTIB0000921',
        amount=Decimal('210000.00'),
        timestamp=now - timedelta(minutes=10),
        is_mule_flagged=True,
        latitude=17.3850,
        longitude=78.4867
    )

    # Hop 4: Layer 2 -> Layer 3 Aggregator (Rapid Pay Tech Hub)
    h4 = TransactionHop.objects.create(
        complaint=complaint_1,
        hop_number=4,
        from_account='002101928471',
        from_bank='ICICI Bank',
        from_ifsc='ICIC0000021',
        to_account='4810294812',
        to_bank='Kotak Mahindra Bank',
        to_ifsc='KKBK0004810',
        amount=Decimal('270000.00'),
        timestamp=now - timedelta(minutes=6),
        is_mule_flagged=True,
        latitude=28.6139,
        longitude=77.2090
    )

    # Hop 5: Layer 3 -> Cashout Point (Karol Bagh ATM cluster)
    h5 = TransactionHop.objects.create(
        complaint=complaint_1,
        hop_number=5,
        from_account='4810294812',
        from_bank='Kotak Mahindra Bank',
        from_ifsc='KKBK0004810',
        to_account='ATM-KB-DELHI-09',
        to_bank='National Financial Switch (NFS)',
        to_ifsc='NFS0000001',
        amount=Decimal('265000.00'),
        timestamp=now - timedelta(minutes=2),
        is_mule_flagged=True,
        latitude=28.6517,
        longitude=77.1906
    )
    print("✓ 5-Hop Transaction Trail created with geographic coordinates and mule flags")

    # 4. CashOut Prediction & AI Model Inference
    pred, _ = CashOutPrediction.objects.update_or_create(
        complaint=complaint_1,
        rank=1,
        defaults={
            'predicted_zone_name': 'Karol Bagh Financial District, New Delhi',
            'predicted_lat': 28.6517,
            'predicted_lon': 77.1906,
            'probability': 0.968,
            'eta_hours': 0.36,  # ~22 minutes
            'model_version': 'v3.0-XGBoost+GNN-Ensemble',
            'feature_importance_json': {
                'velocity_z_score': 0.34,
                'hop_geodesic_dispersion': 0.28,
                'mule_node_betweenness': 0.22,
                'weekend_evening_multiplier': 0.16
            },
            'outcome': 'DISPATCHED',
            'gemini_brief': (
                "High-velocity syndicate withdrawal active. Predicted cashout destination: Karol Bagh ATM cluster "
                "(Delhi Police Central District). Critical interdiction window: 22 minutes. Recommended Action: "
                "Execute BNSS 2023 Sec 106 automated account freeze on primary receiver 50100492819201 (HDFC) and "
                "dispatch ISO 20022 camt.056 interdiction alert to Kotak Mahindra aggregator."
            )
        }
    )
    print(f"✓ AI Prediction generated: {pred.predicted_zone_name} (ETA: 22 mins, Confidence: 96.8%)")

    # 5. Intelligence Package & ISO 20022 camt.056 Dispatches
    package, _ = IntelligencePackage.objects.update_or_create(
        prediction=pred,
        complaint=complaint_1,
        defaults={'status': 'DISPATCHED'}
    )

    alert_hdfc, _ = BankAlert.objects.update_or_create(
        package=package,
        target_institution='HDFC Bank',
        defaults={'status': 'DELIVERED'}
    )
    camt_xml = generate_camt056_xml(alert_hdfc)
    alert_hdfc.iso20022_payload = camt_xml
    alert_hdfc.save(update_fields=['iso20022_payload', 'status'])

    alert_kotak, _ = BankAlert.objects.update_or_create(
        package=package,
        target_institution='Kotak Mahindra Bank',
        defaults={'status': 'DELIVERED'}
    )
    alert_kotak.iso20022_payload = generate_camt056_xml(alert_kotak)
    alert_kotak.save(update_fields=['iso20022_payload', 'status'])

    ATMAlert.objects.update_or_create(
        package=package,
        target_network='NFS Karol Bagh ATM Hub',
        defaults={'status': 'DELIVERED'}
    )

    LEADispatch.objects.update_or_create(
        package=package,
        target_district='Central District, Delhi Police',
        defaults={'status': 'ACKNOWLEDGED'}
    )
    print("✓ ISO 20022 camt.056.001.08 XML interdiction alerts generated and dispatched")

    # 6. Freeze Request & Sec 106 Notice
    freeze_req, _ = FreezeRequest.objects.update_or_create(
        complaint=complaint_1,
        target_account='50100492819201',
        defaults={
            'target_bank_ifsc': 'HDFC0001234',
            'target_bank_name': 'HDFC Bank Ltd',
            'freeze_amount': Decimal('500000.00'),
            'status': 'FROZEN',
            'cash_out_eta_minutes': 22,
            'i4c_freeze_id': 'I4C-FRZ-2026-09821-01',
            'window_expires_at': now + timedelta(minutes=22)
        }
    )
    pdf_bytes = generate_bnss_106_notice_pdf(freeze_req)
    print(f"✓ Court-Ready Sec 106 Freezing Notice PDF generated ({len(pdf_bytes)} bytes, SHA-256 protected)")

    # 7. Case 2: Cross-Complaint Linkage (The Mule Syndicate)
    complaint_2, _ = Complaint.objects.update_or_create(
        complaint_number='NCRP-2026-MUM-04192',
        defaults={
            'victim_name': 'Mrs. Sunita Rao',
            'victim_phone': '9820019284',
            'victim_email': 'sunita.rao@gmail.com',
            'victim_district': 'Mumbai Suburban',
            'victim_state': 'Maharashtra',
            'victim_pincode': '400050',
            'fraud_amount': Decimal('180000.00'),
            'fraud_method': 'UPI',
            'fraud_timestamp': now - timedelta(hours=3),
            'suspect_account_number': '50100492819201',  # SAME MULE ACCOUNT!
            'suspect_bank': 'HDFC Bank',
            'suspect_phone': '+91 99887 76655',
            'narrative_text': (
                "Victim joined fake Telegram stock trading group 'Golden Crest Wealth Management'. "
                "Tricked into transferring ₹1,80,000 for VIP IPO allocation."
            ),
            'status': 'UNDER_ANALYSIS',
            'priority': 'HIGH'
        }
    )

    TransactionHop.objects.filter(complaint=complaint_2).delete()
    TransactionHop.objects.create(
        complaint=complaint_2,
        hop_number=1,
        from_account='60920192841',
        from_bank='Bank of Baroda',
        from_ifsc='BARB000001',
        to_account='50100492819201',  # Same Mule Alpha Account!
        to_bank='HDFC Bank',
        to_ifsc='HDFC0001234',
        amount=Decimal('180000.00'),
        timestamp=now - timedelta(hours=2, minutes=50),
        is_mule_flagged=True,
        latitude=19.0760,
        longitude=72.8777
    )
    print(f"✓ Case 2 seeded: {complaint_2.complaint_number} (₹1,80,000 Telegram Scam)")
    print("✓ CROSS-COMPLAINT LINKAGE: Account 50100492819201 now linked to 2 complaints!")

    # 8. Seed Graph Engine Nodes & Edges
    graph_engine = MuleGraphEngine()
    for h in [h1, h2, h3, h4]:
        graph_engine.add_edge(
            from_account=h.from_account,
            from_ifsc=h.from_ifsc or 'SBIN0001',
            to_account=h.to_account,
            to_ifsc=h.to_ifsc or 'HDFC0001',
            amount=h.amount,
            transaction_ref=f"UTR-{complaint_1.complaint_number}-{h.hop_number}",
            hop_number=h.hop_number
        )

    # Run Analyzer to confirm detection
    analyzer = MuleNetworkAnalyzer()
    confirmed = analyzer.detect_confirmed_mules(threshold=2)
    print(f"✓ MuleNetworkAnalyzer verified: Detected {len(confirmed)} CONFIRMED MULE(s) in cross-case syndicate!")
    for cm in confirmed[:5]:
        print(f"   -> Mule Hash: {cm['account_hash'][:12]}... ({cm['bank_name']}) | Linked Complaints: {cm['complaint_count']} | Volume: ₹{cm['total_volume']:,.2f}")

    print("=" * 70)
    print("  DEMO SEED COMPLETED SUCCESSFULLY!")
    print("  Showcase pages:")
    print("  1. Live Voice Intake:      /app/complaints/new")
    print("  2. Golden Window Countdown: /app/complaints/")
    print("  3. ISO 20022 / I4C Feed:   /app/predictions/")
    print("  4. Freeze Ops & Sec 106:   /app/freeze/queue/")
    print("  5. Mule Network Canvas:    /app/intelligence/mule-network")
    print("=" * 70)


if __name__ == '__main__':
    seed_demo()
