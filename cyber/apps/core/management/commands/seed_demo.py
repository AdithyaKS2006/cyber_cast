"""
seed_demo.py — Seeds the CrimeCast database with realistic demo data for SIH 2026.

Creates:
  - 3 demo users (admin, inspector, supervisor)
  - 50 realistic I4C-style fraud complaints from Indian districts
  - Transaction chains (3-7 hops per complaint)
  - Pre-run predictions so demo is instant

Usage:
  python manage.py seed_demo            # Add demo data
  python manage.py seed_demo --flush    # Clear first, then seed
  python manage.py seed_demo --count 30 # Seed 30 complaints
"""

import random
import decimal
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.hashers import make_password


VICTIM_NAMES = [
    "Rajesh Kumar", "Priya Sharma", "Amit Singh", "Sunita Devi", "Mohit Gupta",
    "Anita Yadav", "Vikram Patel", "Kavita Mehta", "Suresh Verma", "Pooja Agarwal",
    "Ramesh Tiwari", "Neha Jain", "Sanjay Mishra", "Ritu Pandey", "Ashok Chauhan",
    "Deepa Nair", "Manoj Shukla", "Geeta Tripathi", "Hari Prasad", "Meena Reddy",
    "Ganesh Raju", "Savita Pillai", "Rakesh Saxena", "Lata Rao", "Vishal Bhatt",
    "Seema Desai", "Kamal Chandra", "Usha Rani", "Devendra Bajaj", "Nalini Bose",
    "Arvind Khanna", "Rekha Iyer", "Naresh Yadav", "Shobha Srivastava", "Dilip Roy",
    "Manju Pathak", "Santosh Choudhary", "Swati Bhatia", "Girish Mahajan", "Nandini Naik",
    "Sunil Kulkarni", "Aruna Sawant", "Pramod Shah", "Alka Trivedi", "Bharat Solanki",
    "Vandana Wagh", "Hemant Deshpande", "Jayashree Joshi", "Vinod Ghosh", "Tanuja Sen",
]

DISTRICTS = [
    ("Meerut", "Uttar Pradesh", "250001"),
    ("Noida", "Uttar Pradesh", "201301"),
    ("Lucknow", "Uttar Pradesh", "226001"),
    ("Varanasi", "Uttar Pradesh", "221001"),
    ("Agra", "Uttar Pradesh", "282001"),
    ("Delhi", "Delhi", "110001"),
    ("South Delhi", "Delhi", "110017"),
    ("Dwarka", "Delhi", "110045"),
    ("Jaipur", "Rajasthan", "302001"),
    ("Jodhpur", "Rajasthan", "342001"),
    ("Kota", "Rajasthan", "324001"),
    ("Gurugram", "Haryana", "122001"),
    ("Faridabad", "Haryana", "121001"),
    ("Chandigarh", "Chandigarh", "160001"),
    ("Mumbai", "Maharashtra", "400001"),
    ("Pune", "Maharashtra", "411001"),
    ("Nashik", "Maharashtra", "422001"),
    ("Aurangabad", "Maharashtra", "431001"),
    ("Bengaluru", "Karnataka", "560001"),
    ("Mysuru", "Karnataka", "570001"),
    ("Hyderabad", "Telangana", "500001"),
    ("Warangal", "Telangana", "506001"),
    ("Chennai", "Tamil Nadu", "600001"),
    ("Coimbatore", "Tamil Nadu", "641001"),
    ("Kolkata", "West Bengal", "700001"),
    ("Howrah", "West Bengal", "711101"),
    ("Ahmedabad", "Gujarat", "380001"),
    ("Surat", "Gujarat", "395001"),
    ("Bhopal", "Madhya Pradesh", "462001"),
    ("Indore", "Madhya Pradesh", "452001"),
    ("Patna", "Bihar", "800001"),
    ("Muzaffarpur", "Bihar", "842001"),
    ("Ranchi", "Jharkhand", "834001"),
    ("Dhanbad", "Jharkhand", "826001"),
    ("Bhubaneswar", "Odisha", "751001"),
    ("Cuttack", "Odisha", "753001"),
    ("Thiruvananthapuram", "Kerala", "695001"),
    ("Kochi", "Kerala", "682001"),
    ("Guwahati", "Assam", "781001"),
    ("Shimla", "Himachal Pradesh", "171001"),
]

BANKS = [
    "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank",
    "Punjab National Bank", "Bank of Baroda", "Canara Bank", "Kotak Mahindra Bank",
    "Yes Bank", "IDBI Bank", "Union Bank", "IndusInd Bank",
    "Airtel Payments Bank", "Paytm Payments Bank", "Jio Payments Bank",
]

