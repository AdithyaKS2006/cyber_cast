# CFCFRMS / NCRP Field Mapping Appendix
**Document Version:** 1.0  
**Specification Standards:** `I4C-NCRP-FUND-FREEZE-v2.1` & `I4C-LEA-DISPATCH-v3.0`  
**Purpose:** Standalone Judge-Facing Field Mapping Documentation for Smart India Hackathon 2026 (Problem Statement 26184).

---

## 1. Overview & Protocol Specification

CrimeCast formats all financial fraud interdiction and cross-jurisdiction law enforcement dispatches to strictly mirror the national schemas utilized by the **Citizen Financial Cyber Fraud Reporting and Management System (CFCFRMS)** and the **National Cybercrime Reporting Portal (NCRP)** under the **Indian Cyber Crime Coordination Centre (I4C), Ministry of Home Affairs (MHA)**.

Although live production gateways operate in a restricted network environment requiring official LEA credentials, CrimeCast generates **100% schema-compliant integration payloads** stamped with `[SIMULATED DELIVERY]`.

---

## 2. Payload Schema 1: Bank & ATM Fund Freeze Payload
**Specification Name:** `I4C-NCRP-FUND-FREEZE-v2.1`  
**Target Gateways:** Bank Cyber Cells, NPCI Switch Gateways, Payment Aggregators  
**Legal / Statutory Basis:** Section 91 CrPC / Section 94 BNSS (Notice to Produce Documents / Freeze Property)

| CrimeCast Internal Field | CFCFRMS / NCRP Field Name | Data Type | Source & Mandate Description |
| :--- | :--- | :--- | :--- |
| `complaint.complaint_number` | `ncrp_ack_number` | String | NCRP 14-digit National Complaint Acknowledgement Number |
| `bank_alert.target_institution` | `target_financial_institution` | String | Target Bank / Payment Aggregator Name (e.g., SBI, HDFC, Paytm) |
| `transaction_hop.to_ifsc` | `ifsc_code` | String | RBI 11-character Indian Financial System Code for beneficiary branch |
| `transaction_hop.to_account` | `beneficiary_account` | String | Beneficiary / Mule Account Number or Virtual Payment Address (VPA) |
| `transaction_hop.transaction_id` | `utr_rrn_reference` | String | Banking Unique Transaction Reference (UTR) / NPCI Retrieval Reference Number (RRN) |
| `complaint.fraud_amount` | `disputed_amount_inr` | Float / Decimal | Total defrauded amount subject to temporary lien / freeze order |
| `prediction.predicted_zone_name` | `predicted_cashout_zone` | String | CrimeCast AI predicted physical cash-out district |
| `prediction.eta_hours` | `eta_window_hours` | Integer | Predicted timeframe window prior to cash-out depletion |
| Custom Action Code | `freeze_action` | Enum String | Standard Action Enum: `FREEZE_BENEFICIARY_ACCOUNT_SEC_91_CRPC` |

---

## 3. Payload Schema 2: Cross-Jurisdiction LEA Nodal Dispatch Payload
**Specification Name:** `I4C-LEA-DISPATCH-v3.0`  
**Target Gateways:** State Cyber Nodal Officers, District Police Control Rooms, Field Patrol Units  
**Legal / Statutory Basis:** Information Technology Act (Sec 66D) / BNSS Sec 94

| CrimeCast Internal Field | CFCFRMS / NCRP Field Name | Data Type | Source & Mandate Description |
| :--- | :--- | :--- | :--- |
| `complaint.complaint_number` | `ncrp_acknowledgement_no` | String | NCRP National Complaint ID for cross-jurisdiction referencing |
| `complaint.victim_district` | `origin_victim_district` | String | District where the victim resides / filed the initial complaint |
| `complaint.victim_state` | `origin_victim_state` | String | State where victim complaint originated |
| `lea_dispatch.target_district` | `target_interdiction_district` | String | Predicted destination district receiving actionable dispatch |
| Computed Nodal Agency | `target_nodal_agency` | String | Destination District Cyber Cell / Superintendent of Police Office |
| `complaint.fraud_amount` | `total_defrauded_amount_inr` | Float / Decimal | Cumulative defrauded capital across transaction chain |
| `complaint.transaction_hops.count()` | `layering_hop_depth` | Integer | Total number of layering bank hops recorded prior to cash-out |
| `prediction.predicted_zone_name` | `predicted_cashout_zone` | String | Specific hot zone identified for physical ATM/mule interdiction |
| `prediction.confidence_score` | `prediction_confidence` | Float (0.0–1.0) | Calibrated ML probability score for target district ranking |
| `prediction.eta_hours` | `eta_window_hours` | Integer | Estimated hours remaining before cash-out completion |
| Custom Action Code | `dispatch_action` | Enum String | Standard Action Enum: `INTERCEPT_FIELD_CASH_OUT_HOTSPOT` |

---

## 4. Sample Integration Payload Excerpts

### A. `I4C-NCRP-FUND-FREEZE-v2.1` Payload Sample
```json
{
  "header": {
    "specification": "I4C-NCRP-FUND-FREEZE-v2.1",
    "message_id": "8f3b2a1c-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    "timestamp": "2026-08-26T16:30:00Z",
    "urgency": "IMMEDIATE",
    "delivery_mode": "SIMULATED_DELIVERY",
    "simulation_notice": "[SIMULATED DELIVERY] Formatted for CFCFRMS / NCRP Gateway Integration"
  },
  "cfcfrms_mapping": {
    "ncrp_ack_number": "302026082600123",
    "target_financial_institution": "State Bank of India",
    "ifsc_code": "SBIN0001234",
    "beneficiary_account": "3849102948102",
    "utr_rrn_reference": "UTR2026082699120",
    "disputed_amount_inr": 250000.00,
    "freeze_action": "FREEZE_BENEFICIARY_ACCOUNT_SEC_91_CRPC",
    "predicted_cashout_zone": "Jamtara",
    "eta_window_hours": 3
  }
}
```

### B. `I4C-LEA-DISPATCH-v3.0` Payload Sample
```json
{
  "header": {
    "specification": "I4C-LEA-DISPATCH-v3.0",
    "message_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "timestamp": "2026-08-26T16:30:00Z",
    "urgency": "CRITICAL",
    "delivery_mode": "SIMULATED_DELIVERY",
    "simulation_notice": "[SIMULATED DELIVERY] Formatted for Cross-Jurisdiction LEA Nodal Dispatch"
  },
  "cfcfrms_mapping": {
    "ncrp_acknowledgement_no": "302026082600123",
    "origin_victim_district": "Bengaluru Urban",
    "origin_victim_state": "Karnataka",
    "target_interdiction_district": "Jamtara",
    "target_nodal_agency": "Jamtara District Cyber Cell",
    "total_defrauded_amount_inr": 250000.00,
    "layering_hop_depth": 3,
    "predicted_cashout_zone": "Jamtara",
    "prediction_confidence": 0.88,
    "eta_window_hours": 3,
    "dispatch_action": "INTERCEPT_FIELD_CASH_OUT_HOTSPOT",
    "statutory_basis": "Information Technology Act Sec 66D / BNSS Sec 94"
  }
}
```
