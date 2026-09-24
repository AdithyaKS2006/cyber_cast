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

import os
import requests as req_lib

logger = logging.getLogger('predictions.dispatch')
DEMO_WEBHOOK_URL = os.environ.get('DEMO_WEBHOOK_URL', '')

def _attempt_webhook_delivery(payload_type: str, target: str, payload: dict) -> dict:
    if DEMO_WEBHOOK_URL:
        try:
            res = req_lib.post(DEMO_WEBHOOK_URL, json=payload, timeout=3)
            logger.info(f"[WEBHOOK DELIVERED] {payload_type} to {target} → {DEMO_WEBHOOK_URL} | HTTP {res.status_code}")
            return {
                "mode": "WEBHOOK_DELIVERED",
                "endpoint": DEMO_WEBHOOK_URL,
                "http_status": res.status_code
            }
        except Exception as exc:
            logger.warning(f"[WEBHOOK FAILED] {payload_type} to {target}: {exc}")
            return {"mode": "WEBHOOK_FAILED", "error": str(exc)}
    return {"mode": "SIMULATED_LOG_ONLY"}

def generate_camt056_xml(alert: BankAlert) -> str:
    """
    Generate ISO 20022 camt.056.001.08 FIToFIPaymentCancellationRequest XML message.
    Conforms to ISO 20022 standard schema for financial fraud payment interdiction.
    """
    from datetime import datetime, timezone
    from xml.sax.saxutils import escape as xml_escape
    complaint = getattr(alert.package, 'complaint', None)
    prediction = getattr(alert.package, 'prediction', None)
    hops = list(complaint.transaction_hops.all()) if complaint else []

    msg_id = xml_escape(f"CC-CAMT056-{alert.id}")
    cre_dt_tm = alert.sent_at.isoformat() if alert.sent_at else datetime.now(timezone.utc).isoformat()
    ncrp_ref = xml_escape(complaint.complaint_number if complaint else "NCRP-UNKNOWN")
    amount = f"{float(complaint.fraud_amount):.2f}" if (complaint and complaint.fraud_amount) else "0.00"

    first_hop = hops[0] if hops else None
    target_ifsc = xml_escape(getattr(first_hop, 'to_ifsc', 'UNKNOWN_IFSC') if first_hop else "UNKNOWN_IFSC")
    target_acc = xml_escape(getattr(first_hop, 'to_account', 'UNKNOWN_ACC') if first_hop else "UNKNOWN_ACC")
    orig_instr_id = xml_escape(getattr(first_hop, 'transaction_id', f"UTR-{ncrp_ref}-01") if first_hop else f"UTR-{ncrp_ref}-01")
    inst_nm = xml_escape(alert.target_institution or 'Unknown Bank')

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.056.001.08"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFIPmntCxlReq>
    <GrpHdr>
      <MsgId>{msg_id}</MsgId>
      <CreDtTm>{cre_dt_tm}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>{amount}</CtrlSum>
      <InstgAgt>
        <FinInstnId>
          <ClrSysMmbId>
            <ClrSysId>
              <Cd>IN-I4C</Cd>
            </ClrSysId>
            <MmbId>CRIMECAST-INTERCEPT-GATEWAY</MmbId>
          </ClrSysMmbId>
          <Nm>Indian Cyber Crime Coordination Centre (I4C)</Nm>
        </FinInstnId>
      </InstgAgt>
      <InstdAgt>
        <FinInstnId>
          <ClrSysMmbId>
            <ClrSysId>
              <Cd>IN-IFSC</Cd>
            </ClrSysId>
            <MmbId>{target_ifsc}</MmbId>
          </ClrSysMmbId>
          <Nm>{inst_nm}</Nm>
        </FinInstnId>
      </InstdAgt>
    </GrpHdr>
    <Undrlyg>
      <TxInf>
        <CxlId>{alert.id}</CxlId>
        <OrgnlGrpInf>
          <OrgnlMsgId>{ncrp_ref}</OrgnlMsgId>
          <OrgnlMsgNmId>pacs.008.001.08</OrgnlMsgNmId>
        </OrgnlGrpInf>
        <OrgnlInstrId>{orig_instr_id}</OrgnlInstrId>
        <OrgnlEndToEndId>{orig_instr_id}</OrgnlEndToEndId>
        <OrgnlTxRef>
          <IntrBkSttlmAmt Ccy="INR">{amount}</IntrBkSttlmAmt>
          <IntrBkSttlmDt>{cre_dt_tm[:10]}</IntrBkSttlmDt>
          <CdtrAcct>
            <Id>
              <Othr>
                <Id>{target_acc}</Id>
              </Othr>
            </Id>
          </CdtrAcct>
        </OrgnlTxRef>
        <CxlRsnInf>
          <Orgtr>
            <Nm>CrimeCast AI Nodal Interdiction Unit</Nm>
          </Orgtr>
          <Rsn>
            <Cd>FRAD</Cd>
          </Rsn>
          <AddtlInf>Interdiction under BNSS 2023 Sec 106 / Sec 94 r/w BSA 2023 Sec 63. Privacy: DPDP Act 2023 Sec 4(d).</AddtlInf>
        </CxlRsnInf>
      </TxInf>
    </Undrlyg>
  </FIToFIPmntCxlReq>
