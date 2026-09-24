from django.contrib import admin
from apps.freeze.models import FreezeRequest


@admin.register(FreezeRequest)
class FreezeRequestAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'target_account',
        'target_bank_ifsc',
        'freeze_amount',
        'status',
        'auto_triggered',
        'i4c_freeze_id',
        'requested_at'
    )
    list_filter = ('status', 'auto_triggered', 'requested_at')
    search_fields = ('id', 'target_account', 'target_bank_ifsc', 'i4c_freeze_id')
    readonly_fields = ('id', 'requested_at')
