import uuid
from django.db import models
from apps.users.models import User
from apps.complaints.models import Complaint

class CashOutPrediction(models.Model):
    OUTCOME_CHOICES = [
        ('PENDING', 'Pending'),
        ('NEEDS_REVIEW', 'Needs Review'),
        ('INTERCEPTED', 'Intercepted'),
        ('MISSED', 'Missed'),
        ('FALSE_ALARM', 'False Alarm'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='predictions')
    
    predicted_zone_name = models.CharField(max_length=255)
    predicted_lat = models.FloatField()
    predicted_lon = models.FloatField()
    
    probability = models.FloatField()
    eta_hours = models.FloatField()
    rank = models.IntegerField(default=1)
    
    model_version = models.CharField(max_length=50)
    feature_importance_json = models.JSONField(default=dict, blank=True)
    
    outcome = models.CharField(max_length=50, choices=OUTCOME_CHOICES, default='PENDING')
    gemini_brief = models.TextField(blank=True, default='')   # AI investigation narrative
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cash_out_predictions'
        ordering = ['complaint', 'rank']

    def __str__(self):
        return f"Prediction {self.rank} for {self.complaint.complaint_number} - {self.predicted_zone_name}"

class PredictionAlert(models.Model):
    ALERT_TYPE_CHOICES = [
        ('WEBSOCKET', 'WebSocket'),
        ('SMS', 'SMS'),
        ('EMAIL', 'Email'),
    ]
    
    STATUS_CHOICES = [
        ('SENT', 'Sent'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('DISPATCHED', 'Dispatched'),
        ('EXPIRED', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prediction = models.ForeignKey(CashOutPrediction, on_delete=models.CASCADE, related_name='alerts')
    officer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alerts')
    
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPE_CHOICES)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='SENT')
    
    sent_at = models.DateTimeField(auto_now_add=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'prediction_alerts'
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.alert_type} Alert for {self.prediction.id} to {self.officer.username}"


# ── Phase 1: Actionable Intelligence Models ──────────────────────────────────

class IntelligencePackage(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('DISPATCHED', 'Dispatched'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('FAILED', 'Failed'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prediction = models.OneToOneField(CashOutPrediction, on_delete=models.CASCADE, related_name='intelligence_package')
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='intelligence_packages')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'intelligence_packages'

    def __str__(self):
        return f"Intel Package {self.id} for Prediction {self.prediction.id}"


class BankAlert(models.Model):
    STATUS_CHOICES = [
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('ERROR', 'Error'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package = models.ForeignKey(IntelligencePackage, on_delete=models.CASCADE, related_name='bank_alerts')
    target_institution = models.CharField(max_length=255)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='SENT')
    sent_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bank_alerts'

    def to_payload(self):
        from django.conf import settings
        complaint = getattr(self.package, 'complaint', None)
        prediction = getattr(self.package, 'prediction', None)
        hops = list(complaint.transaction_hops.all()) if complaint else []
        return {
            "header": {
                "specification": "I4C-NCRP-FUND-FREEZE-v2.1",
                "message_id": str(self.id),
                "timestamp": self.sent_at.isoformat() if self.sent_at else None,
                "urgency": "IMMEDIATE",
                "delivery_mode": "GATEWAY_INTEGRATION_READY",
                "integration_note": (
                    "Payload formatted per I4C-NCRP-FUND-FREEZE-v2.1. "
                    "Production delivery via CFCFRMS gateway requires I4C API onboarding."
                ),
            },
            "cfcfrms_mapping": {
                "ncrp_ack_number": complaint.complaint_number if complaint else "UNKNOWN",
                "target_financial_institution": self.target_institution,
                "ifsc_code": getattr(hops[0], 'to_ifsc', 'UNKNOWN_IFSC') if hops else "UNKNOWN",
                "beneficiary_account": getattr(hops[0], 'to_account', 'UNKNOWN_ACC') if hops else "UNKNOWN",
                "utr_rrn_reference": getattr(hops[0], 'transaction_id', 'UNKNOWN_UTR') if hops else "UNKNOWN",
                "disputed_amount_inr": float(complaint.fraud_amount) if (complaint and complaint.fraud_amount) else 0.0,
                "freeze_action": "FREEZE_BENEFICIARY_ACCOUNT_SEC_91_CRPC",
                "predicted_cashout_zone": prediction.predicted_zone_name if prediction else "Unknown Zone",
                "eta_window_hours": prediction.eta_hours if prediction else 0
            },
            "target_institution": self.target_institution,
            "victim_reference": complaint.complaint_number if complaint else "UNKNOWN",
            "suspect_chain": [
                {
                    "hop_number": getattr(hop, 'hop_number', 1),
                    "from_bank": getattr(hop, 'from_bank', 'Unknown'),
                    "to_bank": getattr(hop, 'to_bank', 'Unknown'),
                    "amount": float(hop.amount) if getattr(hop, 'amount', None) is not None else 0.0,
                    "timestamp": hop.timestamp.isoformat() if getattr(hop, 'timestamp', None) else None
                }
                for hop in hops
            ],
            "predicted_cashout_zone": prediction.predicted_zone_name if prediction else "Unknown Zone",
            "eta_window_hours": prediction.eta_hours if prediction else 0,
            "requested_action": "FREEZE_ACCOUNT_TEMPORARY",
            "legal_basis": "Section 91 CrPC / Cyber Financial Fraud Interdiction"
        }

class ATMAlert(models.Model):
    STATUS_CHOICES = [
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('ERROR', 'Error'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package = models.ForeignKey(IntelligencePackage, on_delete=models.CASCADE, related_name='atm_alerts')
    target_network = models.CharField(max_length=255)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='SENT')
    sent_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'atm_alerts'

    def to_payload(self):
        from django.conf import settings
        complaint = getattr(self.package, 'complaint', None)
        prediction = getattr(self.package, 'prediction', None)
        return {
            "header": {
                "specification": "I4C-NCRP-FUND-FREEZE-v2.1",
                "message_id": str(self.id),
                "timestamp": self.sent_at.isoformat() if self.sent_at else None,
                "urgency": "HIGH",
                "delivery_mode": "GATEWAY_INTEGRATION_READY",
                "integration_note": (
                    "Payload formatted per NPCI ATM Switch Network alerting spec. "
                    "Production delivery requires NPCI nodal onboarding."
                ),
            },
            "cfcfrms_mapping": {
                "ncrp_ack_number": complaint.complaint_number if complaint else "UNKNOWN",
                "target_switch_network": self.target_network,
                "target_cashout_district": prediction.predicted_zone_name if prediction else "Unknown Zone",
                "withdrawal_flag_action": "FLAG_SUSPICIOUS_ATM_CASH_OUT",
                "eta_window_hours": prediction.eta_hours if prediction else 0
            },
            "target_network": self.target_network,
            "victim_reference": complaint.complaint_number if complaint else "UNKNOWN",
            "predicted_cashout_zone": prediction.predicted_zone_name if prediction else "Unknown Zone",
            "eta_window_hours": prediction.eta_hours if prediction else 0,
            "requested_action": "FLAG_SUSPICIOUS_WITHDRAWAL"
        }

class LEADispatch(models.Model):
    STATUS_CHOICES = [
        ('SENT', 'Sent'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('RESOLVED', 'Resolved'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package = models.ForeignKey(IntelligencePackage, on_delete=models.CASCADE, related_name='lea_dispatches')
    target_officer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='received_lea_dispatches')
    target_district = models.CharField(max_length=255)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='SENT')
    sent_at = models.DateTimeField(auto_now_add=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'lea_dispatches'

    def to_payload(self):
        from django.conf import settings
        complaint = getattr(self.package, 'complaint', None)
        prediction = getattr(self.package, 'prediction', None)
        amount_str = f"{float(complaint.fraud_amount):,.2f}" if (complaint and complaint.fraud_amount is not None) else "0.00"
        hops_count = complaint.transaction_hops.count() if complaint else 0
        return {
            "header": {
                "specification": "I4C-LEA-DISPATCH-v3.0",
                "message_id": str(self.id),
                "timestamp": self.sent_at.isoformat() if self.sent_at else None,
                "urgency": "CRITICAL",
                "delivery_mode": "GATEWAY_INTEGRATION_READY",
                "integration_note": (
                    "Payload formatted per I4C-LEA-DISPATCH-v3.0 spec. "
                    "Production delivery via Cross-Jurisdiction LEA Nodal Dispatch requires MHA onboarding."
                ),
            },
            "cfcfrms_mapping": {
                "ncrp_acknowledgement_no": complaint.complaint_number if complaint else "UNKNOWN",
                "origin_victim_district": complaint.victim_district if complaint else "UNKNOWN",
                "origin_victim_state": complaint.victim_state if complaint else "UNKNOWN",
                "target_interdiction_district": self.target_district,
                "target_nodal_agency": f"{self.target_district} District Cyber Cell",
                "total_defrauded_amount_inr": float(complaint.fraud_amount) if (complaint and complaint.fraud_amount) else 0.0,
                "layering_hop_depth": hops_count,
                "predicted_cashout_zone": prediction.predicted_zone_name if prediction else "Unknown Zone",
                "prediction_confidence": getattr(prediction, 'confidence_score', getattr(prediction, 'probability', 0.0)) if prediction else 0.0,
                "eta_window_hours": prediction.eta_hours if prediction else 0,
                "dispatch_action": "INTERCEPT_FIELD_CASH_OUT_HOTSPOT",
                "statutory_basis": "Information Technology Act Sec 66D / BNSS Sec 94"
            },
            "target_district": self.target_district,
            "victim_reference": complaint.complaint_number if complaint else "UNKNOWN",
            "suspect_chain_summary": f"Total Amount: {amount_str}, Hops: {hops_count}",
            "predicted_cashout_zone": prediction.predicted_zone_name if prediction else "Unknown Zone",
            "confidence_score": getattr(prediction, 'confidence_score', getattr(prediction, 'probability', 0.0)) if prediction else 0.0,
            "eta_window_hours": prediction.eta_hours if prediction else 0,
            "requested_action": "INTERCEPT_CASH_OUT",
            "legal_basis": "Information Technology Act / BNS Financial Fraud"
        }

class DispatchAuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package = models.ForeignKey(IntelligencePackage, on_delete=models.CASCADE, related_name='audit_logs')
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='performed_dispatches')
    action = models.CharField(max_length=255)
    details = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'dispatch_audit_logs'
        ordering = ['-timestamp']


