import logging
from datetime import timedelta
from django.utils import timezone
from apps.freeze.models import FreezeRequest
from apps.freeze.i4c_client import I4CClient
from apps.freeze.nodal_ping import ping_nodal_officer

logger = logging.getLogger('crimecast.freeze')


def broadcast_freeze_event(event_type: str, data: dict):
    """
    Helper function to safely broadcast events to the 'freeze_ops' Channels group.
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'freeze_ops',
                {
                    'type': event_type,
                    'data': data
                }
            )
    except Exception as e:
        logger.warning(f"WebSocket broadcast error for freeze event {event_type}: {e}")


def evaluate_and_freeze(alert) -> FreezeRequest:
    """
    Evaluates rule engine criteria for a ProactiveAlert and automatically triggers an I4C account freeze
    if parameters satisfy high-confidence automated risk bounds. Always pings the target bank Nodal Officer.
    """
    score = float(alert.fraud_score)
    amount = float(alert.amount)

    # 1. Define freeze rules
    if amount > 500000:
        auto_freeze = False
        reason = f"Transaction amount ₹{amount:,.2f} exceeds auto-freeze threshold (₹500,000 max). Officer manual approval required."
    elif score >= 0.90 and amount <= 500000:
        auto_freeze = True
        reason = f"High confidence fraud score ({score:.2f} >= 0.90) and within amount threshold."
    elif score >= 0.75 and 50000 <= amount <= 500000:
        auto_freeze = True
        reason = f"Medium-high fraud score ({score:.2f} >= 0.75) and transaction amount (₹{amount:,.2f}) qualifies for auto-freeze."
    else:
        auto_freeze = False
        reason = f"Fraud score {score:.2f} or amount ₹{amount:,.2f} does not meet auto-freeze criteria."

    # 2. If auto_freeze is True: execute automated freeze workflow
    if auto_freeze:
        logger.info("Auto-freeze triggered for alert %s. Reason: %s", alert.alert_id, reason)
        window_expires_at = timezone.now() + timedelta(minutes=15)

        freeze_req = FreezeRequest.objects.create(
            proactive_alert=alert,
            target_account=alert.to_account,
            target_bank_ifsc=alert.to_bank_ifsc,
            target_bank_name="",
            freeze_amount=alert.amount,
            auto_triggered=True,
            cash_out_eta_minutes=15,
            window_expires_at=window_expires_at,
            status='PENDING'
        )

        # Broadcast freeze_requested
        broadcast_freeze_event('freeze_requested', {
            'freeze_id': str(freeze_req.id),
            'account': freeze_req.target_account,
            'amount': float(freeze_req.freeze_amount),
            'bank': freeze_req.target_bank_ifsc,
            'eta_minutes': freeze_req.cash_out_eta_minutes
        })

        # Check window expiration state
        minutes_remaining = int((freeze_req.window_expires_at - timezone.now()).total_seconds() / 60)
        if minutes_remaining <= 3:
            broadcast_freeze_event('window_expiring', {
                'freeze_id': str(freeze_req.id),
                'minutes_remaining': max(0, minutes_remaining)
            })

        i4c_client = I4CClient()
        api_response = i4c_client.request_freeze(
            account_number=alert.to_account,
            ifsc=alert.to_bank_ifsc,
            amount=float(alert.amount),
            complaint_ref=alert.alert_id
        )

        freeze_req.api_response_raw = api_response

        if api_response.get("status") == "FROZEN":
            freeze_req.status = "FROZEN"
            freeze_req.i4c_freeze_id = api_response.get("freeze_id", "")
            freeze_req.resolved_at = timezone.now()
            logger.info("Freeze order %s executed successfully via I4C. Freeze ID: %s", freeze_req.id, freeze_req.i4c_freeze_id)

            broadcast_freeze_event('freeze_confirmed', {
                'freeze_id': str(freeze_req.id),
                'status': 'FROZEN',
                'message': 'Account frozen successfully'
            })
        else:
            freeze_req.status = "FAILED"
            freeze_req.failure_reason = api_response.get("error", "I4C freeze request rejected or failed")
            logger.error("Freeze order %s failed via I4C. Reason: %s", freeze_req.id, freeze_req.failure_reason)

            broadcast_freeze_event('freeze_failed', {
                'freeze_id': str(freeze_req.id),
                'reason': freeze_req.failure_reason
            })

        freeze_req.save()

        # Ping Nodal Officer regardless of I4C call result
        ping_nodal_officer(freeze_req)

        return freeze_req

    # 3. If auto_freeze is False: log warning for officer intervention
    logger.warning("Auto-freeze skipped for alert %s. %s", alert.alert_id, reason)
    return None
