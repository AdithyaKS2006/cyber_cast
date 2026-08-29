from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid
import secrets


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organizations'
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    avatar_initials = models.CharField(max_length=15, blank=True)
    reputation_score = models.IntegerField(default=500)
    xp_points = models.IntegerField(default=0)
    rank = models.CharField(max_length=50, default='Trainee')
    role = models.CharField(max_length=50, default='Operator')
    district = models.CharField(max_length=100, blank=True, default='')
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    
    # Skills (stored as JSON)
    skill_threat_analysis = models.IntegerField(default=0)
    skill_malware = models.IntegerField(default=0)
    skill_incident_response = models.IntegerField(default=0)
    skill_threat_hunting = models.IntegerField(default=0)
    skill_ai_ml = models.IntegerField(default=0)
    
    # Preferences
    theme = models.CharField(max_length=10, default='dark')
    notifications_email = models.BooleanField(default=True)
    notifications_slack = models.BooleanField(default=False)
    
    # 2FA
    totp_secret = models.CharField(max_length=32, blank=True)
    mfa_enabled = models.BooleanField(default=False)
    backup_codes = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['xp_points']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.avatar_initials:
            parts = self.get_full_name().split()
            self.avatar_initials = ''.join(p[0].upper() for p in parts[:2]) or self.username[:2].upper()
        self.rank = self._calculate_rank()
        super().save(*args, **kwargs)
    
    def _calculate_rank(self):
        if self.xp_points < 500: return 'Trainee'
        elif self.xp_points < 1500: return 'Analyst'
        elif self.xp_points < 3000: return 'Senior Analyst'
        elif self.xp_points < 6000: return 'Expert'
        else: return 'Elite'
    
    def award_xp(self, amount, reason=''):
        self.xp_points += amount
        self.save(update_fields=['xp_points', 'rank'])
        return self.xp_points


class UserSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    device = models.CharField(max_length=200)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-last_active']
        indexes = [
            models.Index(fields=['is_active', 'last_active']),
        ]


class UserCertification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certifications')
    name = models.CharField(max_length=100)
    issuer = models.CharField(max_length=100)
    issued_date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    credential_id = models.CharField(max_length=100, blank=True)
    
    class Meta:
        ordering = ['-issued_date']





class AuditLog(models.Model):
    ACTION_TYPES = [
        ('ioc_submission', 'IoC Submission'),
        ('threat_validation', 'Threat Validation'),
        ('evidence_anchor', 'Evidence Anchor'),
        ('role_grant', 'Role Grant'),
        ('report_export', 'Report Export'),
        ('api_key_created', 'API Key Created'),
        ('user_login', 'User Login'),
        ('config_change', 'Config Change'),
        ('false_positive', 'False Positive'),
        ('cert_mint', 'Certificate Mint'),
        ('sandbox_run', 'Sandbox Run'),
        ('packet_analysis', 'Packet Analysis'),
        ('gdpr_export', 'GDPR Data Export'),
        ('gdpr_delete', 'GDPR Account Deletion'),
        ('incident_created', 'Incident Created'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    resource_type = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=200, blank=True)
    payload = models.JSONField(default=dict)
    payload_hash = models.CharField(max_length=64)
    tx_hash = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action_type']),
            models.Index(fields=['user', 'created_at']),
        ]
    
    def save(self, *args, **kwargs):
        import hashlib, json
        self.payload_hash = hashlib.sha256(
            json.dumps(self.payload, sort_keys=True).encode()
        ).hexdigest()
        super().save(*args, **kwargs)
