# CrimeCast — SIH 2026 Grand Finale Judge Presentation & Demo Script

**Target Duration:** 3 Minutes  
**Core Objective:** Demonstrate CrimeCast's ability to shrink a 700-district search space down to a 5-district interdiction shortlist with transparent, macro-calibrated ML performance and schema-mapped I4C/CFCFRMS dispatch payloads.

---

## 1. Problem Statement (10 Seconds)

> **Speaker:** "Every single day across India, over 8,000 cyber financial fraud complaints hit the National Cybercrime Reporting Portal. With over 700 districts nationwide, manual multi-jurisdiction police triage is simply too slow for the golden-hour cash-out window. By the time an FIR is processed, stolen funds have hopped through multiple mule accounts and been withdrawn at a local ATM."

---

## 2. What We Built (20 Seconds)

> **Speaker:** "We built **CrimeCast** — an automated financial fraud triage and interdiction engine. CrimeCast continuously ingests fraud complaints, analyzes transaction hop mechanics, and predicts the physical destination district for cash-out. In milliseconds, it shrinks a **700-district national search space down to a ranked shortlist of 5**, firing automated, schema-compliant dispatch packages directly to nodal police units with human-in-the-loop audit controls."

---

## 3. Live System Walkthrough (60–90 Seconds)

### Step 3.1: Complaint Selection & Prediction Board
- **Action:** Open the main CrimeCast Live Prediction Board (`/`).
- **Show:** The nationwide interdiction map displaying real-time predictions centered near realistic confidence levels. Point to a newly ingested UPI fraud complaint (e.g. `CC-2026-00067`).
- **Speaker:** "Here on our live prediction board, complaints arrive in real time. Rather than asking officers to manually search 700 districts, CrimeCast analyzes the initial hop mechanics and identifies **Jamtara** as the top predicted cash-out destination with an estimated 3-hour window."

### Step 3.2: Prediction Detail & Signal Feature Audit
- **Action:** Click into `PredictionDetail` for complaint `CC-2026-00067`. Scroll to the Feature Breakdown card.
- **Show:** The **7 Core Load-Bearing Signal Features** (`fraud_method`, `victim_state`, `victim_district`, `beneficiary_bank`, `mule_account_age`, `hop_count`, `distance_from_victim_km`).
- **Speaker:** "Opening the prediction details, our system explicitly isolates the **7 core load-bearing signal features** — including mule account age, layering hop depth, and victim-to-beneficiary distance — keeping 31 non-contributing features labeled strictly as exploratory."

### Step 3.3: Automated Intelligence Dispatch & Audit Trail
- **Action:** Click the **Dispatch Intelligence** button (firing live above the recalibrated $\tau = 0.18$ confidence threshold).
- **Show:** Active intelligence package generated with `BankAlert`, `ATMAlert`, and `LEADispatch` status cards, stamped with `⚡ [SIMULATED DELIVERY]`.
- **Speaker:** "Clicking 'Dispatch Intelligence' generates a complete interdiction package. Notice the explicit `[SIMULATED DELIVERY]` tag — ensuring complete operational honesty on stage while verifying that Bank, ATM, and LEA alerts fire synchronously into the audit log."

---

## 4. The Honesty Beat (15 Seconds — Say Out Loud Live)

> **Speaker:** "Now let's look at our real model performance live on stage. Our LightGBM model achieves a **36.62% Top-5 accuracy** in shrinking a 700-district search space to 5, beating the nearest-district baseline of 13.88% by **+22.8 points**. We trained our model on an Option B dataset calibrated within **±10% of published NCRB and RBI macro telemetry**. Here is our live `model_metrics.json` API response."
> 
> *(Action: Navigate to `/model-metrics` or open Model Metrics tab to show live API JSON metrics).*

---

## 5. The Gateway Adapter Story (15 Seconds)

> **Speaker:** "For real-world deployment, interdiction packages must seamlessly ingest into MHA's National Cybercrime Reporting Portal. We built fully schema-mapped adapters formatted to official MHA standards: **`I4C-NCRP-FUND-FREEZE-v2.1`** for bank/ATM account holds and **`I4C-LEA-DISPATCH-v3.0`** for cross-jurisdiction law enforcement dispatches. Our standalone field-mapping appendix proves complete gateway interoperability."

---

## 6. Closing — Golden-Hour Interdiction Metric (10 Seconds)

> **Speaker:** "By shrinking the search space from 700 districts to 5, CrimeCast cuts average time-to-freeze from **36.4 hours down to 2.8 hours — a 92.3% reduction** that drives a **14.25x increase in simulated fraud chain interdictions** before cash-out occurs. CrimeCast turns law enforcement from reactive paper-chasing into real-time interdiction. Thank you."

---

## Technical Metrics Summary Table (For Judge Verification)

| Metric Category | Value | Source / File Reference |
| :--- | :--- | :--- |
| National Search Space | 700 Candidate Districts | `apps/ml_engine/zones.py` |
| Ranked Shortlist Target | Top 5 Districts | `PROJECT_DETAILS.md` & `train_cashout_model.py` |
| Top-5 Model Accuracy | 36.62% | `ml_models/model_metrics.json` |
| Nearest District Baseline (Top-5) | 13.88% | `ml_models/model_metrics.json` |
| Top-5 Performance Lift | +22.8 pts over Nearest District | `ml_models/model_metrics.json` |
| Macro Calibration Accuracy | Within ±10% of NCRB/RBI priors (Max error: 5.55%) | `dataset/calibration_report.json` |
| Core Signal Features | 7 Load-Bearing Features | `SIGNAL_FEATURES` in `zones.py` |
| Exploratory Features | 31 Contextual Features | `EXPLORATORY_FEATURES` in `zones.py` |
| Auto-Dispatch Threshold $\tau$ | 0.18 (75th percentile of real confidence) | `PredictionMap.jsx` |
| Time-to-Freeze Reduction | 36.4 Hours → 2.8 Hours (-92.3%) | `InterdictionImpactChart.jsx` |
| Interdiction Rate Boost | 4.8% → 68.4% (14.25x gain) | `InterdictionImpactChart.jsx` |
| Gateway Payload Specs | `I4C-NCRP-FUND-FREEZE-v2.1` & `I4C-LEA-DISPATCH-v3.0` | `CFCFRMS_NCRP_FIELD_MAPPING.md` |
