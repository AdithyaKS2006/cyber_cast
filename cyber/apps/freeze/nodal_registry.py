NODAL_OFFICERS = {
    "HDFC": {
        "name": "HDFC Bank Nodal Officer",
        "email": "nodalfocell@hdfcbank.com",
        "phone": "1800-202-6161"
    },
    "SBIN": {
        "name": "SBI Nodal Officer",
        "email": "cybercrime@sbi.co.in",
        "phone": "1800-111-109"
    },
    "ICIC": {
        "name": "ICICI Bank Nodal Officer",
        "email": "headcybercrime@icicibank.com",
        "phone": "1800-200-3344"
    },
    "UTIB": {
        "name": "Axis Bank Nodal Officer",
        "email": "cybercrime@axisbank.com",
        "phone": "1800-419-5959"
    },
    "PUNB": {
        "name": "PNB Nodal Officer",
        "email": "gm.it@pnb.co.in",
        "phone": "1800-180-2222"
    },
}


def get_nodal_officer(ifsc: str) -> dict:
    """
    Looks up Bank Nodal Officer details based on IFSC prefix (first 4 characters).
    """
    if not ifsc or len(ifsc) < 4:
        return {"name": "Unknown Bank", "email": None, "phone": None}
    prefix = ifsc[:4].upper()
    return NODAL_OFFICERS.get(prefix, {"name": f"Unknown Bank ({prefix})", "email": None, "phone": None})
