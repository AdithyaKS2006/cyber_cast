from django.contrib import admin
from .models import CashOutPrediction, PredictionAlert

@admin.register(CashOutPrediction)
class CashOutPredictionAdmin(admin.ModelAdmin):
    list_display = ('complaint', 'predicted_zone_name', 'probability', 'eta_hours', 'rank', 'outcome', 'created_at')
    list_filter = ('outcome', 'rank', 'created_at')
    search_fields = ('predicted_zone_name', 'complaint__complaint_number')

@admin.register(PredictionAlert)
class PredictionAlertAdmin(admin.ModelAdmin):
    list_display = ('prediction', 'officer', 'alert_type', 'status', 'sent_at')
    list_filter = ('status', 'alert_type', 'sent_at')
    search_fields = ('officer__username', 'prediction__id')
