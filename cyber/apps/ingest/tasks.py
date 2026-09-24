"""
Celery tasks for the ingest app.

Background workers handle NPCI/Bank webhook processing asynchronously,
ensuring webhook endpoints return 202 Accepted in < 20ms and never block
the Gunicorn/Daphne worker pool during ML inference or DB writes.
"""
import logging
from celery import shared_task

logger = logging.getLogger('crimecast.ingest')


@shared_task(
    name='apps.ingest.tasks.process_proactive_alert_task',
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def process_proactive_alert_task(self, alert_id: str):
    """
    Async Celery task: run the full ingest pipeline for a ProactiveAlert.

    Retries up to 3 times with a 30-second back-off on transient failures
    (e.g., DB connectivity blips or network timeouts to the freeze gateway).

    Args:
        alert_id: The unique alert_id string of the ProactiveAlert to process.

    Returns:
        dict: Pipeline result summary from process_proactive_alert().
    """
    from django.db import close_old_connections
    from apps.ingest.pipeline import process_proactive_alert

    close_old_connections()
    try:
        result = process_proactive_alert(alert_id)
        logger.info(
            "Async pipeline completed for alert %s — freeze=%s, status=%s",
            alert_id,
            result.get('should_freeze'),
            result.get('status'),
        )
        return result
    except Exception as exc:
        logger.error(
            "Pipeline task failed for alert %s: %s — retrying (attempt %s/%s)",
            alert_id,
            exc,
            self.request.retries + 1,
            self.max_retries,
            exc_info=True,
        )
        raise self.retry(exc=exc)
    finally:
        close_old_connections()
