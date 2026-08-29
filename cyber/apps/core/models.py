from django.db import models
from django.conf import settings
import uuid
import secrets


class Notification(models.Model):
    SEVERITY_CHOICES = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('critical', 'Critical Alert'),
        ('success', 'Success'),
    ]

    TYPES = [
        ('critical_threat',    'Critical Threat'),
        ('validation_request', 'Validation Request'),
        ('incident_assigned',  'Incident Assigned'),
        ('sandbox_complete',   'Sandbox Complete'),
        ('prediction_alert',   'Prediction Alert'),
        ('sla_warning',        'SLA Warning'),
        ('report_ready',       'Report Ready'),
        ('ml_drift',           'ML Drift Alert'),
        ('system_alert',       'System Alert'),
    ]

    TYPE_CHOICES = TYPES + [
        ('sla_breach',  'SLA Breach'),
        ('new_ioc',     'New IoC'),
        ('new_incident', 'New Incident'),
        ('system',      'System'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    # New canonical type field (used by notification_service.py)
    notification_type = models.CharField(
        max_length=30, choices=TYPES, blank=True,
    )
    # Legacy type field — kept for backward compatibility with existing tasks
    type = models.CharField(
        max_length=30, choices=TYPE_CHOICES, default='system',
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    severity = models.CharField(
        max_length=20, choices=SEVERITY_CHOICES, default='info',
    )
    link_page = models.CharField(max_length=100, blank=True)
    link_id = models.CharField(max_length=100, blank=True)
    related_object_id = models.CharField(max_length=200, blank=True)
    read = models.BooleanField(default=False)
    email_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'read', 'created_at']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['email_sent', 'created_at']),
        ]

    def __str__(self):
        return f"[{self.get_notification_type_display() or self.type}] {self.user} - {self.title}"

    @property
    def effective_type(self):
        """Return the canonical type, falling back to legacy `type` for old records."""
        return self.notification_type or self.type


class APIKey(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='api_keys',
    )
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=128, unique=True, default=secrets.token_urlsafe)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} - {self.user}"


class PlatformPermission(models.Model):
    """Singleton-style model for platform-wide permission toggles."""
    allow_registration = models.BooleanField(
        default=True,
        help_text="Allow new users to register via the public signup endpoint.",
    )
    require_invitation = models.BooleanField(
        default=False,
        help_text="Require an admin invitation token to register.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Platform Permission"
        verbose_name_plural = "Platform Permissions"

    def __str__(self):
        return "Platform Permissions"

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
