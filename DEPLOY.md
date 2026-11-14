# Deploying MediCare HMS to a Hostinger VPS

Stack on the server (Docker Compose): **PostgreSQL** → **FastAPI backend** → **nginx** (serves the React build on port 80 and proxies `/api` to the backend). Only port 80 is exposed; the database and backend are internal.

## First deploy

1. In hPanel → **VPS** → pick **Ubuntu 22.04/24.04** as the OS, note the **IP** and **root password**.
2. SSH in from your PC (PowerShell works):
   ```bash
   ssh root@YOUR_SERVER_IP
   ```
3. Get the code and deploy:
   ```bash
   apt-get update && apt-get install -y git
   git clone https://github.com/Ziahullah/HospitalManagemet.git
   cd HospitalManagemet
   bash deploy.sh
   ```
   If the repo is **private**, git asks for a username and password: use your GitHub username and a
   **Personal Access Token** (GitHub → Settings → Developer settings → Fine-grained tokens, *Contents: read-only*) as the password.
4. Open `http://YOUR_SERVER_IP` and click **Register** to create the first account.

`deploy.sh` installs Docker if needed, opens ports 22/80 in `ufw`, generates `.env` with random DB password and `SECRET_KEY` (only on the first run), builds and starts everything, then checks `/health`.

> If the site doesn't load, check **hPanel → VPS → Security → Firewall** and allow TCP port 80.

## Updating after code changes

Push to GitHub from your PC, then on the server:
```bash
cd HospitalManagemet && bash deploy.sh
```
Data lives in the `postgres_data` Docker volume and survives redeploys.

## Useful commands (on the server)

```bash
docker compose ps                      # container status
docker compose logs -f backend         # backend logs
docker compose restart backend
docker compose exec db pg_dump -U hms hospital > backup.sql   # database backup
```

## Later: domain + HTTPS

Point your domain's **A record** to the server IP, set `PUBLIC_URL=https://your-domain` in `.env`, and put a TLS proxy (e.g. Caddy or certbot + nginx) in front of port 80.
