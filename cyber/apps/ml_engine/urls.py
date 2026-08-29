from django.urls import path
from .views import (
    ModelListView, ModelDetailView, ModelDriftView, RetrainView,
    ModelCompareView, NLQParseView, MLMetricsView
)

urlpatterns = [
    path('models/', ModelListView.as_view()),
    path('models/compare/', ModelCompareView.as_view()),
    path('models/<uuid:pk>/', ModelDetailView.as_view()),
    path('models/<uuid:pk>/drift/', ModelDriftView.as_view()),
    path('models/<uuid:pk>/retrain/', RetrainView.as_view()),
    path('nlq/parse/', NLQParseView.as_view()),
    path('metrics/', MLMetricsView.as_view()),
]

