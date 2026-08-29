# CrimeCast — Step-by-Step Build Guide
## Execute these prompts IN ORDER to build the complete project

---

## Pre-Requisites
- Read `PRD.md` fully before starting
- Existing CrimeCast codebase is the starting point
- Django 4.2 + React 19 + Vite already configured

---

## PHASE 1: Strip Legacy Code (Day 1)

### Prompt 1.1 — Remove Blockchain App
```
Remove the `apps/blockchain/` Django app from the project completely:
1. Remove 'apps.blockchain' from LOCAL_APPS in cybersandbox/settings/base.py
2. Remove the blockchain URL route from cybersandbox/urls.py (line 68)
3. Remove Web3/Blockchain config variables (WEB3_PROVIDER_URL, CONTRACT_ADDRESS) from settings
4. Update the SPECTACULAR_SETTINGS description to remove "Blockchain-Enabled" text
5. Remove all blockchain references from:
   - apps/core/routing.py (WebSocket routes)
   - apps/core/consumers.py (blockchain consumer)
   - apps/core/views.py (any blockchain stats)
   - apps/analytics/views.py (blockchain analytics)
   - apps/analytics/report_generator.py (blockchain reports)
   - apps/users/models.py (blockchain-related fields)
   - apps/users/serializers.py (blockchain fields)
   - apps/threat_detection/models.py (blockchain FK references)
   - apps/threat_detection/views.py (blockchain submission)
   - apps/core/management/commands/seed_data.py (blockchain seed)
6. Remove test files: tests/test_blockchain.py, tests/test_blockchain_web3.py
7. Clean up tests/conftest.py, tests/factories.py of blockchain references
8. DO NOT delete the apps/blockchain/ directory yet — just disconnect it
9. Run `python manage.py makemigrations` and `python manage.py migrate` to verify
```

### Prompt 1.2 — Remove Frontend Blockchain Pages
```
Remove all blockchain-related frontend components:
1. Delete src/components/blockchain/ directory entirely
2. Remove blockchain imports and routes from src/components/navigation/PageRenderer.jsx
3. Remove blockchain menu items from src/components/navigation/TriageSidebar.jsx
4. Remove blockchain references from src/components/pages/Dashboard.jsx
5. Remove blockchain references from src/components/pages/LandingPage.jsx
6. Remove blockchain API endpoints from src/utils/apiClient.js
7. Remove blockchain mock data from src/utils/mockData.js
8. Remove blockchain WebSocket handlers from src/utils/websocketManager.js
9. Clean up src/components/reports/ReportsPage.jsx
10. Clean up src/components/admin/AdminSystem.jsx
11. Clean up src/components/admin/AdminApiKeys.jsx
12. Run `npm run build` to verify no broken imports
```

### Prompt 1.3 — Rebrand to CrimeCast
```
Rebrand the application from CrimeCast to CrimeCast:
1. Update cybersandbox/settings/base.py:
   - SPECTACULAR_SETTINGS title → "CrimeCast API"
   - Description → "Predictive Analytics Framework for Cybercrime Cash-Out Interception"
   - DEFAULT_FROM_EMAIL → 'noreply@crimecast.io'
   - PLATFORM_URL → 'https://crimecast.io'
   - Cache KEY_PREFIX → 'crimecast'
2. Update frontend branding:
   - Logo text in TriageSidebar.jsx
   - Page titles
   - Landing page hero section → CrimeCast theme
3. Update meta tags, page titles, favicon text references
4. Keep the Django project folder name as 'cybersandbox' (no file rename needed — too risky)
```

---

## PHASE 2: Backend — New Django Apps (Day 2-3)

### Prompt 2.1 — Create Complaints App
```
Create a new Django app `apps/complaints/` with the following:

**models.py:**
- Complaint model with fields from PRD section 4.1
- FraudMethod choices: UPI, CARD, NET_BANKING, PHONE_CALL, EMAIL_PHISHING, OTHER
- Status choices: NEW, UNDER_ANALYSIS, PREDICTION_ACTIVE, INTERCEPTED, CLOSED, FALSE_ALARM
- Priority choices: LOW, MEDIUM, HIGH, CRITICAL
- Add auto-generated complaint_number field (format: CC-2026-00001)
- Add assigned_officer FK to User model
- Add organization FK for multi-tenancy

**TransactionHop model:**
- FK to Complaint
- from_account, from_bank, from_ifsc
- to_account, to_bank, to_ifsc
- amount (DecimalField), timestamp
- hop_number (PositiveIntegerField)
- is_mule_flagged (BooleanField)
- latitude, longitude (FloatField, nullable)

**serializers.py:**
- ComplaintListSerializer (summary for table)
- ComplaintDetailSerializer (full detail with nested chain)
- ComplaintCreateSerializer (validation for intake form)
- TransactionHopSerializer

**views.py:**
- ComplaintViewSet (CRUD + list with filters: status, priority, date range, search)
- ComplaintStatsView (counts by status, total fraud amount, avg response time)
- ComplaintBulkImportView (CSV upload)
- TransactionChainView (add/list hops for a complaint)

**urls.py:**
- Wire all endpoints under api/v1/complaints/

**admin.py:**
- Register Complaint and TransactionHop with search, list_filter, list_display

Add 'apps.complaints' to LOCAL_APPS in settings.
Add URL route in cybersandbox/urls.py.
Run makemigrations + migrate.
```

