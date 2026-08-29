import logging
from django.utils import timezone
from .models import (
    CashOutPrediction, 
    IntelligencePackage, 
    BankAlert, 
    ATMAlert, 
    LEADispatch, 
    DispatchAuditLog
)

logger = logging.getLogger('predictions.dispatch')

class BankAdapter:
    @staticmethod
    def send(alert: BankAlert) -> bool:
        import json
        payload_json = json.dumps(alert.to_payload(), indent=2)
        logger.info(f"[SIMULATED DELIVERY] BankAlert payload to {alert.target_institution}:\n{payload_json}")
        alert.status = 'DELIVERED'
        alert.save(update_fields=['status'])
        return True

class ATMAdapter:
    @staticmethod
    def send(alert: ATMAlert) -> bool:
        import json
        payload_json = json.dumps(alert.to_payload(), indent=2)
        logger.info(f"[SIMULATED DELIVERY] ATMAlert payload to {alert.target_network}:\n{payload_json}")
        alert.status = 'DELIVERED'
        alert.save(update_fields=['status'])
        return True

class LEAAdapter:
    @staticmethod
    def send(dispatch: LEADispatch) -> bool:
        import json
        payload_json = json.dumps(dispatch.to_payload(), indent=2)
        logger.info(f"[SIMULATED DELIVERY] LEADispatch payload to Nodal Officer at {dispatch.target_district}:\n{payload_json}")
        dispatch.status = 'ACKNOWLEDGED'
        dispatch.acknowledged_at = timezone.now()
        dispatch.save(update_fields=['status', 'acknowledged_at'])
        return True

from django.db import transaction

@transaction.atomic
def dispatch_intelligence(prediction: CashOutPrediction, actor=None) -> IntelligencePackage:
    if prediction.outcome == 'NEEDS_REVIEW' and not actor:
        raise ValueError("Cannot auto-dispatch a NEEDS_REVIEW prediction.")

    existing_pkg = IntelligencePackage.objects.filter(prediction=prediction).first()
    if existing_pkg:
        return existing_pkg

    complaint = prediction.complaint
    package = IntelligencePackage.objects.create(
        prediction=prediction,
        complaint=complaint,
        status='DISPATCHED'
    )

    DispatchAuditLog.objects.create(
        package=package,
        actor=actor,
        action='PACKAGE_CREATED',
        details='Intelligence package generated.'
    )

    # Dispatch to transaction banks/ATMs
    hops = list(complaint.transaction_hops.all())
    for hop in hops:
        bank_alert = BankAlert.objects.create(
            package=package,
            target_institution=hop.to_bank or 'Unknown Bank',
            status='SENT'
        )
        BankAdapter.send(bank_alert)
        DispatchAuditLog.objects.create(
            package=package, actor=actor, action='BANK_ALERT_SENT',
            details=f'Alert sent to {bank_alert.target_institution}'
        )

        # ATM Alert if it's the final hop or potentially cashout point
        if hop.hop_number == len(hops):
            atm_alert = ATMAlert.objects.create(
                package=package,
                target_network=hop.to_bank or 'Unknown ATM Network',
                status='SENT'
            )
            ATMAdapter.send(atm_alert)
            DispatchAuditLog.objects.create(
                package=package, actor=actor, action='ATM_ALERT_SENT',
                details=f'Alert sent to ATM network: {atm_alert.target_network}'
            )

    # Dispatch to predicted district LEA
    target_district = prediction.predicted_zone_name
    # Assuming cross-jurisdiction target
    lea_dispatch = LEADispatch.objects.create(
        package=package,
        target_district=target_district,
        status='SENT'
    )
    LEAAdapter.send(lea_dispatch)
    DispatchAuditLog.objects.create(
        package=package, actor=actor, action='LEA_DISPATCH_SENT',
        details=f'Alert sent to Nodal Officer at {target_district}'
    )

    return package
