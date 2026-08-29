from django.urls import path
from .admin_views import SystemHealthView, UserToggleStatusView, APIKeyViewSet, APIKeyDetailView
from .notification_views import (
    NotificationListView, UnreadCountView,
    mark_notification_read, mark_all_notifications_read, delete_notification,
)

urlpatterns = [
    # System health & admin
    path('health/', SystemHealthView.as_view(), name='system_health'),
    path('users/<uuid:pk>/toggle-status/', UserToggleStatusView.as_view(), name='user_toggle_status'),
    path('api-keys/', APIKeyViewSet.as_view(), name='api_keys_list_create'),
    path('api-keys/<uuid:pk>/', APIKeyDetailView.as_view(), name='api_keys_detail'),

    # Notifications
    path('notifications/', NotificationListView.as_view(), name='notification_list'),
    path('notifications/unread-count/', UnreadCountView.as_view(), name='notification_unread_count'),
    path('notifications/mark-all-read/', mark_all_notifications_read, name='notification_mark_all_read'),
    path('notifications/<uuid:pk>/mark-read/', mark_notification_read, name='notification_mark_read'),
    path('notifications/<uuid:pk>/', delete_notification, name='notification_delete'),
]
