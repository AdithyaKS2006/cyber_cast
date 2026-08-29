from django.urls import path
from .views import (
    GeneratePredictionView,
    GenerateBriefView,
    PredictionListView,
    PredictionDetailView,
    PredictionOutcomeView,
    HeatmapDataView,
    PredictionAccuracyView,
    AlertListView,
    AlertAcknowledgeView,
    AlertDispatchView,
    ModelMetricsView,
    PackageDispatchView,
    LEADispatchListView,
    LEADispatchAcknowledgeView,
    LEADispatchOutcomeView,
    LEADispatchRollupView,
    GatewayMonitorView,
    SimulateNCRPWebhookView,
)

urlpatterns = [
    path('generate/',              GeneratePredictionView.as_view(), name='generate-prediction'),
    path('simulate-webhook/',     SimulateNCRPWebhookView.as_view(), name='simulate-ncrp-webhook'),
    path('',                       PredictionListView.as_view(),     name='prediction-list'),
    path('<uuid:pk>/',             PredictionDetailView.as_view(),   name='prediction-detail'),
    path('<uuid:pk>/outcome/',     PredictionOutcomeView.as_view(),  name='prediction-outcome'),
    path('<uuid:pk>/brief/',       GenerateBriefView.as_view(),      name='prediction-brief'),
    path('<uuid:pk>/dispatch/',    PackageDispatchView.as_view(),    name='package-dispatch'),

    path('data/heatmap/',          HeatmapDataView.as_view(),        name='heatmap-data'),
    path('data/accuracy/',         PredictionAccuracyView.as_view(), name='prediction-accuracy'),
    path('data/model-metrics/',    ModelMetricsView.as_view(),       name='model-metrics'),
    path('gateway/webhooks/',      GatewayMonitorView.as_view(),     name='gateway-webhooks'),

    path('alerts/',                             AlertListView.as_view(),        name='alert-list'),
    path('alerts/<uuid:pk>/acknowledge/',       AlertAcknowledgeView.as_view(), name='alert-acknowledge'),
    path('alerts/<uuid:pk>/dispatch/',          AlertDispatchView.as_view(),    name='alert-dispatch'),
    
    path('lea-dispatches/rollup/',                LEADispatchRollupView.as_view(),      name='lea-dispatch-rollup'),
    path('lea-dispatches/',                       LEADispatchListView.as_view(),        name='lea-dispatch-list'),
    path('lea-dispatches/<uuid:pk>/acknowledge/', LEADispatchAcknowledgeView.as_view(), name='lea-dispatch-acknowledge'),
    path('lea-dispatches/<uuid:pk>/outcome/',     LEADispatchOutcomeView.as_view(),     name='lea-dispatch-outcome'),
]

