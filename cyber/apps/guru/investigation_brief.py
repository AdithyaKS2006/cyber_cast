"""
investigation_brief.py — Gemini 2.0 Flash powered investigation narrative generator.

Called after ML prediction is generated. Produces a 200-word investigation brief
and stores it back into CashOutPrediction.gemini_brief.
"""
import logging
from .gemini_proxy import call_gemini

logger = logging.getLogger('guru')

SYSTEM_INSTRUCTION = (
    "You are an expert AI assistant embedded in CrimeCast, a predictive cybercrime analytics "
    "platform used by Indian law enforcement. You have deep knowledge of NCRP cybercrime data, "
    "I4C guidelines, UPI fraud patterns, and mule-account cash-out networks across India. "
    "Always write in clear, professional English suitable for a police investigation report. "
    "Be concise, factual, and action-oriented."
)

BRIEF_TEMPLATE = """\
You are an AI assistant for Indian police cybercrime investigation.

Based on the following complaint and ML prediction data, generate a concise investigation \
brief (strictly under 200 words) structured as:

**1. Fraud Summary**
<one sentence: method, amount, victim location>

**2. Why This Cash-Out Zone Was Predicted**
<explain top contributing ML features in plain language>

**3. Recommended Immediate Actions**
<3 bullet points for the investigating officer, time-critical>

**4. Risk Assessment**
<CRITICAL / HIGH / MEDIUM with one-line justification>

---
COMPLAINT DATA:
- Complaint #: {complaint_number}
- Victim: {victim_name}, {victim_district}, {victim_state}
- Fraud Amount: ₹{fraud_amount}
- Fraud Method: {fraud_method}
- Reported: {fraud_timestamp}
- Narrative: {narrative}

PREDICTION DATA (Rank #{rank}):
- Predicted Zone: {zone_name} ({state})
- Coordinates: {lat}, {lon}
- Probability: {probability:.1%}
- Estimated Cash-Out ETA: {eta_hours} hours from now
- Model Version: {model_version}

TOP ML FEATURES (SHAP):
{shap_lines}
---
"""


def _format_shap(shap_dict: dict) -> str:
    """Format SHAP feature importance dict into readable lines."""
    if not shap_dict:
        return "  • Feature data unavailable"
    lines = []
    for feat, val in sorted(shap_dict.items(), key=lambda x: -abs(x[1]))[:6]:
        bar = '█' * max(1, int(abs(val) * 30))
        direction = '+' if val >= 0 else '-'
        lines.append(f"  • {feat.replace('_',' ').title():35s} {direction}{abs(val):.3f}  {bar}")
    return '\n'.join(lines)


def generate_investigation_brief(prediction, use_fast_fallback: bool = False) -> str:
    """
    Generate a Gemini-powered investigation brief for a CashOutPrediction.
    Returns the brief text. Caller is responsible for saving to prediction.gemini_brief.

    Args:
        use_fast_fallback: If True, skip FLAN-T5 and use template fallback when
                           Gemini is unavailable (fast, non-blocking).
    """
    c = prediction.complaint

    prompt = BRIEF_TEMPLATE.format(
        complaint_number=c.complaint_number,
        victim_name=c.victim_name,
        victim_district=c.victim_district,
        victim_state=c.victim_state,
        fraud_amount=f'{float(c.fraud_amount):,.0f}',
        fraud_method=c.fraud_method,
        fraud_timestamp=c.fraud_timestamp.strftime('%d %b %Y %H:%M IST') if c.fraud_timestamp else 'Unknown',
        narrative=c.narrative_text[:400] if c.narrative_text else 'Not provided',
        rank=prediction.rank,
        zone_name=prediction.predicted_zone_name,
        state=_zone_state(prediction.predicted_zone_name),
        lat=round(prediction.predicted_lat, 4),
        lon=round(prediction.predicted_lon, 4),
        probability=prediction.probability,
        eta_hours=prediction.eta_hours,
        model_version=prediction.model_version,
        shap_lines=_format_shap(prediction.feature_importance_json),
    )

    logger.info('Generating Gemini investigation brief for prediction %s', prediction.pk)

    # Try Gemini API (fast, cloud-based)
    api_key = _get_api_key()
    if api_key:
        try:
            import requests as _req
            from apps.guru.gemini_proxy import GEMINI_API_URL
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1024},
            }
            resp = _req.post(f"{GEMINI_API_URL}?key={api_key}", json=payload, timeout=10)
            if resp.status_code == 200:
                text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                # Sanitize text
                text = text.encode('utf-8', 'ignore').decode('utf-8')
                logger.info('Brief generated via Gemini 2.0 Flash (%d chars)', len(text))
                return text
        except Exception as exc:
            logger.warning('Gemini API failed: %s — using fallback', exc)

    # Fast template fallback (non-blocking, no ML model load)
    if use_fast_fallback:
        logger.info('Using template fallback brief (fast mode)')
        return _fallback_brief(prediction)

    # Full FLAN-T5 fallback (only when explicitly requested by user)
    result = call_gemini(prompt, system_instruction=SYSTEM_INSTRUCTION)
    if result.get('success'):
        brief = result['text']
        brief = brief.replace('### ⚡ Gemini 2.0 Flash Intelligent Response\n\n', '')
        # Sanitize text
        brief = brief.encode('utf-8', 'ignore').decode('utf-8')
        logger.info('Brief generated via %s (%d chars)', result.get('provider'), len(brief))
        return brief

    logger.warning('All brief generation methods failed, using template fallback')
    return _fallback_brief(prediction)


