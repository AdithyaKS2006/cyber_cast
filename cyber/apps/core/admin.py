from django.contrib import admin
from .models import Notification, APIKey, PlatformPermission


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'notification_type', 'severity', 'read', 'email_sent', 'created_at']
    list_filter = ['notification_type', 'severity', 'read', 'email_sent', 'created_at']
    search_fields = ['title', 'message', 'user__username']
    list_per_page = 50
    raw_id_fields = ['user']
    date_hierarchy = 'created_at'

    actions = ['mark_read', 'mark_unread', 'send_email']

    @admin.action(description='Mark selected as read')
    def mark_read(self, request, queryset):
        queryset.update(read=True)

    @admin.action(description='Mark selected as unread')
    def mark_unread(self, request, queryset):
        queryset.update(read=False)

    @admin.action(description='Queue email for selected')
    def send_email(self, request, queryset):
        from apps.core.tasks import send_notification_email
        for notif in queryset.filter(email_sent=False):
            send_notification_email.delay(str(notif.id))
        self.message_user(request, f"Email queued for {queryset.count()} notifications.")


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'user__username', 'key']
    raw_id_fields = ['user']
    readonly_fields = ['key']


@admin.register(PlatformPermission)
class PlatformPermissionAdmin(admin.ModelAdmin):
    list_display = ['pk', 'allow_registration', 'require_invitation', 'updated_at']
    list_display_links = ['pk']
    list_editable = ['allow_registration', 'require_invitation']

    def has_add_permission(self, request):
        return not PlatformPermission.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def get_list_display(self, request):
        return ['allow_registration', 'require_invitation', 'updated_at']
