"""
Management command: seed_crimecast_demo
Usage: python manage.py seed_crimecast_demo [--flush]
"""
import random
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.hashers import make_password


# ── Real-world NCRP-inspired complaint narratives ──────────────────────────
NARRATIVES = [
    "Victim received a WhatsApp message claiming KYC expiry on SBI account. After clicking the link and entering OTP, ₹{amt} was debited via UPI in 3 transactions.",
    "Caller posed as TRAI officer, threatened mobile number disconnection. Victim transferred ₹{amt} via PhonePe to 'verification wallet'. Caller disconnected immediately.",
    "Victim received fake Amazon refund call. Remote access granted via AnyDesk. ₹{amt} transferred from HDFC account without consent.",
    "Matrimonial site scam — victim sent ₹{amt} to 'NRI groom' asking for customs clearance of gifts. Profile deleted after payment.",
    "Fake loan app (FlashLoan Pro) approved ₹50,000 loan, then demanded ₹{amt} processing fee. Money taken, loan never disbursed.",
    "OLX vehicle seller scam. Buyer sent fake Army payment screenshot. Victim transferred ₹{amt} as advance. Buyer unreachable after.",
    "Investment scam via Telegram group 'Stock Market Gurus'. Victim invested ₹{amt}, platform showed 40% profit, then froze withdrawals.",
    "Fake electricity disconnection call. Victim asked to install 'BESCOM app' (remote access). ₹{amt} debited within minutes.",
    "Phishing email mimicking IRCTC refund portal. Victim entered card details. ₹{amt} charged in international transaction.",
    "Courier scam — FedEx parcel intercepted by 'cybercrime branch'. Victim paid ₹{amt} as bail to avoid 'narcotics case'.",
    "Victim clicked Google ad for credit card closure helpline. Called fake bank number. Card OTP shared, ₹{amt} withdrawn.",
    "Aadhaar-linked SIM swap attack. New SIM issued to fraudster. All UPI apps linked to new number. ₹{amt} drained overnight.",
    "Victim hired domestic worker via fake placement agency. Paid ₹{amt} registration fee. Worker never sent, phone switched off.",
    "Part-time job scam via Instagram. Victim paid ₹{amt} for 'task activation'. Promised returns never received.",
    "Fake income tax refund SMS with link. Victim entered net banking credentials. ₹{amt} transferred to unknown account.",
]

BANKS = ['SBI','HDFC Bank','ICICI Bank','Axis Bank','PNB','Kotak Mahindra','Bank of Baroda','Canara Bank','UCO Bank','Yes Bank']
STATES_DISTRICTS = [
    ('Uttar Pradesh','Lucknow'),('Uttar Pradesh','Agra'),('Uttar Pradesh','Meerut'),
    ('Maharashtra','Mumbai'),('Maharashtra','Pune'),('Maharashtra','Nagpur'),
    ('Delhi','New Delhi'),('Delhi','Dwarka'),
    ('Rajasthan','Jaipur'),('Rajasthan','Jodhpur'),
    ('Karnataka','Bengaluru'),('Karnataka','Mysuru'),
    ('Haryana','Gurugram'),('Haryana','Faridabad'),
    ('Bihar','Patna'),('Bihar','Gaya'),
    ('Gujarat','Ahmedabad'),('Gujarat','Surat'),
    ('Tamil Nadu','Chennai'),('Tamil Nadu','Coimbatore'),
    ('West Bengal','Kolkata'),('West Bengal','Howrah'),
    ('Madhya Pradesh','Bhopal'),('Madhya Pradesh','Indore'),
    ('Telangana','Hyderabad'),('Telangana','Warangal'),
]
FRAUD_METHODS = ['UPI','CARD','NET_BANKING','PHONE_CALL','EMAIL_PHISHING','OTHER']
METHOD_WEIGHTS = [0.45, 0.15, 0.10, 0.25, 0.03, 0.02]

