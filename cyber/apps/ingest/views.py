import json
import logging
import uuid
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from apps.ingest.validators import HMACValidator
from apps.ingest.models import ProactiveAlert
from apps.ingest.pipeline import process_proactive_alert
from rest_framework.generics import ListAPIView
from rest_framework.serializers import ModelSerializer

class ProactiveAlertSerializer(ModelSerializer):
    class Meta:
        model = ProactiveAlert
        fields = '__all__'

class ProactiveAlertListAPIView(ListAPIView):
    serializer_class = ProactiveAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ProactiveAlert.objects.all().order_by('-received_at')[:50]


logger = logging.getLogger('crimecast.ingest')


@method_decorator(csrf_exempt, name='dispatch')
class NPCIWebhookView(APIView):
    """
    Ingests real-time fraud alerts from NPCI.
    Endpoint: POST /api/v2/ingest/npci-alert/

    Design: The webhook validates the HMAC signature, persists the ProactiveAlert
    record, then immediately enqueues heavy pipeline work (ML inference, graph
    construction, freeze evaluation) onto a Celery worker thread.  The HTTP
    response is returned in < 20ms — well within the NPCI/bank webhook timeout SLA.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # Validate HMAC signature
        if not HMACValidator.validate(request, 'NPCI'):
            return Response(
                {"error": "Invalid HMAC signature or missing X-CrimeCast-Signature header"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            payload = json.loads(request.body)
        except Exception as e:
            return Response(
                {"error": f"Invalid JSON payload: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        alert_id = payload.get('alert_id') or f"NPCI-{uuid.uuid4().hex[:12]}"

        try:
            alert = ProactiveAlert.objects.create(
                alert_id=alert_id,
                source='NPCI',
                from_account=payload.get('from_account', ''),
                from_bank_ifsc=payload.get('from_bank_ifsc', ''),
                to_account=payload.get('to_account', ''),
                to_bank_ifsc=payload.get('to_bank_ifsc', ''),
                amount=payload.get('amount', 0.0),
                fraud_score=payload.get('fraud_score', 0.0),
                fraud_indicators=payload.get('fraud_indicators', []),
                status='RECEIVED'
            )
            logger.info(
                "Received ProactiveAlert from NPCI: %s (Amount: \u20b9%s, Score: %s)",
                alert_id, alert.amount, alert.fraud_score
            )
        except Exception as e:
            logger.error("Failed to persist NPCI ProactiveAlert: %s", e, exc_info=True)
            return Response(
                {"error": f"Failed to record alert: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # -- Async dispatch ---------------------------------------------------
        # Enqueue the heavy pipeline (ML inference, graph construction, freeze
        # evaluation) to a Celery worker.  This returns 202 Accepted in < 20ms.
        # Fallback: if no broker is running (CI / bare dev env), run sync.
        queued = False
        pipeline_result = None
        try:
            from apps.ingest.tasks import process_proactive_alert_task
            process_proactive_alert_task.delay(alert.alert_id)
            queued = True
            logger.info("Alert %s enqueued for async pipeline processing.", alert_id)
        except Exception as broker_err:
            logger.warning(
                "Celery broker unavailable (%s) -- falling back to synchronous pipeline for alert %s.",
                broker_err, alert_id
            )
            try:
                pipeline_result = process_proactive_alert(alert.alert_id)
            except Exception as e:
                logger.error("Sync pipeline fallback failed for alert %s: %s", alert_id, e, exc_info=True)

        response_body = {
            "status": "accepted",
            "alert_id": alert.alert_id,
            "processing_mode": "async_celery" if queued else "sync_fallback",
            "message": (
                "NPCI alert queued for asynchronous spatial inference and LEA dispatch."
                if queued
                else "NPCI alert processed synchronously (broker unavailable)."
            ),
        }
        if pipeline_result is not None:
            response_body["pipeline_result"] = pipeline_result

        return Response(response_body, status=status.HTTP_202_ACCEPTED)


@method_decorator(csrf_exempt, name='dispatch')
class BankWebhookView(APIView):
    """
    Ingests real-time fraud alerts from individual banks.
    Endpoint: POST /api/v2/ingest/bank-alert/<str:bank_code>/

    Same async-first design as NPCIWebhookView.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, bank_code, *args, **kwargs):
        bank_code_clean = bank_code.upper()

        # Validate HMAC signature
        if not HMACValidator.validate(request, bank_code_clean):
            return Response(
                {"error": f"Invalid HMAC signature or missing X-CrimeCast-Signature header for {bank_code_clean}"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            payload = json.loads(request.body)
        except Exception as e:
            return Response(
                {"error": f"Invalid JSON payload: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        alert_id = payload.get('alert_id') or f"{bank_code_clean}-{uuid.uuid4().hex[:12]}"

        try:
            alert = ProactiveAlert.objects.create(
                alert_id=alert_id,
                source='BANK',
                from_account=payload.get('from_account', ''),
                from_bank_ifsc=payload.get('from_bank_ifsc', ''),
                to_account=payload.get('to_account', ''),
                to_bank_ifsc=payload.get('to_bank_ifsc', ''),
                amount=payload.get('amount', 0.0),
                fraud_score=payload.get('fraud_score', 0.0),
                fraud_indicators=payload.get('fraud_indicators', []),
                status='RECEIVED'
            )
            logger.info(
                "Received ProactiveAlert from Bank %s: %s (Amount: \u20b9%s, Score: %s)",
                bank_code_clean, alert_id, alert.amount, alert.fraud_score
            )
        except Exception as e:
            logger.error("Failed to persist Bank %s ProactiveAlert: %s", bank_code_clean, e, exc_info=True)
            return Response(
                {"error": f"Failed to record alert: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # -- Async dispatch ---------------------------------------------------
        queued = False
        pipeline_result = None
        try:
            from apps.ingest.tasks import process_proactive_alert_task
            process_proactive_alert_task.delay(alert.alert_id)
            queued = True
            logger.info("Alert %s enqueued for async pipeline processing.", alert_id)
        except Exception as broker_err:
            logger.warning(
                "Celery broker unavailable (%s) -- falling back to synchronous pipeline for alert %s.",
                broker_err, alert_id
            )
            try:
                pipeline_result = process_proactive_alert(alert.alert_id)
            except Exception as e:
                logger.error("Sync pipeline fallback failed for alert %s: %s", alert_id, e, exc_info=True)

        response_body = {
            "status": "accepted",
            "alert_id": alert.alert_id,
            "bank_code": bank_code_clean,
            "processing_mode": "async_celery" if queued else "sync_fallback",
            "message": (
                f"Bank {bank_code_clean} alert queued for asynchronous spatial inference and LEA dispatch."
                if queued
                else f"Bank {bank_code_clean} alert processed synchronously (broker unavailable)."
            ),
        }
        if pipeline_result is not None:
            response_body["pipeline_result"] = pipeline_result

        return Response(response_body, status=status.HTTP_202_ACCEPTED)
