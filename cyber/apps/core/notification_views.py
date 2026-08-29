from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from django.db.models import Q
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListCreateAPIView):
    """
    List the authenticated user's notifications.
    POST is not supported here — notifications are created internally
    via the notification service.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        unread_only = self.request.query_params.get('unread')
        if unread_only == 'true':
            qs = qs.filter(read=False)
        return qs


class UnreadCountView(generics.GenericAPIView):
    """Return the count of unread notifications for the current user."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            user=request.user, read=False
        ).count()
        return Response({'unread_count': count, 'unread_type': 'notification'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_notification_read(request, pk):
    """Mark a single notification as read."""
    try:
        notif = Notification.objects.get(id=pk, user=request.user)
    except Notification.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    notif.read = True
    notif.save(update_fields=['read'])
    return Response({'status': 'read'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_all_notifications_read(request):
    """Mark all of the user's notifications as read."""
    Notification.objects.filter(
        user=request.user, read=False
    ).update(read=True)
    return Response({'status': 'all_read'})


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_notification(request, pk):
    """Delete a notification owned by the current user."""
    try:
        notif = Notification.objects.get(id=pk, user=request.user)
    except Notification.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    notif.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
