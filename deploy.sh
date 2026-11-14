#!/usr/bin/env bash
# One-command deploy for an Ubuntu/Debian VPS (e.g. Hostinger KVM).
# Run from the repo root on the server:  sudo bash deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root: sudo bash deploy.sh" >&2
  exit 1
fi

# 1. Docker
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true

# 2. Firewall (only if ufw is installed)
if command -v ufw >/dev/null 2>&1; then
  log "Opening ports 22 (SSH) and 80 (HTTP)"
  ufw allow OpenSSH >/dev/null || ufw allow 22/tcp >/dev/null
  ufw allow 80/tcp >/dev/null
fi

# 3. Production .env (generated once, never overwritten)
if [ ! -f .env ]; then
  log "Creating .env with random secrets"
  IP="$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')"
  cat > .env <<EOF
PUBLIC_URL=http://${IP}
DB_USER=hms
DB_PASSWORD=$(openssl rand -hex 24)
DB_NAME=hospital
SECRET_KEY=$(openssl rand -hex 48)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EOF
  chmod 600 .env
fi

# 4. Pull latest code (if this is a git checkout) and (re)build
if [ -d .git ]; then
  log "Pulling latest code"
  git pull --ff-only || echo "git pull skipped (local changes or no network)"
fi

log "Building and starting containers (first run takes a few minutes)"
docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null

# 5. Health check
log "Waiting for the app to come up"
for _ in $(seq 1 30); do
  if curl -fsS http://localhost/health >/dev/null 2>&1; then
    URL="$(grep '^PUBLIC_URL=' .env | cut -d= -f2-)"
    log "Deployed! Open ${URL}  (API docs: ${URL}/docs)"
    docker compose ps
    exit 0
  fi
  sleep 2
done

echo "App did not become healthy. Recent logs:" >&2
docker compose logs --tail=50 backend frontend >&2
exit 1
