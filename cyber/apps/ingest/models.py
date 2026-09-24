import uuid
from django.db import models
from apps.complaints.models import Complaint

class ProactiveAlert(models.Model):
    SOURCE_CHOICES = [
        ('NPCI', 'NPCI'),
        ('BANK', 'Bank API'),
        ('I4C', 'I4C Push'),
    ]

    STATUS_CHOICES = [
        ('RECEIVED', 'Received'),
        ('ANALYZING', 'Analyzing'),
        ('FREEZE_REQUESTED', 'Freeze Requested'),
        ('ANALYZED', 'Analyzed'),
        ('FROZEN', 'Frozen'),
        ('FAILED', 'Failed'),
        ('EXPIRED', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alert_id = models.CharField(max_length=100, unique=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='NPCI')

    from_account = models.CharField(max_length=100)
    from_bank_ifsc = models.CharField(max_length=20)
    to_account = models.CharField(max_length=100)
    to_bank_ifsc = models.CharField(max_length=20)

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    fraud_score = models.FloatField()
    fraud_indicators = models.JSONField(default=list, blank=True)

    linked_complaint = models.ForeignKey(
        Complaint, null=True, blank=True, on_delete=models.SET_NULL, related_name='proactive_alerts'
    )

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='RECEIVED')

    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'proactive_alerts'
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.alert_id} - {self.source} - ₹{self.amount} ({self.status})"
