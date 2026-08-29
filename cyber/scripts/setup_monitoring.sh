#!/usr/bin/env bash
set -euo pipefail

# CrimeCast Production Monitoring Setup
# Installs and configures Sentry, Prometheus, and Grafana for production monitoring.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== CrimeCast Monitoring Setup ==="
echo "Project directory: $PROJECT_DIR"

# ── 1. Sentry (Error Tracking) ─────────────────────────────────────────────────
echo ""
echo "[1/3] Installing Sentry for error tracking..."
"$PROJECT_DIR/venv/bin/pip" install "sentry-sdk[django]" || {
    echo "  WARNING: Failed to install sentry-sdk. Install manually: pip install sentry-sdk[django]"
}

# Add Sentry initialization to production settings
SENTRY_SNIPPET="
# ── Sentry Error Tracking ──────────────────────────────────────────────────────
SENTRY_DSN = env('SENTRY_DSN', default='')
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.redis import RedisIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=env.float('SENTRY_TRACES_SAMPLE_RATE', default=0.1),
        send_default_pii=False,
        environment=env('SENTRY_ENVIRONMENT', default='production'),
        before_send=lambda event, hint: _sentry_before_send(event, hint),
    )

    def _sentry_before_send(event, hint):
        # Scrub sensitive data from error reports
        if 'request' in event:
            headers = event['request'].get('headers', {})
            sensitive_headers = ['cookie', 'authorization', 'x-csrftoken']
            for h in sensitive_headers:
                if h in headers:
                    del headers[h]
        return event
"

# Check if Sentry is already configured
PRODUCTION_SETTINGS="$PROJECT_DIR/crimecast/settings/production.py"
if [ -f "$PRODUCTION_SETTINGS" ] && ! grep -q "SENTRY_DSN" "$PRODUCTION_SETTINGS"; then
    echo "$SENTRY_SNIPPET" >> "$PRODUCTION_SETTINGS"
    echo "  Added Sentry initialization to production settings."
elif [ -f "$PRODUCTION_SETTINGS" ]; then
    echo "  Sentry already configured in production settings."
fi

# ── 2. Prometheus ──────────────────────────────────────────────────────────────
echo ""
echo "[2/3] Configuring Prometheus metrics..."

# Create Prometheus config
mkdir -p "$PROJECT_DIR/monitoring"
cat > "$PROJECT_DIR/monitoring/prometheus.yml" << 'PROM_EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert.rules.yml"

scrape_configs:
  - job_name: 'crimecast'
    static_configs:
      - targets: ['web:8000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance

  - job_name: 'celery-exporter'
    static_configs:
      - targets: ['flower:9090']
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
PROM_EOF

# Create alert rules
cat > "$PROJECT_DIR/monitoring/alert.rules.yml" << 'ALERT_EOF'
groups:
  - name: crimecast.alerts
    rules:
      - alert: HighCpuUsage
        expr: rate(crimecast_cpu_seconds_total[5m]) > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage has been above 80% for more than 2 minutes."

      - alert: HighMemoryUsage
        expr: rate(crimecast_memory_usage_bytes[5m]) > 0.85
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage has been above 85% for more than 2 minutes."

      - alert: DatabaseDown
        expr: up{job="crimecast"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Application is down"
          description: "The CrimeCast application is not responding."

      - alert: CeleryQueueBacklog
        expr: celery_inspect_active_tasks{job="crimecast"} > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Celery queue backlog"
          description: "More than 100 active tasks in Celery queue for 5+ minutes."
ALERT_EOF

echo "  Created Prometheus config: monitoring/prometheus.yml"
echo "  Created alert rules: monitoring/alert.rules.yml"

# ── 3. Grafana ────────────────────────────────────────────────────────────────
echo ""
echo "[3/3] Configuring Grafana dashboards..."

# Create Grafana provisioning directory
mkdir -p "$PROJECT_DIR/monitoring/grafana/provisioning/dashboards"
mkdir -p "$PROJECT_DIR/monitoring/grafana/provisioning/datasources"

# Datasource configuration
cat > "$PROJECT_DIR/monitoring/grafana/provisioning/datasources/datasource.yml" << 'DS_EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
  - name: Redis
    type: redis-datasource
    access: proxy
    url: redis://redis:6379
    jsonData:
      client:
        type: standalone
        addr: redis://redis:6379
DS_EOF

# Dashboard provisioning
cat > "$PROJECT_DIR/monitoring/grafana/provisioning/dashboards/dashboard.yml" << 'DASH_EOF'
apiVersion: 1

providers:
  - name: 'CrimeCast'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards
DASH_EOF

# Create dashboards directory
mkdir -p "$PROJECT_DIR/monitoring/grafana/dashboards"

# Main CrimeCast dashboard JSON
cat > "$PROJECT_DIR/monitoring/grafana/dashboards/crimecast.json" << 'DASH_JSON'
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "target": {
          "limit": 100,
          "matchAny": [],
          "preventEmpty": false
        }
      }
    ]
  },
  "description": "CrimeCast platform overview",
  "editable": true,
  "facy": false,
  "graphTooltip": 0,
  "id": null,
  "links": [],
  "live": false,
  "panels": [],
  "refresh": "10s",
  "schemaVersion": 38,
  "style": "dark",
  "tags": ["crimecast", "production"],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-6h",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "",
  "title": "CrimeCast Production Dashboard",
  "version": 1,
  "weekStart": ""
}
DASH_JSON

echo "  Created Grafana datasource: monitoring/grafana/provisioning/datasources/datasource.yml"
echo "  Created Grafana dashboard: monitoring/grafana/dashboards/crimecast.json"

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "=== Monitoring setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Set SENTRY_DSN, SENTRY_ENVIRONMENT in .env.production"
echo "  2. Deploy with: docker-compose -f docker-compose.production.yml up -d"
echo "  3. Access Grafana at: http://<your-server>:3000"
echo "  4. Access Prometheus at: http://<your-server>:9090"
echo "  5. Access Flower (Celery) at: http://<your-server>:5555"
echo "  6. Metrics endpoint: https://<your-domain>/metrics"
echo ""
