import logging
import re

class SensitiveDataFilter(logging.Filter):
    PATTERNS = [
        (re.compile(r'password["\s:=]+["\s]?[\w@#$%^&*!]+', re.IGNORECASE), '[REDACTED_PASSWORD]'),
        (re.compile(r'token["\s:=]+["\s]?[\w\-.]+', re.IGNORECASE), '[REDACTED_TOKEN]'),
        (re.compile(r'api[_-]?key["\s:=]+["\s]?[\w\-.]+', re.IGNORECASE), '[REDACTED_API_KEY]'),
        (re.compile(r'AQ\.[A-Za-z0-9_\-]+', re.IGNORECASE), '[REDACTED_API_KEY]'),
        (re.compile(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'), '[REDACTED_IP]'),
    ]

    
    def filter(self, record):
        message = str(record.getMessage())
        for pattern, replacement in self.PATTERNS:
            message = pattern.sub(replacement, message)
        record.msg = message
        record.args = ()
        return True
