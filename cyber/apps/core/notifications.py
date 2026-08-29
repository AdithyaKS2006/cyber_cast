from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()


def send_user_notification(user_id, notification_data: dict):
    """Send a real-time notification to a specific user"""
    group_name = f'user_{user_id}_notifications'
    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'notification',
                'data': notification_data,
            }
        )
    except Exception as e:
        logger.error(f"Failed to send WebSocket notification to user {user_id}: {e}")


def send_threat_feed_update(ioc_data: dict):
    """Broadcast new IoC to all threat feed viewers"""
    try:
        async_to_sync(channel_layer.group_send)(
            'threat_feed',
            {
                'type': 'new_threat',
                'data': ioc_data,
            }
        )
    except Exception as e:
        logger.error(f"Failed to broadcast threat feed update: {e}")


def send_dashboard_update(stats: dict):
    """Broadcast dashboard stats update"""
    try:
        async_to_sync(channel_layer.group_send)(
            'dashboard',
            {
                'type': 'dashboard_update',
                'data': stats,
            }
        )
    except Exception as e:
        logger.error(f"Failed to broadcast dashboard update: {e}")


def send_admin_notification(title: str, message: str, notification_type: str = 'INFO'):
    """Send notification to all admin users"""
    from apps.users.models import User
    admins = User.objects.filter(role='administrator', is_active=True).values_list('id', flat=True)
    for admin_id in admins:
        send_user_notification(admin_id, {
            'type': notification_type,
            'title': title,
            'message': message,
            'time': 'just now',
        })