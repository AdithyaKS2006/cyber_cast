import time
import uuid
import logging
import requests
from django.conf import settings

logger = logging.getLogger('crimecast.freeze')


class I4CClient:
    """
    Client interface for Indian Cyber Crime Coordination Centre (I4C) account freeze APIs.
    Supports both simulated (mock) and production HTTP operational modes.
    """

    def __init__(self):
        self.mock_mode = getattr(settings, 'I4C_MOCK_MODE', True)
        self.base_url = getattr(settings, 'I4C_API_BASE_URL', 'https://api.i4c.gov.in/v1').rstrip('/')
        self.api_token = getattr(settings, 'I4C_API_TOKEN', 'mock-token')
        self.timeout = 5.0

    def _get_headers(self) -> dict:
        return {
            'Authorization': f"Bearer {self.api_token}",
            'Content-Type': 'application/json',
            'User-Agent': 'CrimeCast-Platform/2.0'
        }

    def request_freeze(self, account_number: str, ifsc: str, amount: float, complaint_ref: str) -> dict:
        """
        Dispatches an automated freeze order to I4C / Nodal Bank APIs.
        """
        logger.info("Executing freeze request via I4C (Mock: %s) for Account %s, IFSC %s, Amount ₹%s",
                    self.mock_mode, account_number, ifsc, amount)

        if self.mock_mode:
            mock_freeze_id = f"MOCK-I4C-{uuid.uuid4().hex[:8].upper()}"
            logger.info("Mock I4C Freeze successful. Generated Freeze ID: %s", mock_freeze_id)
            return {
                "freeze_id": mock_freeze_id,
                "status": "FROZEN",
                "message": "Account frozen successfully",
                "target_account": account_number,
                "ifsc": ifsc,
                "amount": float(amount)
            }

        # Real production mode
        url = f"{self.base_url}/freeze/request"
        payload = {
            "account_number": account_number,
            "ifsc": ifsc,
            "amount": float(amount),
            "complaint_ref": complaint_ref
        }

        try:
            response = requests.post(url, json=payload, headers=self._get_headers(), timeout=self.timeout)
            if response.status_code in (200, 201):
                return response.json()
            logger.error("I4C API HTTP Error %s: %s", response.status_code, response.text)
            return {"status": "FAILED", "error": f"HTTP {response.status_code}: {response.text}"}
        except Exception as e:
            logger.error("I4C API connection error during freeze request: %s", e, exc_info=True)
            return {"status": "FAILED", "error": str(e)}

    def check_freeze_status(self, freeze_id: str) -> dict:
        """
        Queries status of an existing I4C freeze order.
        """
        if self.mock_mode:
            return {"freeze_id": freeze_id, "status": "FROZEN"}

        url = f"{self.base_url}/freeze/{freeze_id}/status"
        try:
            response = requests.get(url, headers=self._get_headers(), timeout=self.timeout)
            if response.status_code == 200:
                return response.json()
            return {"status": "FAILED", "error": f"HTTP {response.status_code}: {response.text}"}
        except Exception as e:
            logger.error("I4C API status check error for %s: %s", freeze_id, e, exc_info=True)
            return {"status": "FAILED", "error": str(e)}

    def revoke_freeze(self, freeze_id: str, reason: str) -> dict:
        """
        Submits a revocation order to release an account freeze.
        """
        logger.info("Revoking freeze order %s (Reason: %s)", freeze_id, reason)

        if self.mock_mode:
            return {"freeze_id": freeze_id, "status": "REVOKED", "reason": reason}

        url = f"{self.base_url}/freeze/{freeze_id}/revoke"
        payload = {"reason": reason}
        try:
            response = requests.post(url, json=payload, headers=self._get_headers(), timeout=self.timeout)
            if response.status_code in (200, 201):
                return response.json()
            return {"status": "FAILED", "error": f"HTTP {response.status_code}: {response.text}"}
        except Exception as e:
            logger.error("I4C API revocation error for %s: %s", freeze_id, e, exc_info=True)
            return {"status": "FAILED", "error": str(e)}
