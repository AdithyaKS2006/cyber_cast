from rest_framework import serializers
from apps.freeze.models import FreezeRequest


class FreezeRequestSerializer(serializers.ModelSerializer):
    alert_ref = serializers.SerializerMethodField()

    class Meta:
        model = FreezeRequest
        fields = [
            'id', 'proactive_alert', 'complaint', 'alert_ref', 'target_account',
            'target_bank_ifsc', 'target_bank_name', 'freeze_amount', 'i4c_freeze_id',
            'status', 'auto_triggered', 'failure_reason', 'cash_out_eta_minutes',
            'window_expires_at', 'requested_at', 'resolved_at'
        ]

    def get_alert_ref(self, obj):
        if obj.proactive_alert:
            return obj.proactive_alert.alert_id
        if obj.complaint:
            return getattr(obj.complaint, 'complaint_number', str(obj.complaint.id))
        return str(obj.id)[:8]
