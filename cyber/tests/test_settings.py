"""Test settings — overrides database and cache for testing without external services."""
from crimecast.settings.development import *  # noqa: F401,F403

# Use SQLite for tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Use local memory cache for tests
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-cache',
        'TIMEOUT': 3600,
    }
}

# Use console email backend for tests
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Celery configuration for tests — run tasks eagerly, no broker needed
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = 'memory://'

# Don't use Channels Redis in tests
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}

# Disable rate limiting by default — tests enable it individually via @override_settings
RATELIMIT_ENABLE = False

# Disable sentry (if installed)
try:
    import sentry_sdk
    sentry_sdk.init(dsn='')
except ImportError:
    pass