### Prompt 2.2 — Create Predictions App
```
Create a new Django app `apps/predictions/` with the following:

**models.py:**
- CashOutPrediction model:
  - complaint (FK to Complaint)
  - predicted_zone_name (CharField) — e.g., "Meerut District, ATM Cluster #3"
  - predicted_lat, predicted_lon (FloatField)
  - probability (FloatField 0.0-1.0)
  - eta_hours (FloatField) — estimated time to cash-out
  - rank (1-5 for top-5 predictions)
  - model_version (CharField)
  - feature_importance_json (JSONField) — SHAP values
  - outcome (enum: PENDING, INTERCEPTED, MISSED, FALSE_ALARM)
  - created_at, updated_at

- PredictionAlert model:
  - prediction (FK to CashOutPrediction)
  - officer (FK to User)
  - alert_type (enum: WEBSOCKET, SMS, EMAIL)
  - status (enum: SENT, ACKNOWLEDGED, DISPATCHED, EXPIRED)
  - sent_at, acknowledged_at, dispatched_at

**serializers.py:**
- PredictionSerializer (with nested complaint summary)
- PredictionDetailSerializer (with SHAP explanation)
- AlertSerializer

**views.py:**
- GeneratePredictionView (POST — triggers ML pipeline via Celery)
- PredictionListView (GET — active predictions with filters)
- PredictionDetailView (GET — single prediction with SHAP)
- PredictionOutcomeView (PATCH — mark intercepted/missed)
- HeatmapDataView (GET — returns geographic data for map)
- PredictionAccuracyView (GET — model performance stats)
- AlertListView, AlertAcknowledgeView, AlertDispatchView

**tasks.py (Celery):**
- generate_prediction_task(complaint_id) — runs ML pipeline, creates predictions, sends WebSocket alert

**urls.py:**
- Wire under api/v1/predictions/

Add 'apps.predictions' to LOCAL_APPS. Wire URLs. Migrate.
```

### Prompt 2.3 — Update WebSocket Consumers
```
Update apps/core/consumers.py to add a PredictionAlertConsumer:
- Group: 'prediction_alerts_{org_id}'
- On new prediction: push { type: 'prediction', complaint_id, zone, probability, eta }
- On alert acknowledge: broadcast to all officers in org

Update apps/core/routing.py:
- Add ws/predictions/ route for PredictionAlertConsumer

This replaces the old blockchain/threat WebSocket consumers.
```

---

## PHASE 3: ML Engine — Fraud Predictor (Day 3-5)

### Prompt 3.1 — Fraud Feature Extractor
```
Create apps/ml_engine/fraud_features.py:

Class FraudFeatureExtractor with method extract(complaint, transaction_chain) that computes
all 40 features defined in the PRD section 4.3.

For features that need geographic data (ATM density, historical cashout density),
use hardcoded lookup tables for top 50 Indian districts for the demo.

For features that need NLP (complaint_text_sentiment, urgency_score, keyword_risk_score),
use simple keyword matching and scoring — no heavy NLP library needed.

Return a numpy array of shape (1, 40) ready for model input.

Include a get_feature_names() method returning the 40 feature names in order.
```

### Prompt 3.2 — Cash-Out Predictor
```
Create apps/ml_engine/cashout_predictor.py:

Class CashOutPredictor that:
2. Takes 40-feature input from FraudFeatureExtractor
3. Runs weighted soft voting (50/30/20) to predict cash-out zone
4. Returns top-5 predicted zones with probabilities
5. Computes SHAP feature importance for the top prediction
6. Estimates ETA (hours until likely withdrawal)

The prediction targets are 20 ATM cluster zones across India (pre-defined).
Each zone has: zone_id, zone_name, lat, lon, district, state.

Include a train() method that:
- Takes training DataFrame
- Trains all 3 models
- Serializes to joblib files
- Returns accuracy metrics (F1, precision, recall per zone)

Include a generate_narrative(prediction, complaint) method that formats
a human-readable investigation brief using string templates (not Gemini — that's separate).
```

