# CrimeCast v3.0 — AI Predictive Interdiction & Mule Syndicate Disruption

[![Tests](https://img.shields.io/badge/Tests-106%2F106_Passed-10b981?style=for-the-badge&logo=pytest)](file:///home/adithya-k-s/PROJECTS/cyber_updated(Aug-15-2026)/cyber/tests/)
[![Build](https://img.shields.io/badge/Build-Passing-10b981?style=for-the-badge&logo=vite)](file:///home/adithya-k-s/PROJECTS/cyber_updated(Aug-15-2026)/cyber/)
[![Legal Compliance](https://img.shields.io/badge/Legal_Basis-BNSS_2023_%7C_BSA_2023_%7C_DPDP_2023-blue?style=for-the-badge)](file:///home/adithya-k-s/PROJECTS/cyber_updated(Aug-15-2026)/cyber/)
[![Interbank Standard](https://img.shields.io/badge/Interbank_Messaging-ISO_20022_camt.056-orange?style=for-the-badge)](file:///home/adithya-k-s/PROJECTS/cyber_updated(Aug-15-2026)/cyber/)
[![Hackathon](https://img.shields.io/badge/Smart_India_Hackathon-PS_26184-purple?style=for-the-badge)](file:///home/adithya-k-s/PROJECTS/cyber_updated(Aug-15-2026)/cyber/)

> **Problem Statement 26184 (Ministry of Home Affairs / I4C, CIS Division):**  
> *"Development of a Predictive Analytics Framework for Cybercrime Complaints to Forecast Likely Cash Withdrawal Locations in Advance, Enabling Generation of Actionable Intelligence for Timely and Proactive Cybercrime Intervention."*

---

## 1. Executive Summary & Competitive Differentiators

While conventional cybercrime intake systems (such as RakshaNet) operate as **isolated, reactive case-logging portals** with outdated legal citations, **CrimeCast v3.0** is an **active AI-powered interdiction platform** designed to preempt financial cash-out before perpetrators reach the ATM.

| Capability | Competitor Portals (RakshaNet) | CrimeCast v3.0 (Smart India Hackathon) |
| :--- | :--- | :--- |
| **Intake Modality** | Static form only | **Live Multilingual Voice Assistant** (Web Speech API + Financial NER with Lakh/Thousand parser & 1-click presets) |
| **Syndicate Detection** | Isolated single-case view | **Cross-Complaint Mule Network Analyzer** (Auto-detects accounts spanning $\ge 2$ cases as `CONFIRMED_MULE` on React Flow canvas) |
| **Banking Protocols** | Generic JSON webhooks | **ISO 20022 `camt.056.001.08` XML** Payment Interdiction format + I4C JSON dual-view |
| **Legal Framework** | Obsolete CrPC Sec 91 / 102 | **BNSS 2023 Sec 106 & Sec 94** r/w **BSA 2023 Sec 63** & **DPDP Act 2023 Sec 4(d)** |
| **Court Exhibits** | None | **Automated Court-Ready Sec 106 Notice (PDF)** with SHA-256 tamper-evident cryptographic fingerprint |
| **Golden Window** | Static timestamps | **Live Dynamic Countdown Timers** based on physics-modeled spatial velocity and cash-out ETA |
| **Verification & Tests** | Untested / minimal | **106 / 106 Automated Tests Passing (100% Green)** |

---

## 2. Core Architecture & Feature Highlights

### A. Live Voice Intake & Financial NER (`/complaints/new`)
- Real-time client-side speech recognition using **Web Speech API**.
- Client & server-side Financial NER extracting:
  - **IFSC & Bank Resolution:** Instant mapping of `SBIN`, `HDFC`, `ICIC`, `PUNB`, `KKBK`, `BARB`, etc.
  - **Account & UPI Identifiers:** Context-aware entity grouping for beneficiary accounts and handles (`@okhdfcbank`, `@paytm`, `@ybl`).
  - **Indian Currency Parsing:** Automatic conversion of spoken natural language amounts (`"5 lakh rupees"` $\rightarrow$ `₹5,00,000.00`, `"75 thousand"` $\rightarrow$ `₹75,000.00`).
  - **Modus Operandi Tagging:** Instant classification for Digital Arrest, CBI Impersonation, Task Scams, and UPI Fraud.
  - **One-Click Simulation Presets:** Instant loading of real-world scenarios for rapid jury demos.

### B. Cross-Complaint Mule Syndicate Intelligence (`/intelligence/mule-network`)
- Real-time aggregation of transaction hops across all active and historical complaints.
- **Auto-Clustering Algorithm:** Identifies shared intermediary accounts across multiple victims, upgrading them dynamically to `CONFIRMED_MULE`.
- **Real-Time Dynamic Processing:** Submitting a new transaction hop immediately injects edges into the `MuleGraphEngine` and re-triggers the ML prediction pipeline, instantly generating Bank/ATM alerts and Sec 106 Freeze Orders for newly logged cases.
- **Interactive Graph Canvas:** Built with **React Flow** and **Dagre** hierarchical layout:
  - Filter by Layer 1, Layer 2, Layer 3, and Confirmed Mules.
  - Search by account number or IFSC code.
  - Inspect total illicit volume, linked complaints, and risk scores.
  - 1-click jump to case file details.

### C. ISO 20022 `camt.056.001.08` Interbank Cancellation Standard (`/predictions/`)
- Generates official `camt.056.001.08` XML payment cancellation and fraud freeze requests conforming to modern interbank clearance standards.
- Populates `<FIToFIPmntCxlReq>`, `<OrgnlGrpInf>`, `<InstgAgt>` (I4C), `<InstdAgt>` (Target Bank IFSC), and `<CxlRsnInf>` (`FRAD` - Financial Fraud).
- Dual-tab interactive viewer with copy-to-clipboard for both I4C JSON and ISO 20022 XML.

### D. Legal Modernization & Court-Ready Evidence (BNSS 2023)
- Full compliance with the new criminal codes enacted on July 1, 2024:
  - **Section 106 BNSS 2023:** Freezing of tainted proceeds of crime.
  - **Section 94 BNSS 2023:** Production of electronic transaction records.
  - **Section 63 BSA 2023:** Admissibility of electronic digital records.
  - **Section 4(d) DPDP Act 2023:** Lawful investigation exemption for personal data processing.
- One-click generation of **Sec 106 Freezing Notice (PDF)** with a SHA-256 evidence integrity block in `/freeze/queue/`.

---

## 3. 30-Second SIH Jury Presentation Script

To demonstrate CrimeCast v3.0's superiority in 30 seconds:

1. **Intake (10s):** Open `/app/complaints/new`. Click the **"Digital Arrest Preset"** button or click the microphone to speak: *"Victim lost 5 lakh rupees to suspect account 50100492819201 HDFC Bank."* Note instant autofill of IFSC, Bank, Account, and Amount. Click **Submit Complaint**.
2. **Golden Window & AI Cash-Out Prediction (8s):** Show the live **Golden Window countdown timer** ticking down. Navigate to `/app/predictions/` to inspect the DBSCAN cluster and view the generated **ISO 20022 camt.056 XML** notice.
3. **Mule Syndicate Disruption (7s):** Open `/app/intelligence/mule-network`. Point to the red pulsing node labeled **`CONFIRMED_MULE`**—explaining how CrimeCast automatically uncovered that this same mule account received money from both a Bangalore doctor and a Mumbai investor.
4. **Court Evidence (5s):** Navigate to `/app/freeze/queue/` and click **"Sec 106 Notice (PDF)"**. Open the downloaded PDF showing the official legal directive with SHA-256 tamper-evident digital fingerprint.

---

## 4. Quick Start & Setup

### 1. Requirements
- Python 3.12+
- Node.js 18+

### 2. Environment & Backend Setup
```bash
# Clone and enter directory
cd cyber

# Install Python dependencies
./venv/bin/pip install -r requirements.txt

# Run migrations
./venv/bin/python manage.py migrate

# Seed High-Impact Demo Data (Operation Garuda & Mule Syndicate)
./venv/bin/python demo/seed_demo_data.py
```

### 3. Frontend Setup & Build
```bash
# Install Node dependencies
npm install

# Verify production build
npm run build
```

### 4. Running the Application
```bash
# Terminal 1: Backend Django Server
./venv/bin/python manage.py runserver 8000

# Terminal 2: Frontend Vite Server
npm run dev
```

The system is now live at `http://localhost:3000`.  
**Demo Credentials:**
- **Director / Admin:** `admin` / `admin123`
- **Lead Analyst:** `analyst` / `analyst123`

---

## 5. Automated Test Suite (106 / 106 Passed)

To execute the test suite:
```bash
./venv/bin/pytest tests/ apps/ -v
```

**Results:**
- `tests/test_unit_comprehensive.py`: 32/32 passing (NER parsing, ISO 20022 XML, BNSS 106 PDF, Mule graph cycles)
- `tests/test_phase3_gaps.py`: 6/6 passing (Voice transcribe API, BNSS 106 PDF endpoint, ISO 20022 dispatch)
- `tests/test_phase4_mule_network.py`: 3/3 passing (Cross-complaint clustering, confirmed mules API, React Flow format)
- `tests/test_full_pipeline.py`: 5/5 passing
- `tests/test_phase2_flow.py`: 4/4 passing
- `tests/test_prediction_pipeline.py`: 2/2 passing
- `apps/*/tests.py`: 54/54 passing (Auth, Complaints, Ingest, Dashboard, ML Engine, Users)
- **Total: 106 Passed, 0 Failed (100% Pass Rate)**

---

## 6. Regulatory & Statutory Basis
- **BNSS 2023 Section 106 & Section 94:** Replaced CrPC 1973 Sections 102 & 91.
- **BSA 2023 Section 63:** Replaced Indian Evidence Act Section 65B.
- **DPDP Act 2023 Section 4(d):** Data protection compliance for prevention and detection of cyber financial crime.
- **ISO 20022 camt.056.001.08:** Universal financial industry message scheme for payment interdiction.
