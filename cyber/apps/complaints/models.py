import uuid
import datetime
from django.db import models
from apps.users.models import User, Organization

class Complaint(models.Model):
    FRAUD_METHODS = [
        ('UPI', 'UPI'),
        ('CARD', 'Card'),
        ('NET_BANKING', 'Net Banking'),
        ('PHONE_CALL', 'Phone Call'),
        ('EMAIL_PHISHING', 'Email Phishing'),
        ('OTHER', 'Other'),
    ]

    STATUS_CHOICES = [
        ('NEW', 'New'),
        ('UNDER_ANALYSIS', 'Under Analysis'),
        ('PREDICTION_ACTIVE', 'Prediction Active'),
        ('INTERCEPTED', 'Intercepted'),
        ('CLOSED', 'Closed'),
        ('FALSE_ALARM', 'False Alarm'),
    ]

    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint_number = models.CharField(max_length=50, unique=True, blank=True)
    
    victim_name = models.CharField(max_length=255)
    victim_phone = models.CharField(max_length=20)
    victim_email = models.EmailField(blank=True)
    victim_district = models.CharField(max_length=100)
    victim_state = models.CharField(max_length=100)
    victim_pincode = models.CharField(max_length=10)
    
    fraud_amount = models.DecimalField(max_digits=12, decimal_places=2)
    fraud_method = models.CharField(max_length=50, choices=FRAUD_METHODS)
    
    fraud_timestamp = models.DateTimeField()
    complaint_timestamp = models.DateTimeField(auto_now_add=True)
    
    suspect_account_number = models.CharField(max_length=100, blank=True)
    suspect_bank = models.CharField(max_length=100, blank=True)
    suspect_phone = models.CharField(max_length=20, blank=True)
    
    narrative_text = models.TextField()
    
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='NEW')
    priority = models.CharField(max_length=50, choices=PRIORITY_CHOICES, default='MEDIUM')
    
    assigned_officer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_complaints')
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='complaints')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'complaints'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.complaint_number} - {self.victim_name}"

    def save(self, *args, **kwargs):
        if not self.complaint_number:
            from django.db import transaction
            year = datetime.datetime.now().year
            
            with transaction.atomic():
                last_complaint = Complaint.objects.select_for_update().filter(
                    complaint_number__startswith=f'CC-{year}-'
                ).order_by('-complaint_number').first()
                
                if last_complaint and last_complaint.complaint_number:
                    try:
                        last_num = int(last_complaint.complaint_number.split('-')[-1])
                        new_num = last_num + 1
                    except ValueError:
                        new_num = 1
                else:
                    new_num = 1
                self.complaint_number = f'CC-{year}-{new_num:05d}'
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

class TransactionHop(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='transaction_hops')
    
    from_account = models.CharField(max_length=100)
    from_bank = models.CharField(max_length=100)
    from_ifsc = models.CharField(max_length=20, blank=True)
    
    to_account = models.CharField(max_length=100)
    to_bank = models.CharField(max_length=100)
    to_ifsc = models.CharField(max_length=20, blank=True)
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    timestamp = models.DateTimeField()
    
    hop_number = models.PositiveIntegerField()
    is_mule_flagged = models.BooleanField(default=False)
    
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'transaction_hops'
        ordering = ['complaint', 'hop_number']

    def __str__(self):
        return f"Hop {self.hop_number} for {self.complaint.complaint_number}"