### Prompt 3.3 — Synthetic Training Data Generator
```
Create ml_models/scripts/generate_fraud_data.py:

Generate 10,000 synthetic cybercrime complaints with:
- Realistic Indian names, phone numbers, districts (all 28 states)
- Fraud amounts: ₹5K to ₹50L (log-normal distribution, median ₹1.5L)
- Fraud methods: UPI (45%), Phone (25%), Card (15%), NetBanking (10%), Other (5%)
- Transaction chains: 1-5 hops, with realistic bank names (SBI, HDFC, ICICI, etc.)
- Cash-out locations: 20 ATM cluster zones (target variable)
- Temporal patterns:
  - UPI fraud → cash-out within 2-4 hours, usually same state
  - Phone scam → cash-out within 4-8 hours, often neighboring state
  - Card fraud → cash-out within 1-2 hours, metro ATMs
- Geographic bias: High mule concentration in certain districts (based on I4C reports)

Output: training_data.csv with 40 features + target zone_id
Also output: atm_zones.json with the 20 zone definitions

Run this script to generate the data.
```

### Prompt 3.4 — Train Models
```
Create ml_models/scripts/train_cashout_models.py:

1. Load training_data.csv
2. Split 80/20 train/test
3. Handle class imbalance with SMOTE or class_weight
5. Evaluate: print classification report, confusion matrix
6. Save models to ml_models/saved_models/lgbm_model.joblib, etc.
8. Print overall model accuracy

Run this script to train and save the models.
```

---

## PHASE 4: Frontend — CrimeCast Dashboard (Day 5-8)

### Prompt 4.1 — Update Navigation & Sidebar
```
Update src/components/navigation/TriageSidebar.jsx:
Replace the current menu with CrimeCast navigation:
- Dashboard (home icon)
- Complaints (clipboard icon) — with sub-items: All Complaints, New Complaint
- Predictions (map-pin icon) — with sub-items: Active Predictions, Heatmap
- Alert Center (bell icon)
- Analytics (bar-chart icon)
- AI Advisor (message-circle icon)
- Settings (gear icon)

Update branding: "CrimeCast" logo text, gradient accent color (orange-red for urgency)
```

### Prompt 4.2 — Complaints Dashboard Page
```
Create src/components/complaints/ComplaintsDashboard.jsx:
- DataTable with columns: #, Date, Victim, Amount, Method, Status, Priority, Actions
- Status badges with colors (New=blue, Active=orange, Intercepted=green, Closed=gray)
- Filter bar: status dropdown, date range, search by victim name/complaint#
- "New Complaint" button → opens intake form
- Bulk import button → CSV upload modal
- Click row → navigate to detail page

Create src/components/complaints/ComplaintForm.jsx:
- Multi-step form: Step 1 (Victim Details) → Step 2 (Fraud Details) → Step 3 (Transaction Chain)
- Real-time validation
- On submit → POST to API → redirect to detail page

Create src/components/complaints/ComplaintDetail.jsx:
- Full complaint view with transaction chain visualization
- "Generate Prediction" button (triggers ML)
- Status timeline showing complaint lifecycle
- Link to prediction results when available
```

### Prompt 4.3 — Prediction Heatmap Page
```
Create src/components/predictions/PredictionMap.jsx:
- Full-width Leaflet.js map of India
- Heatmap layer showing historical fraud density by district
- Animated pulsing markers for active predictions
- Click marker → popup with: zone name, probability, ETA, "Dispatch" button
- Legend showing color scale
- Sidebar panel listing active predictions as cards

Install: npm install leaflet react-leaflet

Use OpenStreetMap tiles (free, no API key needed).
Include GeoJSON boundaries for Indian states (simplified).
```

### Prompt 4.4 — Alert Center Page
```
Create src/components/alerts/AlertCenter.jsx:
- Real-time alert list connected via WebSocket
- Each alert card shows:
  - Complaint # and fraud amount
  - Predicted zone and probability
  - Countdown timer (ETA to cash-out)
  - Action buttons: Acknowledge / Dispatch Team / False Alarm
- Alert sounds (optional browser notification)
- Sorted by urgency (highest probability + shortest ETA first)
```

### Prompt 4.5 — Dashboard Summary Page
```
Update src/components/pages/Dashboard.jsx for CrimeCast:
- Top stat cards: Total Complaints Today, Active Predictions, Interceptions This Week, Total Amount at Risk
- Recent complaints table (last 10)
- Active predictions mini-map
- Fraud trend line chart (last 30 days)
- Model accuracy gauge chart
```

