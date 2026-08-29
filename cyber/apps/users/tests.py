from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from apps.users.models import User, Organization
from apps.complaints.models import Complaint

class UserTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(
            name="Delhi Police Cyber Cell"
        )
        self.user = User.objects.create_user(
            username="test_officer@crimecast.io",
            email="test_officer@crimecast.io",
            password="T3st#Analyst!2026",
            role="analyst",
            district="South Delhi",
            organization=self.org
        )

    def test_user_creation(self):
        self.assertEqual(self.user.email, "test_officer@crimecast.io")
        self.assertEqual(self.user.role, "analyst")
        self.assertEqual(self.user.district, "South Delhi")
        self.assertTrue(self.user.check_password("T3st#Analyst!2026"))

    def test_unauthenticated_user_registration_and_login(self):
        reg_payload = {
            "username": "new_unit_officer",
            "email": "unit_officer@crimecast.io",
            "first_name": "Unit",
            "last_name": "Officer",
            "password": "Password123!",
            "confirm_password": "Password123!",
        }
        response = self.client.post(
            "/api/v1/auth/register/",
            data=reg_payload,
            format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn("user", response.json())
        self.assertIn("access_token", response.cookies)

        # Login with new account
        login_payload = {
            "email": "unit_officer@crimecast.io",
            "password": "Password123!"
        }
        login_resp = self.client.post(
            "/api/v1/auth/login/",
            data=login_payload,
            format="json"
        )
        self.assertEqual(login_resp.status_code, 200)
        self.assertIn("user", login_resp.json())
        self.assertIn("access_token", login_resp.cookies)

    def test_registration_forces_analyst_role(self):
        """Self-serve registration must force role='analyst' regardless of input."""
        reg_payload = {
            "username": "hacker_user",
            "email": "hacker@crimecast.io",
            "first_name": "Evil",
            "last_name": "Hacker",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "administrator"
        }
        response = self.client.post(
            "/api/v1/auth/register/",
            data=reg_payload,
            format="json"
        )
        self.assertEqual(response.status_code, 201)
        user_data = response.json()["user"]
        self.assertEqual(user_data["role"], "analyst")

    def test_unscoped_user_fails_closed(self):
        """Operator without assigned district gets zero complaints (fails closed)."""
        Complaint.objects.create(
            victim_name="John Doe",
            victim_district="South Delhi",
            fraud_amount=50000,
            fraud_timestamp=timezone.now()
        )
        unscoped_user = User.objects.create_user(
            username="unscoped@crimecast.io",
            email="unscoped@crimecast.io",
            password="Password123!",
            role="operator",
            district=""
        )
        self.client.force_authenticate(user=unscoped_user)
        resp = self.client.get("/api/v1/complaints/")
        self.assertEqual(resp.status_code, 200)
        results = resp.json().get("results", resp.json())
        self.assertEqual(len(results), 0)

    def test_admin_role_update_endpoint(self):
        """Admin can update role via PATCH /api/v1/users/<id>/role/; analyst cannot."""
        admin = User.objects.create_user(
            username="admin@crimecast.io",
            email="admin@crimecast.io",
            password="Password123!",
            role="administrator"
        )
        target = User.objects.create_user(
            username="target@crimecast.io",
            email="target@crimecast.io",
            password="Password123!",
            role="analyst"
        )
        # Non-admin attempt -> 403
        self.client.force_authenticate(user=self.user)
        fail_resp = self.client.patch(
            f"/api/v1/users/{target.id}/role/",
            data={"role": "supervisor"},
            format="json"
        )
        self.assertEqual(fail_resp.status_code, 403)

        # Admin attempt -> 200
        self.client.force_authenticate(user=admin)
        ok_resp = self.client.patch(
            f"/api/v1/users/{target.id}/role/",
            data={"role": "supervisor"},
            format="json"
        )
        self.assertEqual(ok_resp.status_code, 200)
        target.refresh_from_db()
        self.assertEqual(target.role, "supervisor")