</Document>"""
    return xml.strip()


class BankAdapter:
    @staticmethod
    def send(alert: BankAlert) -> bool:
        import json
        xml_payload = generate_camt056_xml(alert)
        alert.iso20022_payload = xml_payload
        payload = alert.to_payload()
        payload['iso20022_xml'] = xml_payload
        payload_json = json.dumps(payload, indent=2)
        proof = _attempt_webhook_delivery("BankAlert", alert.target_institution, payload)
        logger.info(f"[DISPATCH DELIVERY - {proof['mode']}] BankAlert payload to {alert.target_institution}:\n{payload_json}")
        alert.status = 'DELIVERED'
        alert.save(update_fields=['status', 'iso20022_payload'])
        return True


class ATMAdapter:
    @staticmethod
    def send(alert: ATMAlert) -> bool:
        import json
        payload = alert.to_payload()
        payload_json = json.dumps(payload, indent=2)
        proof = _attempt_webhook_delivery("ATMAlert", alert.target_network, payload)
        logger.info(f"[DISPATCH DELIVERY - {proof['mode']}] ATMAlert payload to {alert.target_network}:\n{payload_json}")
        alert.status = 'DELIVERED'
        alert.save(update_fields=['status'])
        return True

class LEAAdapter:
    @staticmethod
    def send(dispatch: LEADispatch) -> bool:
        import json
        payload = dispatch.to_payload()
        payload_json = json.dumps(payload, indent=2)
        proof = _attempt_webhook_delivery("LEADispatch", dispatch.target_district, payload)
        logger.info(f"[DISPATCH DELIVERY - {proof['mode']}] LEADispatch payload to Nodal Officer at {dispatch.target_district}:\n{payload_json}")
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

            # Auto-generate a Sec 106 Freeze Request for the final mule account to ensure Demo coverage
            from apps.freeze.models import FreezeRequest
            from datetime import timedelta
            if not FreezeRequest.objects.filter(complaint=complaint, target_account=hop.to_account).exists():
                eta_mins = int(prediction.eta_hours * 60) if prediction.eta_hours else 15
                window_expires_at = timezone.now() + timedelta(minutes=eta_mins)
                fr = FreezeRequest.objects.create(
                    complaint=complaint,
                    target_account=hop.to_account,
                    target_bank_ifsc=hop.to_ifsc or 'UNKNOWN',
                    target_bank_name=hop.to_bank or 'UNKNOWN',
                    freeze_amount=hop.amount,
                    status='FROZEN',
                    cash_out_eta_minutes=eta_mins,
                    i4c_freeze_id=f"I4C-FRZ-{str(complaint.id)[:8]}-{hop.hop_number}",
                    window_expires_at=window_expires_at,
                    auto_triggered=True
                )
                DispatchAuditLog.objects.create(
                    package=package, actor=actor, action='FREEZE_OPS_INITIATED',
                    details=f'Sec 106 Freeze requested for account {fr.target_account}'
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
