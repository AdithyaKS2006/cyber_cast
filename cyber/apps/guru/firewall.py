import re
import logging

logger = logging.getLogger('guru.firewall')

# Common prompt injection patterns (heuristic-based)
INJECTION_PATTERNS = [
    r"(?i)\bignore\s+(all\s+)?(previous\s+)?(instructions|directions|prompts)\b",
    r"(?i)\bsystem\s+override\b",
    r"(?i)\bdisregard\s+the\s+(above|previous)\b",
    r"(?i)\bforget\s+(everything|previous|above)\b",
    r"(?i)\boutput\s+your\s+(prompt|instructions|api\s*key|system\s+message)\b",
    r"(?i)\btranslate\s+(everything|the\s+above)\b",
    r"(?i)\bbot\s+(directive|instruction)\b",
    r"(?i)\bnew\s+role\b",
    r"(?i)\bact\s+as\b"
]

def check_prompt_injection(text: str) -> bool:
    """
    Returns True if a prompt injection attack is detected via heuristics.
    """
    if not text:
        return False
        
    from apps.ml_engine.prompt_firewall import prompt_firewall
    is_blocked, reason = prompt_firewall.analyze_prompt(text)
    
    if is_blocked:
        logger.warning(f"ML Firewall Blocked: {reason}")
        return True
        
    return False

def format_secure_prompt(user_input: str, context: str = "") -> str:
    """
    Wraps untrusted input in XML tags to clearly demarcate it from system instructions,
    preventing the LLM from confusing user data with system directives.
    """
    secure_prompt = "<untrusted_user_input>\n"
    secure_prompt += user_input
    secure_prompt += "\n</untrusted_user_input>"
    
    if context:
        secure_prompt += "\n\n<context>\n"
        secure_prompt += context
        secure_prompt += "\n</context>"
        
    return secure_prompt

def sanitize_llm_output(output: str) -> str:
    """
    Strips potentially harmful HTML/JS from the LLM output to prevent XSS
    if the LLM is coerced into returning malicious payloads.
    """
    if not output:
        return ""
    
    # Strip basic script tags or iframe payloads
    sanitized = re.sub(r'(?i)<\s*script.*?>.*?</\s*script\s*>', '[REMOVED SCRIPT]', output, flags=re.DOTALL)
    sanitized = re.sub(r'(?i)<\s*iframe.*?>.*?</\s*iframe\s*>', '[REMOVED IFRAME]', sanitized, flags=re.DOTALL)
    sanitized = re.sub(r'(?i)javascript:', '[REMOVED JS]', sanitized)
    
    return sanitized
