#!/usr/bin/env bash
set -euo pipefail

SERVER="192.168.1.103"
REMOTE_DIR="/opt/divenet"
SSH_USER="${DEPLOY_USER:-$(whoami)}"

echo "==> Syncing to ${SSH_USER}@${SERVER}:${REMOTE_DIR}"
rsync -az --delete \
  --exclude='.git' \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.md' \
  --exclude='supabase/.branches' \
  --exclude='supabase/.temp' \
  ./ "${SSH_USER}@${SERVER}:${REMOTE_DIR}/"

echo "==> Deploying on server"
ssh "${SSH_USER}@${SERVER}" bash -s <<'REMOTE'
  set -euo pipefail
  cd /opt/divenet
  source .env

  if [ ! -f .env ]; then
    echo "ERROR: /opt/divenet/.env not found"
    echo "Copy .env.example to .env and fill in the values"
    exit 1
  fi

  # Rebuild and restart all services
  docker compose down --remove-orphans
  docker compose up -d --build

  # Wait for Postgres to be healthy
  echo "==> Waiting for database..."
  for i in $(seq 1 30); do
    if docker compose exec -T db pg_isready -U postgres -q 2>/dev/null; then
      break
    fi
    sleep 2
  done

  # supabase/postgres creates internal roles without passwords — set them
  echo "==> Configuring database roles..."
  docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db \
    psql -U supabase_admin -d postgres -c "
      ALTER ROLE supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';
      ALTER ROLE authenticator WITH PASSWORD '$POSTGRES_PASSWORD';
    " 2>/dev/null || true

  # Restart auth and rest now that passwords are set
  docker compose restart auth rest
  sleep 8

  # Run migrations
  echo "==> Running migrations..."
  for f in supabase/migrations/*.sql; do
    echo "    $f"
    docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db \
      psql -U supabase_admin -d postgres -f /dev/stdin < "$f"
  done

  echo ""
  echo "==> Done!"
  echo "    App: http://$(hostname -I | awk '{print $1}'):3000"
  echo "    API: http://$(hostname -I | awk '{print $1}'):54321"
REMOTE
