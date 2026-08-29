"""
Celery tasks for the core app — notification email delivery and SLA monitoring.
"""
import logging
from celery import shared_task
from celery.schedules import crontab
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_notification_email(self, notification_id):
    """
    Send an email notification for the given Notification record.
    Retries up to 3 times with a 5-minute backoff.
    """
    from apps.core.models import Notification

    try:
        notif = Notification.objects.select_related('user').get(id=notification_id)

        context = {
            'notification': notif,
            'user': notif.user,
            'platform_url': getattr(settings, 'PLATFORM_URL', 'https://crimecast.io'),
            'unsubscribe_url': f"{getattr(settings, 'PLATFORM_URL', 'https://crimecast.io')}/profile/notifications/",
        }

        # Use the report_ready template for report notifications, otherwise the generic one
        if notif.notification_type == 'report_ready':
            template = 'emails/report_ready.html'
        elif notif.notification_type == 'sla_warning':
            template = 'emails/sla_warning.html'
        else:
            template = 'emails/notification.html'

        html_content = render_to_string(template, context)
        text_content = f"{notif.title}\n\n{notif.message}\n\nView: {context['platform_url']}/app/"

        email = EmailMultiAlternatives(
            subject=f"[CrimeCast] {notif.title}",
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[notif.user.email],
        )
        email.attach_alternative(html_content, "text/html")
        email.send()

        notif.email_sent = True
        notif.save(update_fields=['email_sent'])
        logger.info(f"Email sent for notification {notification_id}")

    except Notification.DoesNotExist:
        logger.warning(f"Notification {notification_id} not found — skipping email")
    except Exception as exc:
        logger.error(f"Failed to send email for notification {notification_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_system_email(self, subject, template_name, context, recipient_email):
    """
    Send a generic system email (e.g. password reset, security alert, registration).
    Retries up to 3 times with a 5-minute backoff.
    """
    try:
        context['platform_url'] = getattr(settings, 'PLATFORM_URL', 'https://crimecast.io')
        html_content = render_to_string(template_name, context)
        
        email = EmailMultiAlternatives(
            subject=f"[CrimeCast] {subject}",
            body="Please view this email in an HTML compatible client.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        logger.info(f"System email '{subject}' sent to {recipient_email}")

    except Exception as exc:
        logger.error(f"Failed to send system email '{subject}' to {recipient_email}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, name='apps.core.tasks.check_sla_warnings')
def check_sla_warnings(self):
    """
    Periodic SLA monitor: checks all open incidents and sends warnings
    to assigned analysts and lead analyst.

    - At 20% of SLA remaining → warning notification
    - At 0% (breached) → critical breach notification (once)
    """
    from apps.incidents.models import Incident
    from apps.core.notification_service import notify_user

    now = timezone.now()
    total_sla_default = 240 * 60  # 4 hours in seconds as fallback

    open_incidents = Incident.objects.exclude(
        status='resolved'
    ).filter(sla_deadline__isnull=False).select_related('lead_analyst').prefetch_related('assigned_analysts')

    warned = 0
    breached = 0

    for incident in open_incidents:
        time_remaining = (incident.sla_deadline - now).total_seconds()
        total_sla = incident.sla_minutes * 60 if incident.sla_minutes else total_sla_default
        percent_remaining = (time_remaining / total_sla) * 100 if total_sla > 0 else 0

        # Collect all recipients (lead analyst + assigned analysts)
        recipients = set()
        if incident.lead_analyst and incident.lead_analyst.is_active:
            recipients.add(incident.lead_analyst.id)
        recipients.update(
            incident.assigned_analysts.filter(is_active=True).values_list('id', flat=True)
        )

        if 0 < percent_remaining <= 20:
            # SLA warning — 20% remaining
            for user_id in recipients:
                notify_user(
                    user_id=user_id,
                    notification_type='sla_warning',
                    title=f'SLA Warning: {incident.incident_id}',
                    message=(
                        f'{incident.title} — {int(percent_remaining)}% of SLA time remaining. '
                        f'Deadline: {incident.sla_deadline.strftime("%H:%M UTC")}'
                    ),
                    link_page='incidents',
                    link_id=str(incident.id),
                )
            warned += 1

        elif time_remaining <= 0:
            # SLA breached
            if not incident.sla_breached:
                incident.sla_breached = True
                incident.save(update_fields=['sla_breached'])

                for user_id in recipients:
                    notify_user(
                        user_id=user_id,
                        notification_type='sla_warning',
                        title=f'SLA BREACHED: {incident.incident_id}',
                        message=f'{incident.title} has exceeded its SLA deadline.',
                        link_page='incidents',
                        link_id=str(incident.id),
                    )
                breached += 1

    logger.info(f'SLA check complete: {breached} breached, {warned} warnings sent.')
    return {'breached': breached, 'warned': warned}


@shared_task(bind=True, name='apps.core.tasks.send_report_ready_notification')
def send_report_ready_notification(self, report_id, user_id, platform_url=None):
    """
    Notify a user that their PDF/JSON/STIX report is ready.
    """
    from apps.core.notification_service import notify_user

    if platform_url is None:
        platform_url = getattr(settings, 'PLATFORM_URL', 'https://crimecast.io')

    try:
        notify_user(
            user_id=user_id,
            notification_type='report_ready',
            title='Report Ready for Download',
            message=f'Your CrimeCast report (ID: {report_id}) has been generated. Click to download.',
            link_page='reports',
            link_id=str(report_id),
        )
        logger.info(f"Report ready notification sent for report {report_id}")
    except Exception as exc:
        logger.error(f"Failed to send report ready notification: {exc}")
        raise self.retry(exc=exc)


@shared_task(name='apps.core.tasks.update_metrics')
def update_metrics():
    """
    Periodic task to update Prometheus gauges with current cash-out prediction sizes.
    Runs every minute via Celery Beat.
    """
    from apps.predictions.models import CashOutPrediction
    from apps.core.metrics import threat_feed_size

    for severity in ['critical', 'high', 'medium', 'low']:
        count = CashOutPrediction.objects.filter(outcome='NEEDS_REVIEW').count()
        threat_feed_size.labels(severity=severity).set(count)
