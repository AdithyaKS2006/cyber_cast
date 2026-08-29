from .base import *
import warnings

# Try Redis first, fall back to local memory cache
REDIS_URL = env('REDIS_URL', default='')

if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': env('REDIS_URL_CACHE', default=REDIS_URL + '/1'),
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'CONNECTION_POOL_KWARGS': {'max_connections': 50},
            },
            'TIMEOUT': 300,
            'KEY_PREFIX': 'crimecast',
        }
    }
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [REDIS_URL],
            },
        },
    }
else:
    # Development without Redis — use in-memory cache
    # Rate limiting will use local memory (not shared across processes)
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'crimecast-dev',
            'TIMEOUT': 300,
            'KEY_PREFIX': 'crimecast',
        }
    }
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
    CELERY_BROKER_URL = 'memory://'
    CELERY_RESULT_BACKEND = 'cache+memory://'
    CELERY_CACHE_BACKEND = 'default'
    warnings.warn(
        "Redis not configured (REDIS_URL not set). "
        "WebSockets will use in-memory layer (single process only). "
        "Rate limiting will use local memory cache.",
        stacklevel=2,
    )

# ── Development debugging: query logging & performance monitoring ──────────
# Log all SQL queries in development to detect N+1 issues
LOGGING['loggers']['django.db.backends'] = {
    'level': 'DEBUG',
    'handlers': ['console'],
    'propagate': False,
}

# Track per-request query counts via QueryCountMiddleware
MIDDLEWARE = ['apps.core.middleware.QueryCountMiddleware'] + MIDDLEWARE