VICTIMS = [
    ('Ramesh Kumar Sharma','9876543210','ramesh.sharma@gmail.com'),
    ('Priya Agarwal','9812345678','priya.agarwal@yahoo.com'),
    ('Mohd. Aamir Khan','9898989898','aamir.khan@hotmail.com'),
    ('Sunita Devi','9765432109','sunita.devi@gmail.com'),
    ('Vikram Singh Rathore','9754321098','vikram.rathore@gmail.com'),
    ('Kavitha Nair','9743210987','kavitha.nair@gmail.com'),
    ('Suresh Babu','9732109876','suresh.babu@yahoo.com'),
    ('Anita Kumari','9721098765','anita.kumari@gmail.com'),
    ('Rajendra Prasad','9710987654','rajendra.prasad@gmail.com'),
    ('Deepa Verma','9709876543','deepa.verma@gmail.com'),
    ('Amit Jain','9698765432','amit.jain@gmail.com'),
    ('Shalini Gupta','9687654321','shalini.gupta@gmail.com'),
    ('Harish Chandra','9676543210','harish.chandra@gmail.com'),
    ('Meena Patel','9665432109','meena.patel@yahoo.com'),
    ('Abdul Rehman','9654321098','abdul.rehman@gmail.com'),
    ('Jyoti Sharma','9643210987','jyoti.sharma@gmail.com'),
    ('Naresh Kumar','9632109876','naresh.kumar@gmail.com'),
    ('Rekha Singh','9621098765','rekha.singh@gmail.com'),
    ('Santosh Yadav','9610987654','santosh.yadav@gmail.com'),
    ('Lalita Devi','9609876543','lalita.devi@gmail.com'),
    ('Pankaj Mishra','9598765432','pankaj.mishra@gmail.com'),
    ('Geeta Rani','9587654321','geeta.rani@gmail.com'),
    ('Dinesh Tiwari','9576543210','dinesh.tiwari@gmail.com'),
    ('Sarita Chauhan','9565432109','sarita.chauhan@gmail.com'),
    ('Rohit Agarwal','9554321098','rohit.agarwal@gmail.com'),
]

ATM_ZONES = [
    ('Delhi Connaught Place',    28.6304, 77.2177),
    ('Gurugram Cyber Hub',       28.4950, 77.0888),
    ('Noida Sector 18',          28.5708, 77.3271),
    ('Meerut District Cluster',  28.9845, 77.7064),
    ('Lucknow Gomti Nagar',      26.8488, 80.9859),
    ('Mumbai BKC',               19.0656, 72.8656),
    ('Jaipur Malviya Nagar',     26.8530, 75.8047),
    ('Patna Boring Road',        25.6133, 85.1220),
    ('Bengaluru Indiranagar',    12.9784, 77.6408),
    ('Chennai T. Nagar',         13.0418, 80.2341),
]

STATUSES_DIST = [
    ('NEW',0.20),('UNDER_ANALYSIS',0.25),('PREDICTION_ACTIVE',0.20),
    ('INTERCEPTED',0.15),('CLOSED',0.15),('FALSE_ALARM',0.05),
]
PRIORITIES = [('LOW',0.15),('MEDIUM',0.45),('HIGH',0.30),('CRITICAL',0.10)]


def wchoice(choices):
    opts, wts = zip(*choices)
    return random.choices(opts, weights=wts, k=1)[0]


def rand_account():
    return ''.join([str(random.randint(0,9)) for _ in range(12)])


def rand_ifsc(bank):
    prefix = {'SBI':'SBIN','HDFC Bank':'HDFC','ICICI Bank':'ICIC','Axis Bank':'UTIB',
               'PNB':'PUNB','Kotak Mahindra':'KKBK','Bank of Baroda':'BARB',
               'Canara Bank':'CNRB','UCO Bank':'UCBA','Yes Bank':'YESB'}.get(bank,'SBIN')
    return f"{prefix}0{random.randint(100000,999999)}"


