from django.test import TestCase
from django.utils import timezone
from apps.complaints.models import Complaint, TransactionHop

class ComplaintTestCase(TestCase):
    def setUp(self):
        self.complaint = Complaint.objects.create(
            victim_name="Ramesh Kumar",
            victim_phone="9810012345",
            victim_district="Connaught Place",
            victim_state="Delhi",
            victim_pincode="110001",
            fraud_amount=150000.00,
            fraud_method="UPI",
            fraud_timestamp=timezone.now(),
            narrative_text="Fraudulent transfer reported via fake customer care."
        )

    def test_complaint_number_auto_generation(self):
        self.assertTrue(self.complaint.complaint_number.startswith("CC-"))
        self.assertEqual(self.complaint.status, "NEW")
        self.assertEqual(self.complaint.priority, "MEDIUM")

    def test_transaction_hop_relation(self):
        hop = TransactionHop.objects.create(
            complaint=self.complaint,
            from_account="987654321",
            from_bank="State Bank of India",
            to_account="123456789",
            to_bank="Paytm Payments Bank",
            amount=150000.00,
            timestamp=timezone.now(),
            hop_number=1
        )
        self.assertEqual(self.complaint.transaction_hops.count(), 1)
        self.assertEqual(hop.complaint, self.complaint)
