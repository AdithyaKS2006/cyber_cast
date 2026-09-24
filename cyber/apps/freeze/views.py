import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from apps.freeze.models import FreezeRequest
from apps.freeze.serializers import FreezeRequestSerializer
from apps.freeze.nodal_ping import ping_nodal_officer

logger = logging.getLogger('crimecast.freeze')


class FreezeQueueAPIView(APIView):
    """
    GET /api/v2/freeze/queue/
    Returns list of recent FreezeRequests (limit 10) ordered by requested_at desc.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = FreezeRequest.objects.all().order_by('-requested_at')[:10]
        serializer = FreezeRequestSerializer(queryset, many=True)
        return Response(serializer.data)


class FreezeManualPingAPIView(APIView):
    """
    POST /api/v2/freeze/<uuid:freeze_id>/manual-ping/
    Manually triggers an urgent Nodal Officer alert ping for a FreezeRequest.
    """
    permission_classes = [AllowAny]

    def post(self, request, freeze_id):
        try:
            freeze_req = FreezeRequest.objects.get(id=freeze_id)
        except FreezeRequest.DoesNotExist:
            return Response({"error": "FreezeRequest not found"}, status=status.HTTP_404_NOT_FOUND)

        success = ping_nodal_officer(freeze_req)

        return Response({
            "freeze_id": str(freeze_req.id),
            "status": "PING_DISPATCHED" if success else "PING_FAILED",
            "success": success,
            "message": "Manual ping transmitted to Nodal Officer" if success else "Failed to send manual ping (missing email contact)"
        })


from django.http import HttpResponse
from apps.freeze.notice_generator import generate_bnss_106_notice_pdf


class FreezeNoticePDFAPIView(APIView):
    """
    GET /api/v2/freeze/<uuid:freeze_id>/notice/
    Generates and returns an official court-ready Statutory Freeze Directive PDF
    under Section 106 & Section 94 of BNSS 2023 with SHA-256 digital evidence hash.
    """
    permission_classes = [AllowAny]

    def get(self, request, freeze_id):
        try:
            freeze_req = FreezeRequest.objects.get(id=freeze_id)
        except FreezeRequest.DoesNotExist:
            return Response({"error": "FreezeRequest not found"}, status=status.HTTP_404_NOT_FOUND)

        pdf_bytes = generate_bnss_106_notice_pdf(freeze_req)
        filename = f"BNSS_Sec106_FreezeNotice_{str(freeze_req.id)[:8].upper()}.pdf"

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['X-BNSS-Section'] = '106'
        response['X-Digital-Evidence'] = 'BSA-2023-Sec-63'
        return response

