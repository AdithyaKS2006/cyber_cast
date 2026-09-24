#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          CrimeCast v3.0 — SIH 2026 Production Demo           ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Step 1: Check prerequisites
echo "[1/6] Checking runtime environment..."
command -v python3 >/dev/null || { echo "❌ Python 3 required"; exit 1; }
command -v node >/dev/null || { echo "❌ Node.js required"; exit 1; }

# Step 2: Virtual environment & migrations
echo "[2/6] Activating virtualenv & applying database migrations..."
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "../venv/bin/activate" ]; then
    source ../venv/bin/activate
fi

python manage.py migrate --run-syncdb -v 0

# Step 3: Seed high-impact showcase scenario
echo "[3/6] Seeding high-impact showcase scenario (Operation Garuda)..."
python demo/seed_demo_data.py

# Step 4: Ensure frontend build is up-to-date
echo "[4/6] Building production frontend bundles..."
npm run build -q

# Step 5: Stop any orphaned instances
echo "[5/6] Ensuring clean port allocation..."
pkill -f "crimecast.asgi" 2>/dev/null || true
pkill -f "manage.py runserver" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Step 6: Launch Backend & Frontend Services
echo "[6/6] Launching CrimeCast servers..."

# Try ASGI Daphne first for live WebSockets; fallback to runserver
if [ -f "venv/bin/daphne" ]; then
    nohup ./venv/bin/daphne -b 0.0.0.0 -p 8000 crimecast.asgi:application > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    disown $BACKEND_PID 2>/dev/null || true
    echo "✓ Backend running on Daphne ASGI (PID: $BACKEND_PID)"
else
    nohup python manage.py runserver 0.0.0.0:8000 > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    disown $BACKEND_PID 2>/dev/null || true
    echo "✓ Backend running on Django dev server (PID: $BACKEND_PID)"
fi

# Launch Vite Preview with nohup
nohup npm run preview -- --port 3000 --host 0.0.0.0 > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
disown $FRONTEND_PID 2>/dev/null || true
echo "✓ Frontend running on Vite Preview (PID: $FRONTEND_PID)"

sleep 3

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🚀 CrimeCast v3.0 IS READY FOR SIH 2026 EVALUATION          ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  🌐 Web Interface:      http://localhost:3000                ║"
echo "║  ⚙️  Backend API:        http://localhost:8000                ║"
echo "║  📚 OpenAPI Swagger:    http://localhost:8000/api/docs/      ║"
echo "║                                                              ║"
echo "║  🔑 Demo Credentials:                                        ║"
echo "║     Director / Admin:  admin   / admin123                    ║"
echo "║     Lead Analyst:      analyst / analyst123                  ║"
echo "║                                                              ║"
echo "║  🎯 5 Killer Demo Showcase Stops:                            ║"
echo "║  1. Live Voice Intake:       /app/complaints/new             ║"
echo "║  2. Golden Window Countdown: /app/complaints/                ║"
echo "║  3. ISO 20022 camt.056 XML:  /app/predictions/              ║"
echo "║  4. Cross-Mule Syndicate:    /app/intelligence/mule-network  ║"
echo "║  5. BNSS Sec 106 Notice PDF: /app/freeze/queue/              ║"
echo "║                                                              ║"
echo "║  🛑 To stop services: run ./stop_demo.sh                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
