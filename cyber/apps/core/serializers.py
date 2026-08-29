from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'type', 'title', 'message',
            'severity', 'link_page', 'link_id', 'read',
            'email_sent', 'created_at',
        ]
        read_only_fields = [
            'id', 'notification_type', 'type', 'title', 'message',
            'severity', 'link_page', 'link_id', 'email_sent', 'created_at',
        ]

    def get_type(self, obj):
        return obj.effective_type
