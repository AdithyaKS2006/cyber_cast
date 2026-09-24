from django.apps import AppConfig


class FreezeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.freeze'
    verbose_name = 'Automated Account Freeze'
