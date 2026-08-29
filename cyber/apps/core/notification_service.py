"""
Notification delivery service — creates DB records and pushes via
WebSocket and/or email.
"""
import logging
from django.utils import timezone
from django.utils.timesince import timesince

from apps.core.models import Notification
from apps.core.notifications import send_user_notification
from apps.users.models import User

logger = logging.getLogger(__name__)


def notify_user(
    user_id,
    notification_type,
    title,
    message,
    link_page='',
    link_id='',
    send_email=True,
    send_ws=True,
):
    """
    Create a notification for a single user and deliver it via WebSocket
    and email (email queued via Celery if the user has email notifications
    enabled).

    Parameters
    ----------
    user_id : UUID / str
        The target user's primary key.
    notification_type : str
        One of Notification.TYPES values.
    title : str
    message : str
    link_page : str
        The frontend page to navigate to when the user clicks the
        notification (e.g. 'incidents', 'threat-feed').
    link_id : str
        Optional ID of the target object.
    send_email : bool
        If True, queue an email (subject to user preference).
    send_ws : bool
        If True, send a real-time WebSocket notification.
    """
    # Map the canonical notification_type to the legacy ``type`` field
    # for backward compatibility with existing consumers / tasks.
    legacy_type_map = {
        'critical_threat':    'critical_threat',
        'validation_request': 'validation_request',
        'incident_assigned':  'incident_assigned',
        'sandbox_complete':   'sandbox_complete',
        'prediction_alert':   'prediction_alert',
        'sla_warning':        'sla_warning',
        'report_ready':       'report_ready',
        'ml_drift':           'ml_drift',
        'system_alert':       'system_alert',
    }
    legacy_type = legacy_type_map.get(notification_type, 'system')

    severity_map = {
        'critical_threat':    'critical',
        'validation_request': 'warning',
        'incident_assigned':  'info',
        'sandbox_complete':   'success',
        'prediction_alert':   'warning',
        'sla_warning':        'critical',
        'report_ready':       'success',
        'ml_drift':           'warning',
        'system_alert':       'critical',
    }
    severity = severity_map.get(notification_type, 'info')

    # Create DB record
    notif = Notification.objects.create(
        user_id=user_id,
        notification_type=notification_type,
        type=legacy_type,
        title=title,
        message=message,
        severity=severity,
        link_page=link_page,
        link_id=link_id,
        related_object_id=link_id,
    )

    # Send WebSocket notification
    if send_ws:
        send_user_notification(user_id, {
            'id': str(notif.id),
            'type': notification_type.upper(),
            'title': title,
            'message': message,
            'page': link_page,
            'link_id': link_id,
            'time': 'just now',
            'read': False,
        })

    # Queue email if user has email notifications enabled
    if send_email:
        try:
            user = User.objects.get(id=user_id)
            if user.notifications_email:
                from apps.core.tasks import send_notification_email
                send_notification_email.delay(str(notif.id))
        except User.DoesNotExist:
            logger.warning(f"notify_user: user {user_id} does not exist")
        except Exception as exc:
            logger.error(f"notify_user: failed to queue email for user {user_id}: {exc}")

    return notif


def notify_validators(
    notification_type,
    title,
    message,
    link_page='',
    link_id='',
    send_email=True,
    send_ws=True,
):
    """
    Notify all validator and administrator users.
    """
    user_ids = User.objects.filter(
        role__in=['validator', 'administrator'],
        is_active=True,
    ).values_list('id', flat=True)

    notifs = []
    for user_id in user_ids:
        notif = notify_user(
            user_id, notification_type, title, message,
            link_page=link_page, link_id=link_id,
            send_email=send_email, send_ws=send_ws,
        )
        notifs.append(notif)

    return notifs


def notify_all_active(
    notification_type,
    title,
    message,
    link_page='',
    link_id='',
    send_email=True,
    send_ws=True,
):
    """
    Notify every active user.
    """
    user_ids = User.objects.filter(is_active=True).values_list('id', flat=True)

    notifs = []
    for user_id in user_ids:
        notif = notify_user(
            user_id, notification_type, title, message,
            link_page=link_page, link_id=link_id,
            send_email=send_email, send_ws=send_ws,
        )
        notifs.append(notif)

    return notifs