class Command(BaseCommand):
    help = 'Seed CrimeCast with realistic demo data'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true', help='Delete existing demo data first')

    def handle(self, *args, **options):
        from apps.users.models import User, Organization
        from apps.complaints.models import Complaint, TransactionHop
        from apps.predictions.models import CashOutPrediction, PredictionAlert

        self.stdout.write(self.style.MIGRATE_HEADING('\n🔷  CrimeCast Demo Seeder\n'))

        if options['flush']:
            self.stdout.write('  Flushing existing data...')
            PredictionAlert.objects.all().delete()
            CashOutPrediction.objects.all().delete()
            TransactionHop.objects.all().delete()
            Complaint.objects.all().delete()
            User.objects.filter(username__in=['inspector_singh','dsp_sharma','admin_crimecast']).delete()
            Organization.objects.filter(name='CrimeCast Demo Unit').delete()

        # ── 1. Organization ───────────────────────────────────────────
        org, _ = Organization.objects.get_or_create(name='CrimeCast Demo Unit')
        self.stdout.write(self.style.SUCCESS(f'  ✓ Organisation: {org.name}'))

        # ── 2. Users ──────────────────────────────────────────────────
        users_spec = [
            dict(username='inspector_singh', first_name='Rajveer', last_name='Singh',
                 email='inspector.singh@crimecast.gov.in', role='analyst',
                 rank='Inspector', avatar_initials='RS'),
            dict(username='dsp_sharma', first_name='Alok', last_name='Sharma',
                 email='dsp.sharma@crimecast.gov.in', role='validator',
                 rank='DSP', avatar_initials='AS'),
            dict(username='admin_crimecast', first_name='Admin', last_name='CrimeCast',
                 email='admin@crimecast.gov.in', role='administrator',
                 rank='Commissioner', avatar_initials='AC', is_staff=True),
        ]
        created_users = []
        for spec in users_spec:
            u, created = User.objects.get_or_create(
                username=spec['username'],
                defaults={**spec, 'password': make_password('CrimeCast@2026'),
                          'organization': org, 'reputation_score': 800, 'xp_points': 2500}
            )
            created_users.append(u)
            tag = 'created' if created else 'exists'
            self.stdout.write(self.style.SUCCESS(f'  ✓ User {u.username} ({tag})'))

        officer = created_users[0]

        # ── 3. 50 historical complaints (last 30 days) ─────────────────
        self.stdout.write('\n  Creating 50 historical complaints...')
        now = timezone.now()
        hist_complaints = []

        victims_pool = VICTIMS * 3  # cycle through victims

        for i in range(50):
            victim = victims_pool[i % len(victims_pool)]
            state, district = random.choice(STATES_DISTRICTS)
            method = wchoice(list(zip(FRAUD_METHODS, METHOD_WEIGHTS)))
            amount = Decimal(str(round(random.lognormvariate(11.9, 1.1), 2)))
            amount = min(max(amount, Decimal('5000')), Decimal('5000000'))
            days_ago = random.randint(1, 30)
            fraud_dt = now - timedelta(days=days_ago, hours=random.randint(0,23))
            status = wchoice(STATUSES_DIST)
            priority = wchoice(PRIORITIES)
            narrative = random.choice(NARRATIVES).format(amt=f'₹{int(amount):,}')

            c = Complaint.objects.create(
                victim_name=victim[0],
                victim_phone=victim[1],
                victim_email=victim[2],
                victim_district=district,
                victim_state=state,
                victim_pincode=str(random.randint(110001, 799999)),
                fraud_amount=amount,
                fraud_method=method,
                fraud_timestamp=fraud_dt,
                suspect_bank=random.choice(BANKS),
                suspect_account_number=rand_account(),
                narrative_text=narrative,
                status=status,
                priority=priority,
                assigned_officer=officer,
                organization=org,
            )
            hist_complaints.append(c)

        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(hist_complaints)} historical complaints'))

        # ── 4. 5 live complaints with transaction chains ───────────────
        self.stdout.write('\n  Creating 5 live complaints with transaction chains...')
        live_specs = [
            dict(victim_name='Ramesh Kumar Sharma', victim_phone='9876543210',
                 victim_email='ramesh.sharma@gmail.com',
                 victim_district='Noida', victim_state='Uttar Pradesh', victim_pincode='201301',
                 fraud_amount=Decimal('485000'), fraud_method='UPI', priority='CRITICAL',
                 suspect_bank='Paytm Payments Bank',
                 narrative='Victim received WhatsApp message claiming SBI KYC expiry. After sharing OTP, ₹4,85,000 debited in 4 UPI transactions within 12 minutes. Victim identified 3 mule accounts through UPI IDs.',
                 hops=3),
            dict(victim_name='Priya Agarwal', victim_phone='9812345678',
                 victim_email='priya.agarwal@yahoo.com',
                 victim_district='Gurugram', victim_state='Haryana', victim_pincode='122001',
                 fraud_amount=Decimal('320000'), fraud_method='PHONE_CALL', priority='HIGH',
                 suspect_bank='HDFC Bank',
                 narrative='Caller posed as TRAI officer threatening mobile disconnection. Victim transferred ₹3,20,000 via IMPS to 3 different accounts. Call recordings available with cyber cell.',
                 hops=2),
            dict(victim_name='Mohd. Aamir Khan', victim_phone='9898989898',
                 victim_email='aamir.khan@hotmail.com',
                 victim_district='Lucknow', victim_state='Uttar Pradesh', victim_pincode='226001',
                 fraud_amount=Decimal('175000'), fraud_method='NET_BANKING', priority='HIGH',
                 suspect_bank='ICICI Bank',
                 narrative='Fake Amazon refund call. AnyDesk remote access granted. ₹1,75,000 transferred from HDFC net banking in 2 NEFT transactions to accounts in Rajasthan.',
                 hops=2),
            dict(victim_name='Sunita Devi', victim_phone='9765432109',
                 victim_email='sunita.devi@gmail.com',
                 victim_district='Jaipur', victim_state='Rajasthan', victim_pincode='302001',
                 fraud_amount=Decimal('95000'), fraud_method='UPI', priority='MEDIUM',
                 suspect_bank='SBI',
                 narrative='Investment scam via Telegram group promising 40% monthly returns. ₹95,000 transferred in 5 UPI payments to Paytm wallet later traced to Bihar mule network.',
                 hops=1),
            dict(victim_name='Vikram Singh Rathore', victim_phone='9754321098',
                 victim_email='vikram.rathore@gmail.com',
                 victim_district='Mumbai', victim_state='Maharashtra', victim_pincode='400001',
                 fraud_amount=Decimal('250000'), fraud_method='CARD', priority='CRITICAL',
                 suspect_bank='Axis Bank',
                 narrative='Phishing link mimicking IRCTC refund portal. Victim entered card details and OTP. ₹2,50,000 charged in 3 international card transactions, subsequently fund-mule routed to Delhi ATM cluster.',
                 hops=4),
        ]

        live_complaints = []
        for spec in live_specs:
            hops = spec.pop('hops')
            c = Complaint.objects.create(
                victim_name=spec['victim_name'],
                victim_phone=spec['victim_phone'],
                victim_email=spec['victim_email'],
                victim_district=spec['victim_district'],
                victim_state=spec['victim_state'],
                victim_pincode=spec['victim_pincode'],
                fraud_amount=spec['fraud_amount'],
                fraud_method=spec['fraud_method'],
                priority=spec['priority'],
                suspect_bank=spec['suspect_bank'],
                narrative_text=spec['narrative'],
                fraud_timestamp=now - timedelta(hours=random.randint(1, 6)),
                status='UNDER_ANALYSIS',
                assigned_officer=officer,
                organization=org,
            )
            # Transaction hops
            prev_account = rand_account()
            prev_bank = random.choice(BANKS)
            amt = float(c.fraud_amount)
            hop_dt = now - timedelta(hours=random.uniform(1, 6))
            for h in range(1, hops + 1):
                to_bank = random.choice(BANKS)
                to_acc  = rand_account()
                is_mule = h == hops  # last hop is always mule
                TransactionHop.objects.create(
                    complaint=c,
                    from_account=prev_account, from_bank=prev_bank,
                    from_ifsc=rand_ifsc(prev_bank),
                    to_account=to_acc, to_bank=to_bank,
                    to_ifsc=rand_ifsc(to_bank),
                    amount=Decimal(str(round(amt * random.uniform(0.90, 1.0), 2))),
                    timestamp=hop_dt + timedelta(minutes=h * random.randint(8, 25)),
                    hop_number=h,
                    is_mule_flagged=is_mule,
                )
                prev_account, prev_bank = to_acc, to_bank
            live_complaints.append(c)
            self.stdout.write(f'    → {c.complaint_number} ({c.victim_name}) — {hops} hops')

        # ── 5. Predictions for 3 live complaints ──────────────────────
        self.stdout.write('\n  Auto-generating predictions for 3 live complaints...')
        pred_targets = live_complaints[:3]
        created_preds = []

        for i, c in enumerate(pred_targets):
            c.status = 'PREDICTION_ACTIVE'
            c.save(update_fields=['status'])

            top_zones = random.sample(ATM_ZONES, 5)
            probs = sorted([random.uniform(0.35, 0.92) for _ in range(5)], reverse=True)

            for rank, (zone, prob) in enumerate(zip(top_zones, probs), 1):
                eta = round(random.uniform(1.5, 8.0), 1)
                shap = {
                    'hop_count': round(random.uniform(0.12, 0.28), 3),
                    'fraud_amount_log': round(random.uniform(0.10, 0.22), 3),
                    'fraud_method_UPI': round(random.uniform(0.05, 0.18), 3),
                    'time_since_fraud_hrs': round(random.uniform(0.04, 0.15), 3),
                    'victim_state_encoded': round(random.uniform(0.03, 0.12), 3),
                }
                p = CashOutPrediction.objects.create(
                    complaint=c,
                    predicted_zone_name=zone[0],
                    predicted_lat=zone[1],
                    predicted_lon=zone[2],
                    probability=round(prob, 4),
                    eta_hours=eta,
                    rank=rank,
                    model_version='v1.0-lightgbm',
                    feature_importance_json=shap,
                    outcome='PENDING',
                )
                if rank == 1:
                    created_preds.append(p)
            self.stdout.write(f'    → {c.complaint_number}: top zone={top_zones[0][0]} ({probs[0]:.0%})')

        # ── 6. 2 Active alerts ────────────────────────────────────────
        self.stdout.write('\n  Creating 2 active alerts...')
        for pred in created_preds[:2]:
            PredictionAlert.objects.get_or_create(
                prediction=pred,
                officer=officer,
                defaults={'alert_type': 'WEBSOCKET', 'status': 'SENT'},
            )
        self.stdout.write(self.style.SUCCESS('  ✓ 2 WebSocket alerts created'))

        # ── 7. Historical predictions for analytics (INTERCEPTED/MISSED) ──
        self.stdout.write('\n  Seeding historical prediction outcomes...')
        closed = [c for c in hist_complaints if c.status in ('INTERCEPTED','CLOSED','FALSE_ALARM')]
        analytics_count = 0
        for c in closed[:20]:
            zone = random.choice(ATM_ZONES)
            outcome = 'INTERCEPTED' if c.status == 'INTERCEPTED' else 'MISSED'
            CashOutPrediction.objects.get_or_create(
                complaint=c, rank=1,
                defaults=dict(
                    predicted_zone_name=zone[0], predicted_lat=zone[1], predicted_lon=zone[2],
                    probability=round(random.uniform(0.45, 0.92), 4),
                    eta_hours=round(random.uniform(2, 10), 1),
                    model_version='v1.0-lightgbm',
                    outcome=outcome,
                )
            )
            analytics_count += 1
        self.stdout.write(self.style.SUCCESS(f'  ✓ {analytics_count} historical prediction records'))

        # ── Summary ───────────────────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING('\n✅  Seed complete!\n'))
        self.stdout.write(f'  Users:               3')
        self.stdout.write(f'  Historical complaints: {len(hist_complaints)}')
        self.stdout.write(f'  Live complaints:      {len(live_complaints)} (with transaction chains)')
        self.stdout.write(f'  Active predictions:   {len(created_preds) * 5} (5 zones × 3 complaints)')
        self.stdout.write(f'  Active alerts:        2')
        self.stdout.write(f'  Analytics records:    {analytics_count}')
        self.stdout.write('')
        self.stdout.write('  Login credentials:')
        self.stdout.write('    inspector_singh / CrimeCast@2026   (IO)')
        self.stdout.write('    dsp_sharma      / CrimeCast@2026   (Supervisor)')
        self.stdout.write('    admin_crimecast / CrimeCast@2026   (Admin)\n')
