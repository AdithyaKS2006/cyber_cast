"""
Factory Boy factories for all CrimeCast models.

Usage:
    from tests.factories import ThreatIndicatorFactory
    ioc = ThreatIndicatorFactory()
"""
import uuid
import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    id = factory.LazyFunction(uuid.uuid4)
    username = factory.Sequence(lambda n: f'user_{n}')
    email = factory.Sequence(lambda n: f'user_{n}@test.io')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    password = factory.PostGenerationMethodCall('set_password', 'TestPass123!')
    role = 'analyst'
    avatar_initials = factory.LazyAttribute(
        lambda o: (o.first_name[:1] + o.last_name[:1]).upper()
    )
    is_active = True


class AnalystFactory(UserFactory):
    role = 'analyst'


class ValidatorFactory(UserFactory):
    role = 'validator'


class AdminFactory(UserFactory):
    role = 'administrator'


