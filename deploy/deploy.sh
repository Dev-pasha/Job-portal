#!/usr/bin/env bash
#
# Builds and restarts the job portal after a code change.
# Run as the jobportal user:  sudo -u jobportal /opt/job-portal/deploy/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/job-portal}"

cd "$APP_DIR"

echo "==> Installing server dependencies"
cd "$APP_DIR/server"
npm ci --omit=dev

echo "==> Applying any database migrations"
# initDb() is idempotent, so this is safe to run on every deploy.
node -e "import('./src/db.js').then(m => m.initDb()).then(() => { console.log('schema up to date'); process.exit(0); })"

echo "==> Building the front end"
cd "$APP_DIR/client"
npm ci
npm run build

echo "==> Restarting the API"
sudo systemctl restart job-portal-api
sleep 2
sudo systemctl is-active --quiet job-portal-api \
  && echo "    API is running" \
  || { echo "    API failed to start. Run: journalctl -u job-portal-api -n 50"; exit 1; }

echo "==> Reloading nginx"
sudo nginx -t && sudo systemctl reload nginx

echo "Done."