def _get_api_key() -> str:
    """Return Gemini API key if set and valid."""
    try:
        from django.conf import settings
        key = getattr(settings, 'GEMINI_API_KEY', '')
        if key and not any(ph in key.lower() for ph in ['your-', 'placeholder', 'dummy', 'xxxx', '']):
            return key
    except Exception:
        pass
    return ''



def _zone_state(zone_name: str) -> str:
    mapping = {
        'Delhi': 'Delhi', 'Gurugram': 'Haryana', 'Noida': 'Uttar Pradesh',
        'Meerut': 'Uttar Pradesh', 'Ghaziabad': 'Uttar Pradesh',
        'Mumbai': 'Maharashtra', 'Pune': 'Maharashtra',
        'Bengaluru': 'Karnataka', 'Hyderabad': 'Telangana',
        'Chennai': 'Tamil Nadu', 'Kolkata': 'West Bengal',
        'Ahmedabad': 'Gujarat', 'Surat': 'Gujarat',
        'Jaipur': 'Rajasthan', 'Lucknow': 'Uttar Pradesh',
        'Kanpur': 'Uttar Pradesh', 'Indore': 'Madhya Pradesh',
        'Bhopal': 'Madhya Pradesh', 'Patna': 'Bihar',
        'Chandigarh': 'Chandigarh',
    }
    for city, state in mapping.items():
        if city.lower() in zone_name.lower():
            return state
    return 'India'


def _fallback_brief(prediction) -> str:
    """Template-based fallback when Gemini is unavailable."""
    c = prediction.complaint
    eta = prediction.eta_hours
    prob = prediction.probability
    risk = 'CRITICAL' if prob >= 0.75 else 'HIGH' if prob >= 0.5 else 'MEDIUM'

    return f"""\
**1. Fraud Summary**
A {c.fraud_method} fraud of ₹{float(c.fraud_amount):,.0f} was reported by {c.victim_name} \
from {c.victim_district}, {c.victim_state}.

**2. Why This Cash-Out Zone Was Predicted**
The CrimeCast lightgbm model (LightGBM) identified {prediction.predicted_zone_name} as \
the most probable cash-out location based on fraud amount, transaction hop pattern, \
fraud method, time elapsed, and geographic mule concentration ({prob:.0%} confidence).

**3. Recommended Immediate Actions**
• Alert local police station and cybercrime cell at {prediction.predicted_zone_name} \
  immediately — ETA {eta:.1f} hours.
• Initiate account freeze request with nodal officer for the identified mule accounts.
• Coordinate with ATM monitoring team to flag cards linked to the terminal cluster.

**4. Risk Assessment**
{risk} — {prob:.0%} model confidence with {eta:.1f}h estimated cash-out window. \
Immediate interception action required.
"""
