from django.urls import path
from apps.ingest.views import NPCIWebhookView, BankWebhookView, ProactiveAlertListAPIView

app_name = 'ingest'

urlpatterns = [
    path('npci-alert/', NPCIWebhookView.as_view(), name='npci-alert'),
    path('bank-alert/<str:bank_code>/', BankWebhookView.as_view(), name='bank-alert'),
    path('alerts/', ProactiveAlertListAPIView.as_view(), name='alerts-list'),
]
