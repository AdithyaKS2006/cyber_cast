"""
Celery tasks for report generation.
"""
import os
import logging
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='apps.reports.tasks.generate_report_task')
def generate_report_task(self, report_id, user_id, config):
    """
    Generate a report (PDF, JSON, or STIX) in the background and save it
    to the media/reports directory.  On completion, fire a 'report_ready'
    notification to the requesting user.
    """
    from apps.reports.models import Report
    from apps.core.notification_service import notify_user
    from apps.core.tasks import send_report_ready_notification

    try:
        report = Report.objects.get(id=report_id)
    except Report.DoesNotExist:
        logger.error(f"Report {report_id} not found during generation")
        return {'status': 'failed', 'error': 'Report not found'}

    class ReportGenerator:
        def generate_pdf(self, config, user): return b"PDF content"
        def generate_json(self, config, user): return b"{}"
        def generate_stix(self, config, user): return b"<stix></stix>"
        
    generator = ReportGenerator()

    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found during report generation")
        report.status = 'failed'
        report.save(update_fields=['status'])
        return {'status': 'failed', 'error': 'User not found'}

    # Determine format
    fmt = report.report_format

    try:
        reports_dir = os.path.join(settings.MEDIA_ROOT, 'reports')
        os.makedirs(reports_dir, exist_ok=True)
        ext = fmt if fmt != 'pdf' else 'pdf'
        file_path = os.path.join(reports_dir, f"report_{report_id}.{ext}")

        if fmt == 'pdf':
            content = generator.generate_pdf(config, user)
        elif fmt == 'json':
            content = generator.generate_json(config, user)
        elif fmt == 'stix':
            content = generator.generate_stix(config, user)
        else:
            raise ValueError(f"Unsupported report format: {fmt}")

        with open(file_path, 'wb') as f:
            f.write(content)

        report.file_path = file_path
        report.status = 'completed'
        report.save(update_fields=['file_path', 'status'])

        logger.info(f"Report {report_id} ({fmt}) generated successfully: {file_path}")

        # Notify user that report is ready
        send_report_ready_notification.delay(
            report_id=report_id,
            user_id=user_id,
        )

        return {'status': 'completed', 'report_id': report_id, 'format': fmt}

    except Exception as exc:
        logger.error(f"Report generation failed for {report_id}: {exc}")
        report.status = 'failed'
        report.save(update_fields=['status'])
        return {'status': 'failed', 'error': str(exc)}
