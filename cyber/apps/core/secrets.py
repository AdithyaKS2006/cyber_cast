"""Centralized secret validation on startup"""
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

REQUIRED_SECRETS = [
    'SECRET_KEY',
]

OPTIONAL_SECRETS_WITH_WARNINGS = [
    ('VIRUSTOTAL_API_KEY', 'VirusTotal enrichment will be disabled'),
    ('GEMINI_API_KEY', 'Cyber Guru will use mock responses'),
]

def validate_secrets():
    for secret in REQUIRED_SECRETS:
        val = getattr(settings, secret, None)
        if not val or val == 'django-insecure-fallback-only-for-local-dev':
            if getattr(settings, 'SECURE_SSL_REDIRECT', False): # Basic prod check
                raise ImproperlyConfigured(f"Required secret {secret} is not set or insecure")
    
    for secret, warning in OPTIONAL_SECRETS_WITH_WARNINGS:
        if not getattr(settings, secret, None):
            import warnings
            warnings.warn(f"{secret} not set: {warning}", stacklevel=2)
