#!/bin/bash
set -e

BASE="${BASE_URL:-http://localhost:8000/api/v1}"

echo "Testing health check..."
HEALTH=$(curl -s "$BASE/health/")
echo "$HEALTH" | python -c "import sys,json; d=json.load(sys.stdin); print('PASS' if d['status']=='healthy' else 'FAIL: '+str(d))"

echo "Testing login..."
LOGIN=$(curl -s -c /tmp/cookies_test.txt -X POST "$BASE/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cyber.io","password":"demo1234"}')
echo "$LOGIN" | python -c "import sys,json; d=json.load(sys.stdin); print('PASS' if 'user' in d else 'FAIL: '+str(d))"

CSRF=$(cat /tmp/cookies_test.txt | grep csrftoken | awk '{print $7}')

echo "Testing threat feed..."
THREATS=$(curl -s -b /tmp/cookies_test.txt "$BASE/threats/")
echo "$THREATS" | python -c "import sys,json; d=json.load(sys.stdin); print('PASS' if 'results' in d else 'FAIL: '+str(d))"

echo "Testing ML classify..."
ML=$(curl -s -b /tmp/cookies_test.txt -X POST "$BASE/ml/classify/" \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF" \
  -d '{"value":"185.220.101.45","type":"ip"}')
echo "$ML" | python -c "import sys,json; d=json.load(sys.stdin); print('PASS' if 'classification' in d else 'FAIL: '+str(d))"

echo "Testing dashboard stats..."
DASH=$(curl -s -b /tmp/cookies_test.txt "$BASE/analytics/dashboard/")
echo "$DASH" | python -c "import sys,json; d=json.load(sys.stdin); print('PASS' if 'kpis' in d else 'FAIL: '+str(d))"

echo "Testing notifications endpoint..."
NOTIF=$(curl -s -b /tmp/cookies_test.txt "$BASE/admin/notifications/")
echo "$NOTIF" | python -c "import sys,json; d=json.load(sys.stdin); print('PASS' if 'results' in d else 'FAIL: '+str(d))"

echo "All endpoint tests complete."
