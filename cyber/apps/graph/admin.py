from django.contrib import admin
from apps.graph.models import MuleNode, MuleEdge


@admin.register(MuleNode)
class MuleNodeAdmin(admin.ModelAdmin):
    list_display = ('account_hash', 'bank_ifsc', 'node_type', 'risk_score', 'freeze_status', 'total_volume', 'transaction_count', 'last_active')
    list_filter = ('node_type', 'freeze_status', 'bank_ifsc')
    search_fields = ('account_hash', 'bank_ifsc', 'bank_name')
    ordering = ('-risk_score', '-total_volume')


@admin.register(MuleEdge)
class MuleEdgeAdmin(admin.ModelAdmin):
    list_display = ('id', 'source_node', 'target_node', 'amount', 'transaction_ref', 'hop_number', 'timestamp')
    list_filter = ('hop_number', 'timestamp')
    search_fields = ('transaction_ref', 'source_node__account_hash', 'target_node__account_hash')
    ordering = ('-timestamp',)
