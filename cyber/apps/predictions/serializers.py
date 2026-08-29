from rest_framework import serializers
from .models import CashOutPrediction, PredictionAlert, IntelligencePackage, BankAlert, ATMAlert, LEADispatch, DispatchAuditLog
from apps.complaints.serializers import ComplaintListSerializer

class DispatchAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DispatchAuditLog
        fields = '__all__'

class BankAlertSerializer(serializers.ModelSerializer):
    payload = serializers.SerializerMethodField()
    class Meta:
        model = BankAlert
        fields = '__all__'
    
    def get_payload(self, obj):
        return obj.to_payload()

class ATMAlertSerializer(serializers.ModelSerializer):
    payload = serializers.SerializerMethodField()
    class Meta:
        model = ATMAlert
        fields = '__all__'
        
    def get_payload(self, obj):
        return obj.to_payload()

class LEADispatchSerializer(serializers.ModelSerializer):
    payload = serializers.SerializerMethodField()
    complaint_number = serializers.SerializerMethodField()
    fraud_amount = serializers.SerializerMethodField()
    predicted_zone_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LEADispatch
        fields = '__all__'
        
    def get_payload(self, obj):
        return obj.to_payload()

    def get_complaint_number(self, obj):
        if obj.package and hasattr(obj.package, 'complaint') and obj.package.complaint:
            return obj.package.complaint.complaint_number
        return None
        
    def get_fraud_amount(self, obj):
        if obj.package and hasattr(obj.package, 'complaint') and obj.package.complaint:
            return float(obj.package.complaint.fraud_amount)
        return 0.0

    def get_predicted_zone_name(self, obj):
        if obj.package and hasattr(obj.package, 'prediction') and obj.package.prediction:
            return obj.package.prediction.predicted_zone_name
        return None


class IntelligencePackageSerializer(serializers.ModelSerializer):
    audit_logs = DispatchAuditLogSerializer(many=True, read_only=True)
    bank_alerts = BankAlertSerializer(many=True, read_only=True)
    atm_alerts = ATMAlertSerializer(many=True, read_only=True)
    lea_dispatches = LEADispatchSerializer(many=True, read_only=True)

    class Meta:
        model = IntelligencePackage
        fields = '__all__'

class PredictionSerializer(serializers.ModelSerializer):
    complaint_summary = ComplaintListSerializer(source='complaint', read_only=True)
    
    class Meta:
        model = CashOutPrediction
        exclude = ['feature_importance_json']
        read_only_fields = ['id', 'created_at', 'updated_at']

class PredictionDetailSerializer(serializers.ModelSerializer):
    complaint_summary = ComplaintListSerializer(source='complaint', read_only=True)
    intelligence_package = serializers.SerializerMethodField()
    
    class Meta:
        model = CashOutPrediction
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_intelligence_package(self, obj):
        try:
            if hasattr(obj, 'intelligence_package') and obj.intelligence_package:
                return IntelligencePackageSerializer(obj.intelligence_package).data
        except Exception:
            pass
        return None

class AlertSerializer(serializers.ModelSerializer):
    # Flatten the related prediction + complaint so the frontend alert cards
    # can render zone / probability / amount without a second round-trip.
    complaint_number    = serializers.SerializerMethodField()
    fraud_amount        = serializers.SerializerMethodField()
    predicted_zone_name = serializers.SerializerMethodField()
    probability         = serializers.SerializerMethodField()
    eta_hours           = serializers.SerializerMethodField()
    outcome             = serializers.SerializerMethodField()

    class Meta:
        model = PredictionAlert
        fields = '__all__'
        read_only_fields = ['id', 'sent_at']

    def get_complaint_number(self, obj):
        return obj.prediction.complaint.complaint_number if obj.prediction_id and obj.prediction.complaint_id else None

    def get_fraud_amount(self, obj):
        return float(obj.prediction.complaint.fraud_amount) if obj.prediction_id and obj.prediction.complaint_id else 0

    def get_predicted_zone_name(self, obj):
        return obj.prediction.predicted_zone_name if obj.prediction_id else None

    def get_probability(self, obj):
        return obj.prediction.probability if obj.prediction_id else 0

    def get_eta_hours(self, obj):
        return obj.prediction.eta_hours if obj.prediction_id else 0

    def get_outcome(self, obj):
        return obj.prediction.outcome if obj.prediction_id else None
