#!/bin/bash
# Install cron job for automated backups
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_CMD="cd $SCRIPT_DIR/.. && bash scripts/backup.sh >> /var/log/crimecast-backup.log 2>&1"

# Add to crontab (runs at 2:00 AM daily)
(crontab -l 2>/dev/null | grep -v 'backup.sh'; echo "0 2 * * * $BACKUP_CMD") | crontab -
echo "Cron job installed. Backups will run daily at 2:00 AM."
echo "View backup logs: tail -f /var/log/crimecast-backup.log"
