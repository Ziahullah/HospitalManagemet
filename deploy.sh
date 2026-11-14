#!/usr/bin/env bash
# One-command deploy for an Ubuntu/Debian VPS (e.g. Hostinger KVM).
# Run from the repo root on the server:
#   sudo bash deploy.sh                 # serve on http://<server-ip>
#   sudo bash deploy.sh hms.example.com # serve on https://hms.example.com (auto HTTPS)
set -euo pipefail
cd "$(dirname "$0")"

# Whole script lives in main() so bash parses it fully before running;
# otherwise "git pull" below could rewrite this file while it executes.
main() {

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
DOMAIN="${1:-}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root: sudo bash deploy.sh [domain]" >&2
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
  log "Opening ports 22 (SSH), 80 (HTTP), 443 (HTTPS)"
  ufw allow 22/tcp >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
fi

# 3. Production .env (secrets generated once, never overwritten)
if [ ! -f .env ]; then
  log "Creating .env with random secrets"
  IP="$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')"
  cat > .env <<EOF
PUBLIC_URL=http://${IP}
SITE_ADDRESS=:80
DB_USER=hms
DB_PASSWORD=$(openssl rand -hex 24)
DB_NAME=hospital
SECRET_KEY=$(openssl rand -hex 48)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EOF
  chmod 600 .env
fi

set_env() {  # set_env KEY VALUE  (replace or append)
  if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi
}

if [ -n "$DOMAIN" ]; then
  log "Configuring domain ${DOMAIN} (HTTPS via Let's Encrypt)"
  set_env PUBLIC_URL "https://${DOMAIN}"
  set_env SITE_ADDRESS "${DOMAIN}"
fi

# 4. Pull latest code (if this is a git checkout) and (re)build
if [ -d .git ]; then
  log "Pulling latest code"
  git pull --ff-only || echo "git pull skipped (local changes or no network)"
fi

log "Building and starting containers (first run takes a few minutes)"
docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null

# 5. Health check (from inside the Docker network, independent of DNS/HTTPS)
log "Waiting for the app to come up"
for _ in $(seq 1 45); do
  if docker compose exec -T frontend wget -qO- http://127.0.0.1/health >/dev/null 2>&1; then
    URL="$(grep '^PUBLIC_URL=' .env | cut -d= -f2-)"
    docker compose ps
    log "Deployed! Open ${URL}   (API docs: ${URL}/docs)"
    exit 0
  fi
  sleep 2
done

echo "App did not become healthy. Recent logs:" >&2
docker compose logs --tail=50 backend frontend caddy >&2
exit 1
}

main "$@"
exit $?
