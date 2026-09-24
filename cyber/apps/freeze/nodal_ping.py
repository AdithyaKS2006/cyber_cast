import logging
from django.conf import settings
from django.core.mail import send_mail
from apps.freeze.nodal_registry import get_nodal_officer

logger = logging.getLogger('crimecast.freeze')


def ping_nodal_officer(freeze_request) -> bool:
    """
    Dispatches an emergency alert notification email to the target bank's Nodal Officer
    requesting immediate administrative debit freeze under Section 106 & Section 94 BNSS 2023 / BSA 2023.
    """
    ifsc = freeze_request.target_bank_ifsc or ""
    officer = get_nodal_officer(ifsc)

    # 2. Check if email is configured
    if not officer.get("email"):
        logger.warning(
            "No registered Nodal Officer email found for IFSC prefix '%s' (Account: %s). Direct ping skipped.",
            ifsc[:4], freeze_request.target_account
        )
        return False

    # Extract reference numbers and telemetry
    alert_ref = "N/A"
    fraud_score = "N/A"
    if freeze_request.proactive_alert:
        alert_ref = freeze_request.proactive_alert.alert_id
        fraud_score = f"{freeze_request.proactive_alert.fraud_score:.2f}"
    elif freeze_request.complaint:
        alert_ref = getattr(freeze_request.complaint, 'acknowledgement_number', str(freeze_request.complaint.id))

    # 3. Compose email subject & body using PRD template
    subject = f"[URGENT] CRIMECAST FINANCIAL INTERCEPTION ORDER - FREEZE REQ #{freeze_request.id}"

    body = f"""URGENT LEGAL NOTICE: ACCOUNT FREEZE DIRECTIVE
CrimeCast Proactive Financial Interception Engine
Statutory Authority: Section 106 & Section 94 Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023
Digital Evidence Standard: Section 63 Bharatiya Sakshya Adhiniyam (BSA), 2023
Privacy Compliance: DPDP Act 2023 Section 4(d)

Freeze Request ID: {freeze_request.id}
I4C Reference: {freeze_request.i4c_freeze_id or 'PENDING / DIRECT_PING'}
Alert Reference: {alert_ref}

TARGET DETAILS:
Account Number: {freeze_request.target_account}
IFSC Code: {freeze_request.target_bank_ifsc}
Bank Name: {officer['name']}
Amount to Freeze: INR {freeze_request.freeze_amount:,.2f}

INTELLIGENCE & RISK TELEMETRY:
Fraud Score: {fraud_score}
Estimated Cash-out Window Remaining: {freeze_request.cash_out_eta_minutes} Minutes

ACTION REQUIRED:
Please immediately freeze all debit transactions on the subject account under Section 106 and Section 94 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 read with Section 66D IT Act and BSA 2023.
Confirmation of compliance should be transmitted back to the CrimeCast Nodal Integration Portal.
"""


    mock_mode = getattr(settings, 'NODAL_PING_MOCK_MODE', True)

    # 5. Mock mode handling
    if mock_mode:
        logger.info(
            "NODAL_PING_MOCK_MODE is True. Simulated Nodal Officer Email Ping to %s (%s):\nSubject: %s\n%s",
            officer['name'], officer['email'], subject, body
        )
        return True

    # 4. Dispatch real email via Django send_mail
    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'alerts@crimecast.gov.in')
        send_mail(
            subject=subject,
            message=body,
            from_email=from_email,
            recipient_list=[officer['email']],
            fail_silently=False,
        )
        logger.info("Successfully dispatched Nodal Officer alert email to %s for Freeze Request %s", officer['email'], freeze_request.id)
        return True
    except Exception as e:
        logger.error("Failed to send Nodal Officer alert email to %s: %s", officer['email'], e, exc_info=True)
        return False
