#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups/crimecast}"
LOG_FILE="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "Starting backup $TIMESTAMP"

# Database backup
if [ -n "${DATABASE_URL:-}" ]; then
    log "Backing up database..."
    pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"
    log "Database backup: $BACKUP_DIR/db_$TIMESTAMP.sql.gz ($(du -sh "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" | cut -f1))"
else
    log "WARNING: DATABASE_URL not set, skipping database backup"
fi

# ML models backup
if [ -d "ml_models/saved_models" ]; then
    log "Backing up ML models..."
    tar -czf "$BACKUP_DIR/models_$TIMESTAMP.tar.gz" ml_models/saved_models/
    log "Models backup: $BACKUP_DIR/models_$TIMESTAMP.tar.gz"
fi

# Media files backup
if [ -d "media" ] && [ "$(ls -A media 2>/dev/null)" ]; then
    log "Backing up media files..."
    tar -czf "$BACKUP_DIR/media_$TIMESTAMP.tar.gz" media/
    log "Media backup: $BACKUP_DIR/media_$TIMESTAMP.tar.gz"
fi

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete
log "Cleaned up backups older than 30 days"

log "Backup complete: $TIMESTAMP"

# Optional: Upload to S3
if [ -n "${AWS_BACKUP_BUCKET:-}" ] && command -v aws &> /dev/null; then
    log "Uploading to S3..."
    aws s3 cp "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" "s3://$AWS_BACKUP_BUCKET/db/" --only-show-errors
    log "Uploaded to S3: s3://$AWS_BACKUP_BUCKET/db/db_$TIMESTAMP.sql.gz"
fi
