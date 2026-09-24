import re

KNOWN_BANKS = {
    'SBIN': 'State Bank of India',
    'HDFC': 'HDFC Bank',
    'ICIC': 'ICICI Bank',
    'UTIB': 'Axis Bank',
    'PUNB': 'Punjab National Bank',
    'BARB': 'Bank of Baroda',
    'CNRB': 'Canara Bank',
    'KKBK': 'Kotak Mahindra Bank',
    'UBIN': 'Union Bank of India',
    'INDB': 'IndusInd Bank',
    'YESB': 'Yes Bank',
    'IDFB': 'IDFC First Bank',
    'PYTM': 'Paytm Payments Bank',
    'AIRP': 'Airtel Payments Bank',
}

def validate_ifsc(ifsc_code: str) -> dict:
    ifsc_code = ifsc_code.strip().upper()
    
    match = re.match(r'^([A-Z]{4})0([A-Z0-9]{6})$', ifsc_code)
    
    if not match:
        return {
            "is_valid": False,
            "bank_name": None,
            "error": f"Invalid IFSC format: {ifsc_code}. Must be 11 characters (4 letters, a zero, 6 alphanumeric)."
        }
    
    bank_code = match.group(1)
    
    if bank_code in KNOWN_BANKS:
        return {
            "is_valid": True,
            "bank_name": KNOWN_BANKS[bank_code],
            "branch_code": match.group(2)
        }
    else:
        return {
            "is_valid": False,
            "bank_name": None,
            "error": f"Bank code '{bank_code}' not found in RBI Master Directory."
        }
