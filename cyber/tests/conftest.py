"""
Pytest fixtures for the CrimeCast test suite.

All fixtures use the Django DB (via the ``db`` marker) and configure
a LocMemCache so that django-ratelimit works without a running Redis.
"""
import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient

User = get_user_model()

# LocMem cache so rate-limiting works without Redis in the test environment
_LOC_MEM_CACHE = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-crimecast-cache',
        'TIMEOUT': 3600,
    }
}


@pytest.fixture(autouse=True)
def override_cache():
    """Override the cache backend to LocMemCache for every test."""
    with override_settings(CACHES=_LOC_MEM_CACHE):
        # Clear any rate-limit counters left over from previous tests
        from django.core.cache import cache
        cache.clear()
        yield
        cache.clear()


# Signals disconnected (legacy threat detection removed)

@pytest.fixture(autouse=True)
def configure_celery_eager():
    """
    Ensure Celery runs tasks eagerly (without a broker) in test mode.
    The Celery app may have been configured before test settings were applied.
    """
    from celery import current_app
    current_app.conf.task_always_eager = True
    current_app.conf.task_eager_propagates = True
    current_app.conf.broker_url = 'memory://'
    yield


# ── Users ─────────────────────────────────────────────────────────────────────

@pytest.fixture
def analyst_user(db):
    return User.objects.create_user(
        username='test_analyst',
        email='analyst@test.io',
        password='TestPass123!',
        first_name='Test',
        last_name='Analyst',
        role='analyst',
    )


@pytest.fixture
def validator_user(db):
    return User.objects.create_user(
        username='test_validator',
        email='validator@test.io',
        password='TestPass123!',
        role='validator',
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username='test_admin',
        email='admin@test.io',
        password='TestPass123!',
        first_name='Test',
        last_name='Admin',
        role='administrator',
        is_staff=True,
        is_superuser=True,
    )


# ── API Clients ───────────────────────────────────────────────────────────────

@pytest.fixture
def analyst_client(analyst_user):
    client = APIClient()
    response = client.post('/api/v1/auth/login/', {
        'email': analyst_user.email,
        'password': 'TestPass123!',
    })
    client.cookies = response.cookies
    return client


@pytest.fixture
def validator_client(validator_user):
    client = APIClient()
    response = client.post('/api/v1/auth/login/', {
        'email': validator_user.email,
        'password': 'TestPass123!',
    })
    client.cookies = response.cookies
    return client


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    response = client.post('/api/v1/auth/login/', {
        'email': admin_user.email,
        'password': 'TestPass123!',
    })
    client.cookies = response.cookies
    return client


@pytest.fixture
def unauthenticated_client():
    return APIClient()


# ── Sample data ───────────────────────────────────────────────────────────────

# -- Sample data removed --# ── Celery ────────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """Allow DB access for all tests by default."""
    pass


@pytest.fixture
def mock_celery_tasks(monkeypatch):
    """
    Patch all Celery ``delay()`` calls so tests run synchronously
    without a running worker.
    """
    from unittest.mock import MagicMock

    modules_to_patch = [
        'apps.ml_engine.tasks.retrain_model',
        'apps.ml_engine.tasks.check_all_model_drift',
        'apps.core.tasks.send_notification_email',
        'apps.core.tasks.check_sla_warnings',
        'apps.core.tasks.send_report_ready_notification',
        'apps.reports.tasks.generate_report_task',
    ]

    for mod_path in modules_to_patch:
        parts = mod_path.rsplit('.', 1)
        mod = __import__(parts[0], fromlist=[parts[1]])
        task_attr = getattr(mod, parts[1])
        task_attr.delay = MagicMock()

    return modules_to_patch
