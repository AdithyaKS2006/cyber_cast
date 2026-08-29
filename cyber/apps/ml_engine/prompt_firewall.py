import logging
import re
# from transformers import pipeline

logger = logging.getLogger('security')

class PromptFirewall:
    """
    Defends AI end-points (like Cyber Guru) against Adversarial Prompt Injections,
    Jailbreaks, and data-exfiltration prompts from autonomous offensive agents.
    """
    def __init__(self):
        # In a high-end production setup, we load a small distilled BERT model.
        # e.g., self.classifier = pipeline("text-classification", model="protectai/deberta-v3-base-prompt-injection-v2")
        # To ensure the server doesn't crash on boot without models downloaded, we use a regex/heuristic lightgbm fallback.
        self.jailbreak_patterns = [
            r"(?i)(ignore|disregard)\s+(all\s+)?(previous\s+)?(instructions|directions)",
            r"(?i)you\s+are\s+now\s+(a\s+)?(developer|admin|root|system)",
            r"(?i)hypothetically|for\s+educational\s+purposes",
            r"(?i)write\s+a\s+(script|code)\s+to\s+(hack|bypass|exploit)",
            r"(?i)system\s+prompt|system\s+message",
            r"(?i)dan\s+\(do\s+anything\s+now\)",
        ]
        self.compiled_patterns = [re.compile(p) for p in self.jailbreak_patterns]

    def analyze_prompt(self, prompt_text):
        """
        Analyzes a prompt for injection attempts.
        Returns (is_blocked, reason)
        """
        if not prompt_text:
            return False, ""
            
        # 1. Check heuristics & known jailbreak patterns
        for pattern in self.compiled_patterns:
            if pattern.search(prompt_text):
                logger.warning(f"Prompt Firewall blocked jailbreak attempt: {prompt_text[:50]}...")
                return True, "Adversarial Prompt Injection / Jailbreak Detected"
                
        # 2. Check for extreme length (DoS / Context Window exhaustion)
        if len(prompt_text) > 8000:
            return True, "Context window exhaustion attempt (Payload too large)"

        # 3. Future ML Classifier integration goes here
        # result = self.classifier(prompt_text)
        # if result[0]['label'] == 'INJECTION' and result[0]['score'] > 0.8:
        #     return True, "ML Classifier flagged prompt as malicious"

        return False, ""

# Global singleton instance
prompt_firewall = PromptFirewall()
