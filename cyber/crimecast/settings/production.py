import os
from .base import *

# ── Security ──────────────────────────────────────────────
DEBUG = False
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[])

if not ALLOWED_HOSTS:
    raise ValueError("ALLOWED_HOSTS must be set in production")

# GDPR IP anonymization (production default)
ANONYMIZE_IP_ADDRESSES = env.bool('ANONYMIZE_IP_ADDRESSES', default=True)

# Insert IP anonymization middleware after SecurityMiddleware
MIDDLEWARE = list(MIDDLEWARE)
MIDDLEWARE.insert(2, 'apps.core.middleware.IPAnonymizationMiddleware')

# ── HTTPS Security ─────────────────────────────────────────
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
CSRF_COOKIE_SAMESITE = 'Strict'
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
CONN_MAX_AGE = 600

# ── Database ────────────────────────────────────────────────
import dj_database_url
DATABASES = {
    'default': dj_database_url.config(
        default=env('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# ── Cache ────────────────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {'max_connections': 50},
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
        },
        'TIMEOUT': 300,
        'KEY_PREFIX': 'crimecast_prod',
    }
}

# ── Static Files ─────────────────────────────────────────────
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ── Email ────────────────────────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = env('EMAIL_HOST', default='smtp.sendgrid.net')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='apikey')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@crimecast.io')

# ── Sentry Error Monitoring ──────────────────────────────────
SENTRY_DSN = env('SENTRY_DSN', default='')


def _sentry_before_send(event, hint):
    """Filter out non-critical errors and sanitize PII before sending to Sentry"""
    # Don't send 404 errors
    if 'exc_info' in hint:
        from django.http import Http404
        if isinstance(hint['exc_info'][1], Http404):
            return None

    # Sanitize request headers
    if 'request' in event and 'headers' in event.get('request', {}):
        headers = event['request']['headers']
        for sensitive_header in ['Authorization', 'Cookie', 'X-CSRFToken']:
            if sensitive_header in headers:
                headers[sensitive_header] = '[Filtered]'

    return event


if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration
        from sentry_sdk.integrations.celery import CeleryIntegration
        from sentry_sdk.integrations.redis import RedisIntegration

        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[
                DjangoIntegration(
                    transaction_style='url',
                    middleware_spans=True,
                ),
                CeleryIntegration(monitor_beat_tasks=True),
                RedisIntegration(),
            ],
            traces_sample_rate=env.float('SENTRY_TRACES_RATE', default=0.1),
            profiles_sample_rate=env.float('SENTRY_PROFILES_RATE', default=0.05),
            environment=env('SENTRY_ENVIRONMENT', default='production'),
            release=env('SENTRY_RELEASE', default='unknown'),
            send_default_pii=False,  # GDPR: don't send user PII to Sentry
            before_send=_sentry_before_send,
        )
    except ImportError:
        import warnings
        warnings.warn("sentry_sdk not installed. Install with: pip install sentry-sdk")
else:
    import warnings
    warnings.warn("SENTRY_DSN not set. Error monitoring disabled.")
