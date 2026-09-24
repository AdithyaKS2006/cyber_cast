from django.contrib import admin
from apps.ingest.models import ProactiveAlert

@admin.register(ProactiveAlert)
class ProactiveAlertAdmin(admin.ModelAdmin):
    list_display = ('alert_id', 'source', 'from_account', 'to_account', 'amount', 'fraud_score', 'status', 'received_at')
    list_filter = ('source', 'status', 'received_at')
    search_fields = ('alert_id', 'from_account', 'to_account', 'from_bank_ifsc', 'to_bank_ifsc')
    readonly_fields = ('id', 'received_at')
