from django.apps import AppConfig
import sys

class MlEngineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ml_engine'
    verbose_name = 'ML Engine'

    def ready(self):
        # Skip during management commands like test/migrate
        if any(cmd in sys.argv for cmd in ['test', 'migrate', 'makemigrations', 'collectstatic']):
            return
        try:
            from .threat_report_ai import prewarm_ai_pipeline
            prewarm_ai_pipeline()
        except ImportError:
            pass

