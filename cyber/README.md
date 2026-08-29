# CrimeCast — Predictive Analytics Framework for Cybercrime (PS 26184)

**Problem Statement 26184** (Ministry of Home Affairs / I4C, CIS Division): 
*"Development of a Predictive Analytics Framework for Cybercrime Complaints to Forecast Likely Cash Withdrawal Locations in Advance, Enabling Generation of Actionable Intelligence for Timely and Proactive Cybercrime Intervention."*

---

## 1. The Problem
Law enforcement agencies currently rely on reactive measures to trace stolen funds. By the time a cybercrime complaint is processed, money mules have often withdrawn the funds from ATMs in different jurisdictions. We need a proactive, predictive approach to identify where the cash-out will happen *before* the money is gone, enabling cross-jurisdictional intelligence sharing and immediate bank account freezes.

## 2. Our Approach
CrimeCast transitions cybercrime investigation from a reactive to a predictive model. We use a **Two-Tier Spatial Framework** (LightGBM for macro-zone ranking + DBSCAN for micro-ATM clustering) to predict the terminal cash-out hotspots based on behavioral patterns, fraud modalities, and partial transaction hops known at the time of the complaint. This approach ensures there is no "label leakage"—the model relies entirely on signals available exactly when the complaint is filed. 

## 3. Prediction Methodology
- **No Label Leakage:** The model relies solely on features known at complaint time (e.g., initial hops, fraud amount, time of day, victim demographics) to predict the downstream cash-out node.
- **Two-Tier Spatial Architecture:** 
  - **Macro-Tier:** A calibrated LightGBM classifier ranks the top 5 highest-probability cash-out districts across a 40-canonical-zone grid.
  - **Micro-Tier:** DBSCAN spatial clustering identifies the exact micro-ATM coordinates within the predicted district.
- **Physics-Based ETA Modeling:** Instead of relying purely on ML probability, we calculate realistic interdiction windows (ETA) based on inter-district spatial velocity, RBI settlement cycles, and fraud method latency.
- **Geographic Consistency:** Predictions target a canonical list of real Indian districts. The generative simulation for synthetic training data ensures realistic cross-state mule routing tendencies without leaking the final destination.

## 4. Honest Metrics & Baseline Deltas
CrimeCast shrinks a 700-district search space to a ranked shortlist of 5, beating the naive majority-district baseline by a meaningful top-5 margin.

Model utility is continuously measured against two realistic baselines:
- **Majority-Class Baseline:** Always predicting the biggest overall cash-out hotspot.
- **Nearest-District Baseline:** Always predicting the zone closest to the last known transaction hop.

By beating these baselines by a clear top-5 margin, we demonstrate the mathematical necessity of the AI model over simplistic distance or popularity rules, while avoiding misleading top-1 headline claims. Detailed metrics (including top-1 accuracy for full technical transparency) are natively accessible within the Model Metrics page.

## 5. Actionable Intelligence & Dispatch Flow
Predicting the location is only half the battle. CrimeCast provides an automated, robust intelligence distribution pipeline:
- **Live 1930 NCRP Webhook Simulator:** Ingests live threat telemetry, instantly triggering the spatial prediction pipeline and updating the interactive GIS heatmap.
- **High Confidence Predictions:** Generate an **Intelligence Package** for 1-click dispatch. The system automatically creates:
  - **BankAlert:** Requesting target financial institutions to freeze suspect accounts.
  - **ATMAlert:** Flagging patterns and expected withdrawal windows in the predicted zone.
  - **LEADispatch:** A hand-off packet sent directly to the nodal officer of the *predicted* district (enabling cross-jurisdiction interception).
- **Field Mobile Intercept:** A dedicated mobile-responsive interface for field officers to acknowledge dispatches, navigate to DBSCAN-identified micro-clusters, and log successful interdictions.
- **Human-in-the-Loop (HITL):** Predictions scoring below the confidence threshold automatically route to an **Analyst Review** queue. They cannot be auto-dispatched without explicit human authorization.
- **Audit Logging:** Every step, from automated prediction to analyst approval and final dispatch, is immutably logged to establish a chain of custody.

## 6. Out of Scope (For SIH Demonstration)
We are explicitly transparent about what is simulated for this prototype vs. what requires external partnerships for production:
- **Real Bank/ATM/Telecom Integrations:** The application provides the full integration surface and data models, but uses simulated adapters for delivery. Real integration requires RBI/I4C onboarding.
- **Real Victim PII:** All data is strictly synthetic and behaviorally simulated to protect privacy.
- **SOC/Threat-Hunting Features:** Legacy components from generalized cyber-defense are disabled in this build to focus entirely on the PS 26184 mandate.

---

## Quick Start & Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your secrets if needed.
# IMPORTANT FOR LOCAL DEVELOPMENT:
# 1. Set DEBUG=True
# 2. Add a dummy SECRET_KEY (e.g., SECRET_KEY=django-insecure-dev-key)
# 3. Comment out DATABASE_URL and REDIS_URL to use SQLite and in-memory cache/broker.
```

### 3. Database & Seeding
```bash
source venv/bin/activate
python manage.py migrate
# Seed demo data for the SIH presentation
python manage.py seed_demo
```

### 4. Start Services
```bash
# Terminal 1 — Django backend
python manage.py runserver 8000

# Terminal 2 — Vite frontend
npm run dev
```

The system is now accessible at `http://localhost:3000`.
