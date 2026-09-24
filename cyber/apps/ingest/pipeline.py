import logging
from django.utils import timezone
from apps.ingest.models import ProactiveAlert
from apps.freeze.decider import evaluate_and_freeze
from apps.graph.engine import MuleGraphEngine

logger = logging.getLogger('crimecast.ingest')


def process_proactive_alert(alert_id: str) -> dict:
    """
    Processes a ProactiveAlert after ingestion.
    Fetches the alert, updates status, registers telemetry in Mule Graph, evaluates freeze threshold, and logs operations.
    """
    try:
        alert = ProactiveAlert.objects.get(alert_id=alert_id)
    except ProactiveAlert.DoesNotExist:
        logger.error("ProactiveAlert not found with alert_id: %s", alert_id)
        return {"error": "Alert not found", "alert_id": alert_id}

    # Set status to ANALYZING
    alert.status = 'ANALYZING'
    alert.save(update_fields=['status'])

    # Log processing details
    logger.info("Processing alert %s, amount %s, score %s", alert.alert_id, alert.amount, alert.fraud_score)

    # Ingest financial telemetry edge into Mule Network Graph
    try:
        graph_engine = MuleGraphEngine()
        graph_engine.add_edge(
            from_account=alert.from_account,
            from_ifsc=alert.from_bank_ifsc,
            to_account=alert.to_account,
            to_ifsc=alert.to_bank_ifsc,
            amount=alert.amount,
            transaction_ref=alert.alert_id,
            timestamp=alert.received_at or timezone.now(),
            hop_number=1,
            complaint=alert.linked_complaint
        )
    except Exception as e:
        logger.error("Failed to construct graph edge for alert %s: %s", alert.alert_id, e, exc_info=True)

    # Evaluate freeze threshold
    should_freeze = alert.fraud_score >= 0.85
    freeze_request = None

    if should_freeze:
        logger.info("Alert %s exceeded freeze threshold (score: %s >= 0.85). Triggering decision engine.", alert.alert_id, alert.fraud_score)
        freeze_request = evaluate_and_freeze(alert)

    # Update status to ANALYZED, set processed_at timestamp
    alert.status = 'ANALYZED'
    alert.processed_at = timezone.now()
    alert.save(update_fields=['status', 'processed_at'])

    # Return summary dict
    return {
        "alert_id": alert.alert_id,
        "should_freeze": should_freeze,
        "fraud_score": alert.fraud_score,
        "status": alert.status,
        "freeze_request_id": str(freeze_request.id) if freeze_request else None,
        "freeze_status": freeze_request.status if freeze_request else None
    }
