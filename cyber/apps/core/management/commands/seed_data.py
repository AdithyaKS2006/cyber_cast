"""
Management command to seed the database with CrimeCast demo data.
Run: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.complaints.models import Complaint, TransactionHop
import random
import uuid
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
import sys
from pathlib import Path

# Add the project root to sys.path so we can import train_ml_models
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
sys.path.append(str(BASE_DIR))
import train_cashout_model
from apps.predictions.tasks import run_prediction_pipeline
from apps.predictions.models import CashOutPrediction

User = get_user_model()



# Realistic cybercrime complaint data for demo
DEMO_COMPLAINTS = [
    {
        'victim_name': 'Rajesh Kumar Sharma',
        'victim_phone': '9876543210',
        'victim_email': 'rajesh.sharma@email.com',
        'victim_state': 'Delhi',
        'victim_district': 'Delhi',
        'fraud_amount': Decimal('245000.00'),
        'fraud_method': 'UPI',
        'narrative_text': 'Received a phone call claiming to be from SBI bank. Caller asked me to download AnyDesk app and share OTP for KYC update. Within minutes, ₹2,45,000 was transferred from my account via multiple UPI transactions. The bank statement showed IP addresses tracing to Nuh.',
    },
    {
        'victim_name': 'Priya Devi',
        'victim_phone': '9123456789',
        'victim_email': 'priya.devi@email.com',
        'victim_state': 'Maharashtra',
        'victim_district': 'Mumbai',
        'fraud_amount': Decimal('89500.00'),
        'fraud_method': 'CARD',
        'narrative_text': 'Clicked on a link received via SMS about a failed delivery. The link asked for card details. Money was withdrawn from my credit card at multiple ATMs in the Mumbai area.',
    },
    {
        'victim_name': 'Anand Verma',
        'victim_phone': '9988776655',
        'victim_email': 'anand.verma@email.com',
        'victim_state': 'UP',
        'victim_district': 'Lucknow',
        'fraud_amount': Decimal('560000.00'),
        'fraud_method': 'NET_BANKING',
        'narrative_text': 'Received an urgent email from what appeared to be my company HR regarding salary revision. The link redirected to a fake net banking portal. Lost ₹5,60,000 through immediate NEFT transfers to 4 different accounts tracing to Bharatpur.',
    },
    {
        'victim_name': 'Meera Patel',
        'victim_phone': '8899001122',
        'victim_email': 'meera.patel@email.com',
        'victim_state': 'Gujarat',
        'victim_district': 'Ahmedabad',
        'fraud_amount': Decimal('175000.00'),
        'fraud_method': 'PHONE_CALL',
        'narrative_text': 'Got a call from someone posing as a customs officer, claiming my Aadhaar was used to ship illegal goods. Was threatened with arrest and asked to transfer money urgently to clear my name. The accounts were linked to Jamtara.',
    },
    {
        'victim_name': 'Suresh Reddy',
        'victim_phone': '7766554433',
        'victim_email': 'suresh.reddy@email.com',
        'victim_state': 'Telangana',
        'victim_district': 'Hyderabad',
        'fraud_amount': Decimal('320000.00'),
        'fraud_method': 'UPI',
        'narrative_text': 'Attempted to sell furniture on OLX. Buyer sent a QR code claiming it was for payment. Scanning the QR code resulted in money being debited instead. Lost ₹3,20,000 through rapid UPI transfers. The scammers were operating out of Bengaluru.',
    },
]

# Banks for transaction hop generation
BANKS = [
    'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank',
    'Punjab National Bank', 'Bank of Baroda', 'Yes Bank', 'IndusInd Bank', 'Federal Bank',
    'Canara Bank', 'Union Bank of India', 'Indian Bank', 'Bank of India', 'Central Bank of India',
]


class Command(BaseCommand):
    help = 'Seed database with CrimeCast demo data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding CrimeCast database...')

        # Create demo users (law enforcement officers)
        users = self._create_users()

        # Create cybercrime complaints with transaction chains
        self._create_complaints(users)

        self.stdout.write(self.style.SUCCESS('CrimeCast database seeded successfully!'))
        self.stdout.write('Login credentials:')
        self.stdout.write('  inspector@crimecast.io / demo1234  (Investigating Officer)')
        self.stdout.write('  supervisor@crimecast.io / demo1234  (Supervisor)')
        self.stdout.write('  admin@crimecast.io / demo1234  (I4C Admin)')

        self.stdout.write(self.style.WARNING('\n--- Training ML Models for Demo ---'))
        try:
            train_cashout_model.main()
            self.stdout.write(self.style.SUCCESS('ML Models trained successfully!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'ML Model training failed: {e}'))

    def _create_users(self):
        users = []
        for data in [
            {'username': 'insp_sharma', 'email': 'inspector@crimecast.io', 'first_name': 'Vikram', 'last_name': 'Sharma', 'role': 'analyst', 'xp_points': 4200},
            {'username': 'si_patel', 'email': 'supervisor@crimecast.io', 'first_name': 'Arun', 'last_name': 'Patel', 'role': 'validator', 'xp_points': 7800},
            {'username': 'admin_mishra', 'email': 'admin@crimecast.io', 'first_name': 'Neha', 'last_name': 'Mishra', 'role': 'administrator', 'xp_points': 15400},
        ]:
            user = User.objects.filter(email=data['email']).first() or User.objects.filter(username=data['username']).first()
            if not user:
                user = User(username=data['username'], email=data['email'])
            for k, v in data.items():
                setattr(user, k, v)
            user.skill_threat_analysis = random.randint(60, 95)
            user.reputation_score = random.randint(600, 1000)
            user.is_active = True
            user.set_password('demo1234')
            user.save()
            users.append(user)
        return users


    def _create_complaints(self, users):
        """Create realistic cybercrime complaints with transaction chains."""
        officer = users[0]  # Investigating officer

        for i, cdata in enumerate(DEMO_COMPLAINTS):
            now = timezone.now()
            fraud_ts = now - timedelta(hours=random.randint(2, 48))
            complaint_ts = fraud_ts + timedelta(hours=random.randint(1, 6))

            complaint, created = Complaint.objects.get_or_create(
                victim_name=cdata['victim_name'],
                defaults={
                    'victim_phone': cdata['victim_phone'],
                    'victim_email': cdata['victim_email'],
                    'victim_state': cdata['victim_state'],
                    'victim_district': cdata['victim_district'],
                    'fraud_amount': cdata['fraud_amount'],
                    'fraud_method': cdata['fraud_method'],
                    'narrative_text': cdata['narrative_text'],
                    'fraud_timestamp': fraud_ts,
                    'complaint_timestamp': complaint_ts,
                    'status': 'FILED',
                    'assigned_officer': officer,
                },
            )

            if created:
                # Generate 3-6 transaction hops per complaint
                num_hops = random.randint(3, 6)
                hop_ts = fraud_ts
                remaining = float(cdata['fraud_amount'])

                for hop_num in range(1, num_hops + 1):
                    hop_ts += timedelta(minutes=random.randint(2, 45))
                    hop_amount = remaining * random.uniform(0.3, 0.7) if hop_num < num_hops else remaining
                    hop_amount = round(hop_amount, 2)
                    remaining -= hop_amount

                    TransactionHop.objects.create(
                        complaint=complaint,
                        hop_number=hop_num,
                        from_account=f'XXXX{random.randint(1000, 9999)}',
                        to_account=f'XXXX{random.randint(1000, 9999)}',
                        from_bank=random.choice(BANKS),
                        to_bank=random.choice(BANKS),
                        amount=Decimal(str(hop_amount)),
                        timestamp=hop_ts,
                        latitude=None,
                        longitude=None,
                    )

                self.stdout.write(f'  Created complaint: {complaint.complaint_number} ({num_hops} hops)')

                # Generate predictions
                preds = run_prediction_pipeline(complaint)
                if preds:
                    self.stdout.write(f'    -> Generated {len(preds)} predictions')
                    
                    # Force a low confidence prediction for the 4th complaint to demonstrate NEEDS_REVIEW
                    if i == 3:
                        for pred in preds:
                            pred.probability = min(pred.probability, 0.55)
                            pred.outcome = 'NEEDS_REVIEW'
                            pred.save(update_fields=['probability', 'outcome'])
                        self.stdout.write(self.style.WARNING(f'    -> Forced NEEDS_REVIEW for {complaint.complaint_number}'))
                    
                    # Dispatched intelligence package for the 1st complaint
                    if i == 0:
                        try:
                            from apps.predictions.dispatch import dispatch_intelligence
                            dispatch_intelligence(preds[0], officer)
                            self.stdout.write(self.style.SUCCESS(f'    -> Dispatched intelligence for {complaint.complaint_number}'))
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f'    -> Failed to dispatch intelligence: {e}'))
