import requests
import json
import time

BASE_URL = 'http://localhost:8000/api/v1'

def print_step(step):
    print(f"\n{'='*50}\n[TEST] {step}\n{'='*50}")

def run_tests():
    # 1. Auth Test
    print_step("Auth & Login")
    try:
        res = requests.post(f"{BASE_URL}/users/login/", json={
            "email": "admin@cyber.gov.in",
            "password": "admin"
        })
        print("Login Status:", res.status_code)
        if res.status_code != 200:
            print("Response:", res.text)
            return
        token = res.json().get('token')
        headers = {'Authorization': f'Token {token}'}
        print("Login SUCCESS. Token obtained.")
    except Exception as e:
        print("Auth failed:", str(e))
        return

    # 2. Complaints
    print_step("Complaints Fetch")
    try:
        res = requests.get(f"{BASE_URL}/complaints/", headers=headers)
        print("Complaints Status:", res.status_code)
        complaints = res.json()
        print(f"Fetched {len(complaints)} complaints.")
        if len(complaints) == 0:
            print("No complaints found to test prediction!")
            return
        complaint_id = complaints[0]['id']
    except Exception as e:
        print("Complaints fetch failed:", str(e))
        return

    # 3. Prediction Generation
    print_step("Prediction Generation")
    try:
        res = requests.post(f"{BASE_URL}/predictions/generate/", headers=headers, json={"complaint_id": complaint_id})
        print("Generate Prediction Status:", res.status_code)
        print("Response:", res.json())
        time.sleep(2) # wait for async task
    except Exception as e:
        print("Prediction generation failed:", str(e))
        return

    # 4. Fetch Predictions
    print_step("Fetch Predictions")
    try:
        res = requests.get(f"{BASE_URL}/predictions/", headers=headers)
        print("Predictions Fetch Status:", res.status_code)
        preds = res.json()
        print(f"Fetched {len(preds)} predictions.")
        if len(preds) > 0:
            pred_id = preds[0]['id']
            # Fetch specific prediction
            res2 = requests.get(f"{BASE_URL}/predictions/{pred_id}/", headers=headers)
            print("Prediction Detail Status:", res2.status_code)
            detail = res2.json()
            print("Has Intelligence Package:", 'intelligence_package' in detail)
            if detail.get('intelligence_package'):
                print("Package ID:", detail['intelligence_package'].get('id'))
    except Exception as e:
        print("Predictions fetch failed:", str(e))

    # 5. Model Metrics
    print_step("Model Metrics")
    try:
        res = requests.get(f"{BASE_URL}/predictions/data/model-metrics/", headers=headers)
        print("Model Metrics Status:", res.status_code)
        metrics = res.json()
        print("Metrics:", json.dumps(metrics, indent=2)[:300], "...")
    except Exception as e:
        print("Model Metrics fetch failed:", str(e))

if __name__ == "__main__":
    run_tests()
