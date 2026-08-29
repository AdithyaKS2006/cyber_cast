import os
import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity

KNOWLEDGE_BASE = [
    {
        "intent": "platform_assistant_help",
        "queries": [
            "how do I use cyber sandbox",
            "how to detonate a file in sandbox",
            "where are threat reports exported",
            "how to check my devices and security status",
            "blockchain evidence verification portal",
            "api key setup and authentication",
            "cyber guru AI features and capabilities",
            "help me navigate the platform features",
            "what can this cyber sandbox do"
        ],
        "response_template": """### 🤖 CrimeCast Platform Assistant Guide

Welcome! I am **Cyber Guru AI**, your dedicated cybersecurity co-pilot. Here is how to navigate and utilize the **CrimeCast Platform**:

#### 🚀 Key Platform Capabilities:
1. **Secure Sandbox Portal (`/sandbox`)**:
   - **Upload & Detonate**: Drag & drop executables (`.exe`), scripts (`.py`, `.sh`, `.js`), documents (`.pdf`), or archives (`.zip`).
   - **Multi-Engine Isolation**: Choose between **Disposable Docker Containers** (`--network none`) or **Firejail Namespaces**.
   - **Real-Time Analysis**: Dynamic ML ensemble classification (LightGBM, SVM) with entropy and syscall extraction.
   - **Export Intelligence**: Download AI-generated markdown reports (`.md`) or raw JSON telemetry (`.json`).

2. **Blockchain Evidence Anchoring (`/blockchain`)**:
   - Every detonation result, hash, and threat score is immutably anchored on-chain with cryptographic Merkle root proofs.

3. **Threat Intelligence Feed (`/threat-feed`)**:
   - Live IP reputation scores, malware signature database updates, and emerging zero-day advisories.

4. **Device Management (`/devices`)**:
   - Profiling connected endpoint devices, monitoring agent heartbeat telemetry, and executing remote remediation triggers.

5. **API & CLI Access (`/api-docs`)**:
   - Full REST API support with JWT authentication for automated SOC/SIEM pipeline integration.

#### 💡 Quick Tip:
*Type any security query, paste code snippets, or ask about specific CVEs or MITRE ATT&CK techniques, and I will assist you immediately!*"""
    },
    {
        "intent": "code_audit_security",
        "queries": [
            "code review security vulnerability audit",
            "find owasp top 10 vulnerabilities in python code",
            "how to prevent sql injection in database queries",
            "fix xss vulnerability in react javascript application",
            "secure api endpoint django authentication authorization",
            "hardened code example best practices",
            "security flaws in code paste analysis"
        ],
        "response_template": """### 🔍 Code Security Audit & Vulnerability Triage

**Category**: Application Security & Secure Code Review
**Target Standard**: OWASP Top 10 / CWE Standard Guidelines

#### ⚠️ Common Vulnerability Patterns & Fixes:

1. **SQL Injection (CWE-89 / OWASP A03)**:
   - ❌ *Vulnerable*: `cursor.execute(f"SELECT * FROM users WHERE username = '{user_input}'")`
   - ✅ *Remediated*: `cursor.execute("SELECT * FROM users WHERE username = %s", (user_input,))`

2. **Cross-Site Scripting (XSS - CWE-79 / OWASP A03)**:
   - ❌ *Vulnerable*: `element.innerHTML = untrustedInput;`
   - ✅ *Remediated*: `element.textContent = untrustedInput;` (or use React JSX automatic escaping)

3. **Remote Code Execution / Deserialization (CWE-502 / OWASP A08)**:
   - ❌ *Vulnerable*: `pickle.loads(user_data)` or `eval(user_code)`
   - ✅ *Remediated*: Use safe serialization formats like `json.loads()` or strictly validated schemas.

4. **Insecure Direct Object References (IDOR - CWE-639 / OWASP A01)**:
   - ✅ *Remediated*: Always enforce server-side ownership checks: `filter(id=object_id, owner=request.user)`

#### 🛡️ Recommended Security Actions:
1. Integrate SAST (Static Application Security Testing) like **Bandit** (Python) or **ESLint-plugin-security** (JS) into CI/CD pipelines.
2. Enforce input sanitization and parameterized queries across all database drivers."""
    },
    {
        "intent": "vulnerability_cve",
        "queries": [
            "cve vulnerability patch log4j spring4shell eternalblue",
            "how to fix cve 2021 44228 log4j remote code execution",
            "vulnerability assessment cvss score patch management",
            "explain buffer overflow memory corruption zero day exploit",
            "what is cve 2017 0144 eternalblue smb vulnerability",
            "cve 2024 zero day vulnerability advisory"
        ],
        "response_template": """### 🛡️ Vulnerability & CVE Security Advisory

**Classification**: High-Critical Severity Vulnerability Triage
**CVSS Estimated Score**: 8.8 - 10.0 (Critical)

#### Key Findings:
- **Root Cause**: Unsanitized input or memory corruption leading to Remote Code Execution (RCE) / Privilege Escalation.
- **Affected Surface**: Exposed network endpoints, unpatched legacy libraries, or outdated enterprise services.

#### MITRE ATT&CK Mapping:
- **T1190**: Exploit Public-Facing Application
- **T1068**: Exploitation for Privilege Escalation

#### Recommended Action Plan:
1. **Immediate Mitigation**: Isolate affected host network segments using micro-segmentation.
2. **Patch Management**: Apply vendor-supplied emergency hotfix or update to latest stable release.
3. **Detection Rule**: Deploy Snort/YARA rule to inspect inbound TCP packets for exploit payloads."""
    },
    {
        "intent": "mitre_attack",
        "queries": [
            "mitre attack matrix ttp tactics techniques persistence",
            "privilege escalation credential access lsass dumping",
            "command and control reverse shell beaconing cobalt strike",
            "defense evasion process hollowing dll side loading",
            "initial access phishing spear phishing drive by compromise",
            "execution shell script powershell cmd"
        ],
        "response_template": """### 🎯 MITRE ATT&CK Threat Mapping

**Tactical Phase**: Execution / Defense Evasion / Persistence / Credential Access

#### Tactical Breakdown:
- **TA0003 - Persistence**: Adversaries maintain access across restarts (Registry Run Keys, Scheduled Tasks, Systemd Services).
- **TA0005 - Defense Evasion**: Process Hollowing, Masquerading, DLL Side-Loading, and disabling Security Tools.
- **TA0006 - Credential Access**: Dumping LSASS process memory (`Mimikatz`), accessing SAM registry hives.

#### Detection & Forensics:
- **Sysmon Event ID 1**: Process creation with unusual parent-child relationships (e.g. `cmd.exe` spawned by `w3wp.exe`).
- **Sysmon Event ID 10**: Process Access to `lsass.exe`.

#### Hardening Guidance:
- Implement Endpoint Detection & Response (EDR) block rules for LSASS handles.
- Enforce AppLocker / Windows Defender Application Control (WDAC)."""
    },
    {
        "intent": "malware_ransomware",
        "queries": [
            "malware analysis ransomware lockbit blackcat wanacry",
            "analyzing executable sample behavioral detonation report",
            "ransomware shadow copies deletion vssadmin bcdedit",
            "trojan botnet emotet trickbot dynamic payload analysis",
            "yara rule generation file hash indicator of compromise",
            "detected malware binary signature"
        ],
        "response_template": """### ☣️ Malware & Ransomware Behavior Detonation Report

**Threat Category**: Advanced Ransomware / Destructive Payload
**Dynamic Threat Level**: Critical Risk (Automated Defense Triggered)

#### Behavioral Artifacts:
- **Process Activity**: Execution of `vssadmin.exe delete shadows /all /quiet` and `bcdedit /set {default} bootstatuspolicy ignoreallfailures`.
- **File System Impact**: High-entropy mass file encryption with ransom note deployment (`.LOCKBIT`, `.README.txt`).
- **Network Activity**: Encrypted C2 beaconing over HTTPS to hardcoded IP ranges.

#### IoCs Extracted:
- **Registry Key**: `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`
- **Crypto Wallet / C2 Protocol**: Tor Onion service hidden domain

#### Remediation Checklist:
1. **Host Containment**: Immediately sever network connectivity (disable NIC / block switch port).
2. **Key Recovery**: Do NOT attempt live decryption without memory snapshot dump.
3. **Backup Restoration**: Rebuild host from known clean gold master image after offline forensic imaging."""
    },
    {
        "intent": "threat_hunting_queries",
        "queries": [
            "write yara rule for ransomware detection",
            "sigma rule for mimikatz credential dumping",
            "splunk search query for privilege escalation",
            "snort rule for reverse shell connection",
            "sysmon event id correlation rule creation",
            "detecting suspicious process creation"
        ],
        "response_template": """### 🎯 Threat Hunting & Detection Engineering Signature

**Rule Format**: YARA & Sysmon Event Correlation

```yara
rule CyberGuru_Malware_Hunter {
    meta:
        description = "Detects suspicious process execution & memory injection"
        author = "CyberGuru AI Engine"
        severity = "HIGH"
    strings:
        $cmd1 = "vssadmin.exe delete shadows" ascii wide nocase
        $cmd2 = "VirtualAlloc" ascii wide
        $cmd3 = "WriteProcessMemory" ascii wide
        $magic = { 4D 5A } // PE Header MZ
    condition:
        $magic at 0 and (any of ($cmd1, $cmd2, $cmd3))
}
```

#### Sysmon Detection Config (Event ID 1 - Process Creation):
```xml
<RuleGroup name="" groupRelation="or">
  <ProcessCreate onmatch="include">
    <CommandLine condition="contains">vssadmin delete</CommandLine>
    <CommandLine condition="contains">powershell -enc</CommandLine>
    <Image condition="image">mimikatz.exe</Image>
  </ProcessCreate>
</RuleGroup>
```"""
    },
    {
        "intent": "network_pcap",
        "queries": [
            "network traffic analysis pcap packet dump syn flood ddos",
            "sql injection payload union select xss script tag",
            "port scan nmap stealth scan syn ack sweep",
            "dns tunneling exfiltration unexpected subdomains txt queries",
            "web application attack brute force login rate limit",
            "wireshark pcap analysis suspicious IP"
        ],
        "response_template": """### 🌐 Network & Packet Inspection Analysis

**Traffic Protocol**: TCP/IP / HTTP Payload / DNS Tunneling
**Threat Indicator**: Malicious Traffic Pattern Detected

#### Anomalous Traffic Summary:
- **Pattern Detected**: Volumetric Anomalous Request Sequence / Injection Payload.
- **Signatures**: Repeated SQL keywords (`' OR 1=1 --`, `UNION SELECT`), abnormal TCP SYN flood rates, or DNS TXT query exfiltration.

#### MITRE ATT&CK Mapping:
- **T1595**: Active Scanning (IP / Port Discovery)
- **T1071.004**: Application Layer Protocol: DNS Exfiltration

#### Recommended Network Controls:
1. **WAF Enforcement**: Update Web Application Firewall rules to drop malformed input headers and injection strings.
2. **Rate Limiting**: Enable strict IP-based rate limiting on vulnerable public routes.
3. **DNS Sinkhole**: Direct suspicious DNS queries to local sinkhole IP for packet logging."""
    },
    {
        "intent": "cryptography_pki",
        "queries": [
            "encryption standard aes 256 gcm data protection",
            "how to generate tls certificate openssl",
            "rsa vs ecc public key cryptography",
            "password hashing algorithm argon2 bcrypt pbkdf2",
            "digital signature hash verification sha256"
        ],
        "response_template": """### 🔑 Cryptographic Architecture & PKI Standards

**Standard**: FIPS 140-3 / NIST SP 800-57 Compliant

#### Recommended Algorithms:
- **Symmetric Encryption**: `AES-256-GCM` (Authenticated Encryption with Associated Data).
- **Asymmetric Encryption / Key Exchange**: `ECDH` with `secp256r1` / `Ed25519` or `RSA-4096`.
- **Hashing**: `SHA-256` / `SHA-512` (avoid MD5 / SHA-1).
- **Password Storage**: `Argon2id` (Memory: 64MB, Iterations: 3) or `bcrypt` (Work factor: 12+).

#### Quick Certificate Command (OpenSSL Self-Signed 4096-bit):
```bash
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes -subj "/CN=cybersandbox.local"
```"""
    },
    {
        "intent": "cloud_devsecops_hardening",
        "queries": [
            "docker container security hardening guidelines",
            "kubernetes rbac policy network policy security",
            "aws iam least privilege policy setup",
            "cicd secret scanning github actions pipeline",
            "devsecops container vulnerability scan trivy"
        ],
        "response_template": """### ☁️ Cloud Security & DevSecOps Infrastructure Hardening

**Domain**: Container Security / Cloud Security Posture Management (CSPM)

#### Docker & Container Hardening Rules:
1. **Run as Non-Root**: `USER 10001` in Dockerfile.
2. **Read-Only Root Filesystem**: Run container with `--read-only`.
3. **Drop Linux Capabilities**: `docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE`.
4. **No Network Access for Detonation**: `--network none`.

#### Kubernetes Security Profile:
```yaml
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  capabilities:
    drop: ["ALL"]
```"""
    },
    {
        "intent": "phishing_email_investigation",
        "queries": [
            "analyze phishing email headers spf dkim dmarc",
            "domain spoofing investigation spear phishing",
            "malicious link url extraction analysis",
            "email attachment malware payload check"
        ],
        "response_template": """### 📧 Phishing Email & Header Triage Report

**Analysis Protocol**: SPF / DKIM / DMARC Authentication Inspection

#### Key Validation Checkpoints:
- **SPF (Sender Policy Framework)**: Check `Received-SPF` header for `pass` vs `fail/softfail`.
- **DKIM (DomainKeys Identified Mail)**: Verify signature alignment between `header.d` and `From:` domain.
- **DMARC**: Policy enforcement (`p=reject` / `p=quarantine`).

#### Extracted Suspicious Links:
- Inspect URLs using `urllib.parse` for typosquatting (e.g. `micros0ft.com` or `paypa1.com`).
- Check domain registration age via WHOIS lookup."""
    },
    {
        "intent": "incident_response",
        "queries": [
            "incident response checklist forensic triage containment",
            "how to isolate compromised endpoint memory dump volatility",
            "threat hunting query siem rule splunk elastic ELK",
            "security breach protocol investigation step by step",
            "digital forensics artifacts prefetch shimcache amcache"
        ],
        "response_template": """### 🚨 Incident Response & Forensic Triage Plan

**Phase**: Containment, Eradication & Forensic Investigation

#### Immediate Containment Protocol:
1. **Network Segregation**: Disconnect host from LAN/VLAN without powering down (preserve volatile RAM).
2. **Volatile RAM Capture**: Execute `winpmem` or `FTK Imager Lite` to extract memory dump for Volatility analysis.
3. **Triage Artifact Collection**: Collect `$MFT`, Prefetch, Shimcache, Amcache, and Event Logs (`Security.evtx`).

#### Forensic Analysis Checklist:
- **Memory Analysis**: Run `volatility -f mem.raw windows.pstree` to inspect rogue process trees.
- **Persistence Verification**: Audit Autoruns, Scheduled Tasks, and WMI Event Consumers.

#### Post-Incident Steps:
- Rotate all privileged service account passwords and active Kerberos krbtgt keys."""
    },
    {
        "intent": "general_cybersecurity",
        "queries": [
            "zero trust architecture identity multi factor authentication mfa",
            "best practices for cloud security aws azure gcp",
            "data encryption at rest in transit tls aes 256",
            "cybersecurity compliance gdpr hipaa iso 27001",
            "security awareness training password policy key management"
        ],
        "response_template": """### 🔒 Cyber Security Best Practices & Guidance

**Domain**: Information Security Governance & Zero Trust Architecture

#### Key Principles:
- **Zero Trust Model**: Never Trust, Always Verify. Enforce continuous identity & device health validation.
- **Data Protection**: Enforce AES-256 encryption at rest and TLS 1.3 in transit.
- **Access Control**: Enforce Principle of Least Privilege (PoLP) and Mandatory Multi-Factor Authentication (MFA).

#### Implementation Recommendations:
1. **Identity Integration**: Enforce FIDO2 / WebAuthn hardware key MFA for high-privilege administrative access.
2. **Continuous Monitoring**: Centralize log aggregation in SIEM with automated alert correlation rules.
3. **Disaster Recovery**: Maintain air-gapped, immutable backups with automated recovery testing."""
    }
]

class OfflineCyberGuruEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=8000, stop_words='english')
        self.classifier = LogisticRegression(C=1.5, max_iter=1000)
        self.knowledge_base = KNOWLEDGE_BASE
        self.corpus_docs = []
        self.doc_to_kb = []
        
        # Check for Fine-Tuned FLAN-T5 Neural LLM
        self.llm_model = None
        self.llm_tokenizer = None
        self.llm_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "saved_models", "cyber_guru_llm"))

    def __getstate__(self):
        state = self.__dict__.copy()
        state['llm_model'] = None
        state['llm_tokenizer'] = None
        return state

    def _ensure_llm_loaded(self):
        if self.llm_model is None:
            if os.path.exists(self.llm_dir) and os.path.exists(os.path.join(self.llm_dir, "model.safetensors")):
                try:
                    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
                    print(f"[+] Loading Fine-Tuned FLAN-T5 Neural LLM from {self.llm_dir}...")
                    self.llm_tokenizer = AutoTokenizer.from_pretrained(self.llm_dir)
                    self.llm_model = AutoModelForSeq2SeqLM.from_pretrained(self.llm_dir)
                    print("[✓] Cyber Guru FLAN-T5 Neural LLM Engine Loaded Successfully!")
                except Exception as e:
                    print(f"[-] Could not load FLAN-T5 LLM: {e}. Falling back to TF-IDF Engine.")

    def fit(self):
        training_texts = []
        training_labels = []
        
        for kb_item in self.knowledge_base:
            intent = kb_item["intent"]
            for q in kb_item["queries"]:
                training_texts.append(q)
                training_labels.append(intent)
                
                # Document corpus for similarity
                self.corpus_docs.append(q)
                self.doc_to_kb.append(kb_item)
                
        # Fit vectorizer and classifier
        X_train = self.vectorizer.fit_transform(training_texts)
        self.classifier.fit(X_train, training_labels)
        
        # Pre-transform document corpus for cosine similarity
        self.X_corpus = self.vectorizer.transform(self.corpus_docs)
        print(f"[+] Successfully trained Cyber Guru AI Engine on {len(training_texts)} query variations across {len(self.knowledge_base)} security categories.")

    def predict(self, query, context=""):
        if not query or not str(query).strip():
            return "Please provide a valid cybersecurity query, IoC, CVE ID, or anomaly description."

        full_text = f"{query} {context}".strip()
        
        # Predict intent using TF-IDF Classifier for telemetry metadata
        vec = self.vectorizer.transform([full_text.lower()])
        predicted_intent = self.classifier.predict(vec)[0]

        # Extract specific entities from user query to dynamically enrich response
        cves = re.findall(r'CVE-\d{4}-\d{4,7}', query, re.IGNORECASE)
        ips = re.findall(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', query)
        hashes = re.findall(r'\b[a-fA-F0-9]{32,64}\b', query)
        mitres = re.findall(r'T\d{4}(?:\.\d{3})?', query, re.IGNORECASE)

        extracted_blocks = []
        if cves:
            extracted_blocks.append(f"**Target CVE(s)**: `{', '.join(set(cves)).upper()}`")
        if ips:
            extracted_blocks.append(f"**Extracted Host IP(s)**: `{', '.join(set(ips))}`")
        if hashes:
            extracted_blocks.append(f"**Sample Cryptographic Hash**: `{hashes[0]}`")
        if mitres:
            extracted_blocks.append(f"**MITRE ATT&CK Code(s)**: `{', '.join(set(mitres)).upper()}`")

        # 1. Primary Neural LLM Generation (if fine-tuned model loaded)
        self._ensure_llm_loaded()
        if self.llm_model and self.llm_tokenizer:

            try:
                prompt_input = f"CyberGuru Assistant Task: {full_text}"
                inputs = self.llm_tokenizer(prompt_input, return_tensors="pt", truncation=True, max_length=256)
                
                outputs = self.llm_model.generate(
                    **inputs,
                    max_new_tokens=180,
                    num_beams=1,
                    do_sample=False
                )

                generated_text = self.llm_tokenizer.decode(outputs[0], skip_special_tokens=True)
                
                response = f"### 🧠 Cyber Guru Neural LLM Response\n\n{generated_text}"
                
                if extracted_blocks:
                    entity_summary = "\n".join([f"- {b}" for b in extracted_blocks])
                    response += f"\n\n---\n#### 📌 Specific Telemetry Extracted from Query:\n{entity_summary}\n"
                    
                if context:
                    response += f"\n\n*Attached Context Active: `{context}`*"
                    
                response += f"\n\n---\n**Contextual Query**: *\"{query.strip()}\"*\n"
                response += f"**Engine**: CyberGuru FLAN-T5 Fine-Tuned Neural LLM | Intent: `{predicted_intent}`"
                return response
            except Exception as err:
                print(f"[-] LLM generation exception: {err}, using KB fallback.")

        # 2. Vector Cosine Similarity Fallback
        similarities = cosine_similarity(vec, self.X_corpus)[0]
        best_idx = int(np.argmax(similarities))
        best_kb = self.doc_to_kb[best_idx]
        response = best_kb["response_template"]

        if extracted_blocks:
            entity_summary = "\n".join([f"- {b}" for b in extracted_blocks])
            response += f"\n\n---\n#### 📌 Specific Telemetry Extracted from Query:\n{entity_summary}\n"

        if context:
            response += f"\n\n*Attached Context Active: `{context}`*"

        response += f"\n\n---\n**Contextual Query**: *\"{query.strip()}\"*\n"
        response += f"**Engine**: CyberGuru Local ML Classifier | Intent: `{predicted_intent}`"

        return response

