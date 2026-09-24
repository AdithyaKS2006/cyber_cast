from django.urls import path
from apps.graph.views import (
    ComplaintGraphAPIView,
    MuleNodeListView,
    CrossComplaintNetworkAPIView,
    ConfirmedMulesAPIView
)


app_name = 'graph'

urlpatterns = [
    path('network/', CrossComplaintNetworkAPIView.as_view(), name='network-graph'),
    path('confirmed-mules/', ConfirmedMulesAPIView.as_view(), name='confirmed-mules'),
    path('complaint/<uuid:complaint_id>/', ComplaintGraphAPIView.as_view(), name='complaint-graph'),
    path('nodes/', MuleNodeListView.as_view(), name='node-list'),
]

