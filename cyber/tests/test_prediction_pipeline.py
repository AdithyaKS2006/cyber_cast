import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.urls import reverse
from apps.complaints.models import Complaint
from apps.predictions.models import CashOutPrediction
import uuid

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def auth_user():
    user = User.objects.create_user(
        username='test_officer',
        email='officer@test.in',
        password='T3st#Officer!2026',
        role='administrator'
    )
    return user

@pytest.fixture
def complaint():
    from django.utils import timezone
    return Complaint.objects.create(
        complaint_number='TEST-12345',
        fraud_amount=15000,
        victim_district='Mumbai',
        victim_state='MH',
        status='OPEN',
        suspect_bank='HDFC',
        fraud_timestamp=timezone.now()
    )

@pytest.fixture
def prediction(complaint):
    return CashOutPrediction.objects.create(
        complaint=complaint,
        probability=0.85,
        predicted_zone_name='Delhi',
        predicted_lat=28.6139,
        predicted_lon=77.2090,
        eta_hours=2.5,
        outcome='NEEDS_REVIEW'
    )

@pytest.mark.django_db
class TestPredictionPipeline:
    def test_generate_prediction_success(self, api_client, auth_user, complaint):
        """Test that we can trigger prediction generation without 500 error."""
        api_client.force_authenticate(user=auth_user)
        # Note: the url name might not be set, so we use the path
        response = api_client.post('/api/v1/predictions/generate/', {
            'complaint_id': str(complaint.id)
        }, format='json')
        
        # Should be 202 ACCEPTED
        assert response.status_code == 202
        assert response.data['message'] == 'Prediction generation started'
        
    def test_package_dispatch_success(self, api_client, auth_user, prediction):
        """Test that dispatching a package does not return 500."""
        api_client.force_authenticate(user=auth_user)
        response = api_client.post(f'/api/v1/predictions/{prediction.id}/dispatch/', {
            'analyst_approved': True
        }, format='json')
        
        # 200 OK
        assert response.status_code == 200
        assert 'package_id' in response.data
        assert response.data['status'] == 'DISPATCHED'
        
        prediction.refresh_from_db()
        assert prediction.outcome == 'DISPATCHED'