### Prompt 4.6 — Landing Page Rebrand
```
Update src/components/pages/LandingPage.jsx:
- Hero: "CrimeCast — Predict Where Stolen Money Goes Before Criminals Cash Out"
- Subtitle: "AI-Powered Cybercrime Intelligence for Indian Law Enforcement"
- Stats: ₹11,333 crore lost, <5% recovery, 0 prediction tools exist
- How it works: 3-step graphic (Complaint → AI Prediction → Police Interception)
- CTA: "Login to Dashboard"
- Dark theme with orange-red accent gradients
- Animated counter showing "₹X crore potentially recoverable"
```

---

## PHASE 5: Integration & Demo Data (Day 9-11)

### Prompt 5.1 — Demo Seed Command
```
Create apps/core/management/commands/seed_crimecast_demo.py:

This management command populates the database with a realistic demo scenario:
1. Create users: Inspector Singh (IO), DSP Sharma (Supervisor), Admin
2. Create 50 past complaints (last 30 days) with various statuses
3. Create 5 "live" complaints with transaction chains (submitted today)
4. Auto-generate predictions for 3 of them
5. Create 2 active alerts
6. Create historical prediction data for analytics charts

Run with: python manage.py seed_crimecast_demo

This ensures the demo works perfectly every time with one command.
```

### Prompt 5.2 — Gemini Integration for Investigation Brief
```
Update apps/guru/ to generate investigation briefs:
When a prediction is generated, call Gemini 2.0 Flash with:

Prompt: "You are an AI assistant for Indian police cybercrime investigation.
Based on the following complaint and prediction data, generate a brief investigation
report (200 words max) with:
1. Summary of the fraud
2. Why the predicted cash-out location was identified
3. Recommended immediate actions for the investigating officer
4. Risk assessment

Complaint: {complaint_data}
Prediction: {prediction_data}
Top features: {shap_features}"

Store the narrative in the prediction record.
Display on the prediction detail page.
```

### Prompt 5.3 — End-to-End Flow Test
```
Test the complete flow:
1. Login as Inspector
2. Create complaint with form
3. Add 3 transaction hops
4. Click "Generate Prediction"
5. Verify prediction appears with map marker
6. Verify WebSocket alert fires
7. Click "Dispatch Team"
8. Verify alert status updates
9. Check analytics dashboard updates
10. Verify Gemini narrative generates

Fix any bugs found during this flow.
```

---

## PHASE 6: Polish & Presentation (Day 12-14)

### Prompt 6.1 — UI Polish Pass
```
Final polish across all pages:
1. Consistent color theme (dark + orange-red accents)
2. Loading skeletons on all data-fetching pages
3. Empty states with helpful messages
4. Error states with retry buttons
5. Responsive design for mobile (officer's phone)
6. Smooth page transitions with Framer Motion
7. Proper favicon and meta tags
```

### Prompt 6.2 — Docker Compose Production
```
Create/update docker-compose.production.yml:
- Django + Daphne (ASGI)
- PostgreSQL 16
- Redis 7
- Celery worker
- Celery beat
- Nginx reverse proxy
- One command: docker-compose -f docker-compose.production.yml up

Ensure the demo works with: docker-compose up && python manage.py seed_crimecast_demo
```

### Prompt 6.3 — PPT Content
```
Generate the content for the 5-slide pitch deck (text + speaker notes):

Slide 1: The Crisis — ₹11,333 crore lost, <5% recovery, zero prediction tools
Slide 2: CrimeCast Solution — Architecture diagram, Complaint→Prediction→Interception flow
Slide 3: Live Demo — Screenshot annotations, 5-minute flow walkthrough
Slide 4: ML Rigor — Architecture, SHAP, accuracy metrics, 40 features
Slide 5: Impact — ₹5,000 crore recoverable, open-source, deployable at any police station

Also create a Judge Q&A Cheat Sheet with answers to 15 likely questions.
```

---

## Execution Order Summary

```
Day 1:   Prompt 1.1 → 1.2 → 1.3 (Strip + Rebrand)
Day 2:   Prompt 2.1 → 2.2 (Backend apps)
Day 3:   Prompt 2.3 → 3.1 (WebSocket + Feature extractor)
Day 4:   Prompt 3.2 → 3.3 (Predictor + Synthetic data)
Day 5:   Prompt 3.4 → 4.1 (Train models + Navigation)
Day 6:   Prompt 4.2 → 4.3 (Complaints + Map)
Day 7:   Prompt 4.4 → 4.5 (Alerts + Dashboard)
Day 8:   Prompt 4.6 (Landing page)
Day 9:   Prompt 5.1 → 5.2 (Demo data + Gemini)
Day 10:  Prompt 5.3 (E2E testing)
Day 11:  Bug fixes from testing
Day 12:  Prompt 6.1 (UI polish)
Day 13:  Prompt 6.2 → 6.3 (Docker + PPT)
Day 14:  Final rehearsal + submission
```
