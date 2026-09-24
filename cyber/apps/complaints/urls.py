from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ComplaintViewSet,
    ComplaintStatsView,
    ComplaintBulkImportView,
    TransactionChainView,
    VoiceTranscribeAPIView,
    ValidateIFSCAPIView
)

router = DefaultRouter()
router.register(r'', ComplaintViewSet, basename='complaint')

urlpatterns = [
    path('stats/', ComplaintStatsView.as_view(), name='complaint-stats'),
    path('bulk-import/', ComplaintBulkImportView.as_view(), name='complaint-bulk-import'),
    path('voice-transcribe/', VoiceTranscribeAPIView.as_view(), name='voice-transcribe'),
    path('validate-ifsc/', ValidateIFSCAPIView.as_view(), name='validate-ifsc'),
    path('<uuid:pk>/chain/', TransactionChainView.as_view(), name='transaction-chain'),
    path('', include(router.urls)),
]

