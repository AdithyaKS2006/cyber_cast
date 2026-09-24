import hmac
import hashlib
import logging
import re
from django.conf import settings

logger = logging.getLogger('crimecast.ingest')

class HMACValidator:
    """
    Validates HMAC-SHA256 signatures for incoming webhooks.
    Reads shared secrets from settings.WEBHOOK_SECRETS.
    """
    
    @staticmethod
    def validate_ifsc(ifsc: str) -> bool:
        if not ifsc:
            return False
        return bool(re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', ifsc))

    @staticmethod
    def validate(request, bank_code: str) -> bool:
        webhook_secrets = getattr(settings, 'WEBHOOK_SECRETS', {})
        secret = webhook_secrets.get(bank_code) or webhook_secrets.get(bank_code.upper())
        
        if not secret:
            logger.warning("No webhook secret configured for bank/source: %s", bank_code)
            return False

        # Header can be accessed via request.headers or request.META
        signature = request.headers.get('X-CrimeCast-Signature') or request.META.get('HTTP_X_CRIMECAST_SIGNATURE')
        if not signature:
            logger.warning("Missing X-CrimeCast-Signature header for %s webhook", bank_code)
            return False

        try:
            secret_bytes = secret.encode('utf-8') if isinstance(secret, str) else secret
            body_bytes = request.body

            expected_hmac = hmac.new(secret_bytes, body_bytes, hashlib.sha256).hexdigest()

            # Constant-time comparison
            is_valid = hmac.compare_digest(expected_hmac.lower(), signature.lower())
            if not is_valid:
                logger.warning("Invalid HMAC signature for %s. Expected: %s, Received: %s", bank_code, expected_hmac, signature)
            return is_valid
        except Exception as e:
            logger.error("HMAC validation error for %s: %s", bank_code, e, exc_info=True)
            return False