FRAUD_METHODS = ["UPI", "CARD", "NET_BANKING", "PHONE_CALL", "EMAIL_PHISHING"]

FRAUD_NARRATIVES = [
    "Victim received a call from a person claiming to be from {bank} KYC department. They asked for OTP and ₹{amount} was debited from account.",
    "Victim clicked on a phishing link shared on WhatsApp claiming to be from NSDL. Credentials were stolen and ₹{amount} transferred.",
    "An unknown person posed as a police officer and threatened victim with arrest. Victim transferred ₹{amount} to avoid legal action.",
    "Victim received SMS asking to update UPI PIN. After following the link, ₹{amount} was debited without authorization.",
    "Victim was defrauded through a fake investment scheme promising 30% monthly returns. ₹{amount} invested was never returned.",
    "Victim's debit card was skimmed at an ATM in a busy market. ₹{amount} was withdrawn from multiple ATMs within 30 minutes.",
    "Victim received a call claiming their SIM was being blocked. During the call, ₹{amount} was transferred via net banking.",
    "Victim was contacted through Facebook Marketplace. After transferring ₹{amount} for goods, seller disappeared.",
    "Victim received a lottery winning notification via email. To claim prize, ₹{amount} was paid as 'processing fee'.",
    "Victim's Google Pay was hacked after responding to a 'receive money' request link. ₹{amount} was debited in 3 transactions.",
]

