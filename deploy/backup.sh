#!/usr/bin/env bash
#
# Backs up the database AND the uploaded files. Both are needed: a database dump
# alone does not contain the CVs, and the files alone have no applications
# attached to them.
#
# Suggested cron entry (3am daily), as the jobportal user:
#   0 3 * * * /opt/job-portal/deploy/backup.sh >> /var/log/job-portal-backup.log 2>&1
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/job-portal}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/job-portal}"
KEEP_DAYS="${KEEP_DAYS:-30}"
STAMP="$(date +%Y-%m-%d_%H%M)"

# DATABASE_URL comes from the app's own .env, so there is one place to change it.
set -a
# shellcheck disable=SC1091
source "$APP_DIR/server/.env"
set +a

mkdir -p "$BACKUP_DIR"

echo "[$(date -Is)] Backing up database"
pg_dump "$DATABASE_URL" --no-owner --format=custom \
  --file="$BACKUP_DIR/db_$STAMP.dump"

echo "[$(date -Is)] Backing up uploaded files"
tar -czf "$BACKUP_DIR/files_$STAMP.tar.gz" -C "$APP_DIR/server" data

echo "[$(date -Is)] Removing backups older than $KEEP_DAYS days"
find "$BACKUP_DIR" -name 'db_*.dump'      -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'files_*.tar.gz' -mtime +"$KEEP_DAYS" -delete

echo "[$(date -Is)] Done. Current backups:"
ls -lh "$BACKUP_DIR" | tail -5

# A backup you have never restored is a guess, not a backup. To test one:
#   createdb jobportal_restore_test
#   pg_restore -d jobportal_restore_test --no-owner BACKUP_DIR/db_STAMP.dump
