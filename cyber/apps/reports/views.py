import os
from django.conf import settings
from rest_framework import views, permissions, status
from rest_framework.response import Response
from django.http import FileResponse, Http404
from .models import Report
from .serializers import GenerateReportSerializer, ScheduleReportSerializer


class GenerateReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = GenerateReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        config = {
            'date_from': serializer.validated_data.get('date_from'),
            'date_to': serializer.validated_data.get('date_to'),
            'severity_filter': serializer.validated_data.get('severity_filter'),
            'sections': serializer.validated_data.get('sections', []),
            'report_id': None,
        }

        report_format = serializer.validated_data['format']
        report = Report.objects.create(
            generated_by=request.user,
            report_format=report_format,
            status='generating',
        )
        config['report_id'] = str(report.id)

        # Offload generation to Celery, fallback to sync if queue unavailable
        from apps.reports.tasks import generate_report_task
        try:
            generate_report_task.delay(
                report_id=str(report.id),
                user_id=str(request.user.id),
                config=config,
            )
        except Exception:
            generate_report_task(
                report_id=str(report.id),
                user_id=str(request.user.id),
                config=config,
            )

        download_url = f"/api/v1/reports/{report.id}/download/"

        return Response({
            "report_id": str(report.id),
            "download_url": download_url,
            "format": report_format,
            "status": "generating",
            "generated_at": report.created_at,
        }, status=status.HTTP_202_ACCEPTED)


class DownloadReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            report = Report.objects.get(pk=pk, generated_by=request.user)
        except Report.DoesNotExist:
            raise Http404

        if not report.file_path or not os.path.exists(report.file_path):
            raise Http404

        response = FileResponse(open(report.file_path, 'rb'))
        response['Content-Disposition'] = f'attachment; filename="report_{report.id}.{report.report_format}"'

        if report.report_format == 'pdf':
            response['Content-Type'] = 'application/pdf'
        elif report.report_format == 'json' or report.report_format == 'stix':
            response['Content-Type'] = 'application/json'

        return response


class ReportHistoryView(views.APIView):
    """List the requesting user's previously generated reports."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        reports = Report.objects.filter(generated_by=request.user).order_by('-created_at')[:50]
        return Response({
            "reports": [
                {
                    "id": str(r.id),
                    "format": r.report_format,
                    "status": r.status,
                    "created_at": r.created_at,
                    "download_url": f"/api/v1/reports/{r.id}/download/" if r.status == 'completed' else None,
                }
                for r in reports
            ]
        })


class ScheduleReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ScheduleReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Create a celery beat periodic task here
        return Response({"status": "Report scheduled", "config": serializer.validated_data}, status=status.HTTP_201_CREATED)