class Command(BaseCommand):
    help = 'Seeds the CrimeCast database with demo data for SIH 2026 presentation'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true', help='Delete all existing demo data first')
        parser.add_argument('--count', type=int, default=50, help='Number of complaints to create')
        parser.add_argument('--no-predictions', action='store_true', help='Skip pre-generating predictions')

    def handle(self, *args, **options):
        from apps.users.models import User, Organization
        from apps.complaints.models import Complaint, TransactionHop

        if options['flush']:
            self.stdout.write('Flushing demo data...')
            TransactionHop.objects.all().delete()
            Complaint.objects.all().delete()
            User.objects.filter(username__in=['admin', 'inspector', 'supervisor']).delete()
            self.stdout.write(self.style.WARNING('  Cleared all complaints, hops, and demo users.'))

        # ── Create Users ────────────────────────────────────────────────
        org, _ = Organization.objects.get_or_create(
            name='I4C Demo Police Station'
        )

        users_data = [
            ('admin_demo', 'admin@cybersandbox.io', 'administrator', 'DemoSecure2026!', 'Admin', 'User'),
            ('admin', 'admin@crimecast.io', 'administrator', 'demo1234', 'Admin', 'User'),
            ('inspector', 'inspector@crimecast.io', 'analyst', 'demo1234', 'Inspector', 'Rao'),
            ('supervisor', 'supervisor@crimecast.io', 'validator', 'demo1234', 'Supervisor', 'Verma'),
        ]

        created_users = {}
        for username, email, role, password, first, last in users_data:
            user = User.objects.filter(username=username).first()
            if not user:
                user = User.objects.filter(email=email).first()
            if not user:
                user = User(username=username, email=email)
            user.username = username
            user.email = email
            user.role = role
            user.first_name = first
            user.last_name = last
            user.organization = org
            user.is_active = True
            user.set_password(password)
            user.save()
            created_users[username] = user
            self.stdout.write(f'  User {username} ({role}): ready  — password: {password}')

        inspector = created_users['inspector']

        # ── Create Complaints ─────────────────────────────────────────────
        n = options['count']
        self.stdout.write(f'\nSeeding {n} complaints...')

        rng = random.Random(2026)  # deterministic seed
        now = timezone.now()

        complaints_created = 0
        for i in range(n):
            victim = VICTIM_NAMES[i % len(VICTIM_NAMES)]
            district, state, pincode = DISTRICTS[i % len(DISTRICTS)]
            method = rng.choice(FRAUD_METHODS)
            bank = rng.choice(BANKS)
            amount = rng.choice([
                rng.randint(5000, 50000),
                rng.randint(50000, 200000),
                rng.randint(200000, 500000),
            ])
            fraud_dt = now - timedelta(hours=rng.randint(2, 72))
            narrative = rng.choice(FRAUD_NARRATIVES).format(
                bank=bank, amount=f'{amount:,}'
            )
            priority = 'CRITICAL' if amount > 200000 else ('HIGH' if amount > 80000 else 'MEDIUM')

            try:
                complaint = Complaint.objects.create(
                    victim_name=victim,
                    victim_phone=f'9{rng.randint(100000000, 999999999)}',
                    victim_email=f'{victim.lower().replace(" ", ".")}@gmail.com',
                    victim_district=district,
                    victim_state=state,
                    victim_pincode=pincode,
                    fraud_amount=decimal.Decimal(str(amount)),
                    fraud_method=method,
                    fraud_timestamp=fraud_dt,
                    suspect_account=f'{rng.randint(10000000, 99999999)}',
                    suspect_bank=bank,
                    suspect_phone=f'9{rng.randint(100000000, 999999999)}',
                    narrative_text=narrative,
                    status='UNDER_ANALYSIS',
                    priority=priority,
                    assigned_officer=inspector,
                    organization=org,
                )
                complaints_created += 1
            except Exception as e:
                # If field doesn't exist try without it
                try:
                    complaint = Complaint.objects.create(
                        victim_name=victim,
                        victim_phone=f'9{rng.randint(100000000, 999999999)}',
                        victim_email=f'{victim.lower().replace(" ", ".")}@gmail.com',
                        victim_district=district,
                        victim_state=state,
                        victim_pincode=pincode,
                        fraud_amount=decimal.Decimal(str(amount)),
                        fraud_method=method,
                        fraud_timestamp=fraud_dt,
                        narrative_text=narrative,
                        status='UNDER_ANALYSIS',
                        priority=priority,
                        assigned_officer=inspector,
                        organization=org,
                    )
                    complaints_created += 1
                except Exception as e2:
                    self.stdout.write(self.style.ERROR(f'  Failed complaint {i}: {e2}'))
                    continue

            # ── Transaction Hops ─────────────────────────────────────
            num_hops = rng.randint(3, 7)
            hop_time = fraud_dt
            prev_account = f'{rng.randint(10000000, 99999999)}'
            prev_bank = bank
            remaining = amount

            for h in range(1, num_hops + 1):
                hop_time += timedelta(minutes=rng.randint(5, 90))
                next_bank = rng.choice(BANKS)
                next_account = f'{rng.randint(10000000, 99999999)}'
                hop_amount = remaining if h == num_hops else rng.randint(int(remaining * 0.3), int(remaining * 0.7))
                remaining -= hop_amount if h < num_hops else 0

                try:
                    TransactionHop.objects.create(
                        complaint=complaint,
                        from_account=prev_account,
                        from_bank=prev_bank,
                        to_account=next_account,
                        to_bank=next_bank,
                        amount=decimal.Decimal(str(max(hop_amount, 100))),
                        timestamp=hop_time,
                        hop_number=h,
                        is_mule_flagged=(h > 2 and rng.random() > 0.6),
                    )
                except Exception as e:
                    pass

                prev_account = next_account
                prev_bank = next_bank

        self.stdout.write(self.style.SUCCESS(f'\n  ✓ Created {complaints_created}/{n} complaints with transaction chains'))

        # ── Run predictions for first 10 (demo focus) ──────────────────
        if not options['no_predictions']:
            self.stdout.write('\nPre-generating predictions for first 10 complaints...')
            first_10 = Complaint.objects.order_by('-created_at')[:10]
            predicted = 0
            for c in first_10:
                try:
                    from apps.predictions.tasks import run_prediction_pipeline
                    run_prediction_pipeline(c)
                    c.status = 'PREDICTION_ACTIVE'
                    c.save(update_fields=['status'])
                    predicted += 1
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  Prediction failed for {c.complaint_number}: {e}'))
            self.stdout.write(self.style.SUCCESS(f'  ✓ {predicted} predictions generated'))
            
            # Setup HITL and Dispatched items
            try:
                from apps.predictions.models import CashOutPrediction
                from apps.predictions.dispatch import dispatch_intelligence
                preds = CashOutPrediction.objects.order_by('-created_at')
                if preds.exists():
                    # Set one to NEEDS_REVIEW (if not already)
                    p1 = preds[0]
                    p1.outcome = 'NEEDS_REVIEW'
                    p1.probability = 0.55
                    p1.save()

                    # Set one to dispatched
                    if preds.count() > 1:
                        p2 = preds[1]
                        p2.outcome = 'READY'
                        p2.probability = 0.95
                        p2.save()
                        # run dispatch
                        dispatch_intelligence(p2, inspector)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  Failed to setup HITL/Dispatch: {e}'))

        # ── Summary ────────────────────────────────────────────────────
        self.stdout.write('\n' + '='*55)
        self.stdout.write(self.style.SUCCESS('  DEMO SEED COMPLETE'))
        self.stdout.write('='*55)
        self.stdout.write(f'  Complaints : {Complaint.objects.count()}')
        self.stdout.write(f'  Users      : admin / inspector / supervisor')
        self.stdout.write(f'  Passwords  : Admin123! / Inspector123! / Supervisor123!')
        self.stdout.write('='*55)
