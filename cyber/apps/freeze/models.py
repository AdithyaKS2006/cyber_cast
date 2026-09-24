import uuid
from django.db import models
from django.conf import settings
from apps.ingest.models import ProactiveAlert
from apps.complaints.models import Complaint


class FreezeRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('FROZEN', 'Frozen'),
        ('REJECTED', 'Rejected'),
        ('REVOKED', 'Revoked'),
        ('EXPIRED', 'Expired'),
        ('FAILED', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proactive_alert = models.ForeignKey(
        ProactiveAlert,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='freeze_requests'
    )
    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='freeze_requests'
    )

    target_account = models.CharField(max_length=100)
    target_bank_ifsc = models.CharField(max_length=20, blank=True)
    target_bank_name = models.CharField(max_length=100, blank=True)
    freeze_amount = models.DecimalField(max_digits=14, decimal_places=2)

    i4c_freeze_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    auto_triggered = models.BooleanField(default=False)
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_freezes'
    )

    api_response_raw = models.JSONField(default=dict, blank=True)
    failure_reason = models.TextField(blank=True)
    cash_out_eta_minutes = models.IntegerField(default=15)

    window_expires_at = models.DateTimeField(null=True, blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-requested_at']
        verbose_name = 'Freeze Request'
        verbose_name_plural = 'Freeze Requests'

    def __str__(self):
        return f"FreezeRequest {self.id} [{self.target_account}] - {self.status}"
