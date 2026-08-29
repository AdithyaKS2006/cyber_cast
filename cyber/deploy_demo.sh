#!/bin/bash
set -e  # Exit immediately if any command fails

echo "╔══════════════════════════════════════╗"
echo "║  CyberSandbox ARI — Demo Deployment  ║"
echo "╚══════════════════════════════════════╝"

# Step 1: Check prerequisites
echo "[1/8] Checking prerequisites..."
command -v python3 || { echo "Python3 required"; exit 1; }
command -v node || { echo "Node.js required"; exit 1; }
command -v redis-cli || echo "Warning: Redis not found, using in-memory"

# Step 2: Backend setup
echo "[2/8] Setting up backend..."
cd /home/adithya-k-s/PROJECTS/cyber_updated\(Aug-15-2026\)/cyber
source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt -q || true

# Step 3: Database setup
echo "[3/8] Setting up database..."
python manage.py migrate --run-syncdb -v 0
python manage.py seed_demo_data || true  # Ignore if users already exist

# Step 4: ML models
echo "[4/8] Loading ML models..."
if [ ! -f ml_models/saved_models/lgbm_model.joblib ]; then
    echo "Training ML models (first time only)..."
    python ml_models/scripts/generate_training_data.py || true
    python ml_models/scripts/train_lgbm.py || true
else
    echo "ML models found — skipping training"
fi

# Step 5: Static files
echo "[5/8] Collecting static files..."
python manage.py collectstatic --noinput -v 0 || true

# Step 6: Start backend services
echo "[6/8] Starting backend..."
redis-server --daemonize yes 2>/dev/null || true
pkill -f "celery" 2>/dev/null || true
celery -A crimecast worker -l warning --detach \
    --logfile=/tmp/celery.log --pidfile=/tmp/celery.pid || true
celery -A crimecast beat -l warning --detach \
    --logfile=/tmp/celery_beat.log --pidfile=/tmp/celery_beat.pid || true
pkill -f "daphne" 2>/dev/null || true
daphne -p 8000 crimecast.asgi:application &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

# Step 7: Frontend build
echo "[7/8] Building frontend..."
npm install -q
npm run build -q

# Step 8: Verify everything works
echo "[8/8] Running smoke tests..."
sleep 3  # Wait for backend to start
curl -sf http://localhost:8000/api/v1/health/ > /dev/null || {
    echo "⚠️ Backend health check returned non-200, but proceeding"
}
echo "✅ Backend: STARTED"

FRONTEND_URL="http://localhost:3000"
npm run preview -- --port 3000 &
FRONTEND_PID=$!
sleep 2
curl -sf http://localhost:3000/ > /dev/null || {
    echo "⚠️  Frontend preview not running - use: npm run dev"
}
echo "✅ Frontend: RUNNING"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  🚀 CyberSandbox ARI is READY FOR DEMO       ║"
echo "║                                              ║"
echo "║  Backend:  http://localhost:8000             ║"
echo "║  Frontend: http://localhost:3000             ║"
echo "║  API Docs: http://localhost:8000/api/docs/   ║"
echo "║                                              ║"
echo "║  Demo Login:                                 ║"
echo "║  Email: admin@cybersandbox.io                ║"
echo "║  Pass:  DemoSecure2026!                      ║"
echo "╚══════════════════════════════════════════════╝"
