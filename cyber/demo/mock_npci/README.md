# Standalone Mock NPCI Fraud Alert Server

This is a mock NPCI server for simulating real-time fraud alert webhooks sent to the CrimeCast backend.

## Prerequisites

Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Mock Server

Run on port 8001:
```bash
uvicorn server:app --port 8001 --reload
```

## Available Endpoints

### 1. Health Check
`GET http://localhost:8001/health`
Returns:
```json
{
  "status": "mock_npci_running"
}
```

### 2. Trigger Fraud Alert Webhook
`POST http://localhost:8001/fire-fraud-alert`

Request Body (Optional parameters):
```json
{
  "amount": 250000,
  "fraud_score": 0.94,
  "bank": "HDFC"
}
```

The mock server will construct an HMAC-SHA256 signed NPCI alert payload using the shared secret `dev-secret-change-in-prod` and fire a POST request to `http://localhost:8000/api/v2/ingest/npci-alert/`.
