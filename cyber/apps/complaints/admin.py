from django.contrib import admin
from .models import Complaint, TransactionHop

@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ('complaint_number', 'victim_name', 'fraud_amount', 'status', 'priority', 'created_at')
    list_filter = ('status', 'priority', 'fraud_method', 'created_at')
    search_fields = ('complaint_number', 'victim_name', 'suspect_account_number')
    readonly_fields = ('complaint_number', 'created_at', 'updated_at')

@admin.register(TransactionHop)
class TransactionHopAdmin(admin.ModelAdmin):
    list_display = ('complaint', 'hop_number', 'amount', 'from_bank', 'to_bank', 'is_mule_flagged')
    list_filter = ('is_mule_flagged', 'created_at')
    search_fields = ('from_account', 'to_account', 'complaint__complaint_number')
