from django.urls import path
from .views import DashboardStatsView, ExecutiveSummaryView

urlpatterns = [
    path('stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('executive-summary/', ExecutiveSummaryView.as_view(), name='executive-summary'),
]
