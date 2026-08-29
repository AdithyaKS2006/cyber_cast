from django.urls import path
from .views import GenerateReportView, DownloadReportView, ScheduleReportView, ReportHistoryView

urlpatterns = [
    path('generate/', GenerateReportView.as_view(), name='generate_report'),
    path('history/', ReportHistoryView.as_view(), name='report_history'),
    path('<uuid:pk>/download/', DownloadReportView.as_view(), name='download_report'),
    path('schedule/', ScheduleReportView.as_view(), name='schedule_report'),
]
