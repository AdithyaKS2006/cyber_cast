# CrimeCast Production Launch Runbook

## Pre-Launch (T-24h)
- [ ] DNS records pointing to server
- [ ] SSL certificates installed and valid
- [ ] `.env.production` filled with all secrets (run `cp .env.production.example .env.production`)
- [ ] ML models trained and verified (`scripts/train_models.py` run, `ml_models/saved_models/` populated)
- [ ] Backup script tested successfully (`bash scripts/backup.sh`)
- [ ] Monitoring alerts configured in Sentry
- [ ] Admin user created with strong password (`python manage.py createsuperuser`)

## Launch Day (T-0)

### Step 1: Start infrastructure
```bash
docker-compose -f docker-compose.production.yml up -d postgres redis
sleep 30
docker-compose -f docker-compose.production.yml exec postgres pg_isready
```

### Step 2: Run migrations & seed
```bash
docker-compose -f docker-compose.production.yml run web python manage.py migrate
docker-compose -f docker-compose.production.yml run web python manage.py seed_data
```

### Step 3: Train / verify ML models
```bash
docker-compose -f docker-compose.production.yml run web python ml_models/scripts/train_models.py
```

### Step 4: Start all application services
```bash
docker-compose -f docker-compose.production.yml up -d
sleep 30
```

### Step 5: Verify health
```bash
curl https://yourdomain.com/api/v1/health/
# Expected: {"status": "healthy", ...}
```

### Step 6: Smoke tests
```bash
bash scripts/test_all_endpoints.sh
```

### Step 7: Monitor for 30 minutes
```bash
watch -n 5 'curl -s https://yourdomain.com/api/v1/health/ | python -c "import sys,json; d=json.load(sys.stdin); print(d[\"status\"])"'
```
Also check Flower (http://yourdomain.com:5555) and Grafana (http://yourdomain.com:3000).

## Rollback Plan
If critical issues arise:
```bash
docker-compose -f docker-compose.production.yml down
# Restore DB from backup
gunzip -c /backups/cybersandbox/db_<timestamp>.sql.gz | psql "$DATABASE_URL"
# Restore media
tar -xzf /backups/cybersandbox/media_<timestamp>.tar.gz -C /
docker-compose -f docker-compose.production.yml up -d
```
