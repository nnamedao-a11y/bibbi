#!/usr/bin/env bash
# =============================================================================
# BIBI Cars — Quick start (clone → install → seed → run)
# =============================================================================
# Idempotent. Safe to re-run after pulling new commits.
#
# Usage:
#   bash scripts/quickstart.sh                # full bootstrap (default)
#   bash scripts/quickstart.sh --no-install   # skip dep install (faster re-runs)
#   bash scripts/quickstart.sh --no-services  # do everything except (re)start services
#   bash scripts/quickstart.sh --skip-mongo   # do not start local mongod
# =============================================================================
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

C_RESET='\033[0m'; C_GREEN='\033[1;32m'; C_YELLOW='\033[1;33m'; C_RED='\033[1;31m'; C_BLUE='\033[1;34m'
step() { printf "\n${C_BLUE}▶ %s${C_RESET}\n" "$*"; }
ok()   { printf "  ${C_GREEN}✓${C_RESET} %s\n" "$*"; }
warn() { printf "  ${C_YELLOW}!${C_RESET} %s\n" "$*"; }
fail() { printf "  ${C_RED}✗${C_RESET} %s\n" "$*" >&2; exit 1; }

INSTALL_DEPS=true
RESTART_SERVICES=true
START_MONGO=true
for arg in "$@"; do
  case "$arg" in
    --no-install)  INSTALL_DEPS=false ;;
    --no-services) RESTART_SERVICES=false ;;
    --skip-mongo)  START_MONGO=false ;;
    -h|--help)     sed -n '4,15p' "$0"; exit 0 ;;
    *) warn "Unknown flag: $arg (ignored)" ;;
  esac
done

# ─── 1. Toolchain check ─────────────────────────────────────────────
step "Checking toolchain"
for bin in python3 pip yarn node; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    fail "Required tool not found: $bin"
  else
    ok "$bin: $(command -v $bin)"
  fi
done
PY_VER="$(python3 -c 'import sys;print("%d.%d"%sys.version_info[:2])')"
[[ "$(printf '%s\n3.10\n' "$PY_VER" | sort -V | head -1)" == "3.10" ]] || fail "Python >= 3.10 required (got $PY_VER)"
NODE_VER="$(node -v | sed 's/v//')"
[[ "$(printf '%s\n18.0.0\n' "$NODE_VER" | sort -V | head -1)" == "18.0.0" ]] || fail "Node >= 18 required (got $NODE_VER)"
ok "Python $PY_VER, Node $NODE_VER"

# ─── 2. .env files ───────────────────────────────────────────────────
step "Bootstrapping .env files"
for side in backend frontend; do
  if [[ ! -f "$ROOT_DIR/$side/.env" ]]; then
    if [[ -f "$ROOT_DIR/$side/.env.example" ]]; then
      cp "$ROOT_DIR/$side/.env.example" "$ROOT_DIR/$side/.env"
      ok "$side/.env created from .env.example"
      warn "Edit $side/.env and fill in real secrets before running in production"
    else
      fail "$side/.env.example missing — cannot bootstrap"
    fi
  else
    ok "$side/.env already present"
  fi
done

# Auto-fill JWT_SECRET / EXT_SHARED_SECRET if still placeholders
if grep -q "^JWT_SECRET=CHANGE_ME" "$ROOT_DIR/backend/.env" 2>/dev/null; then
  NEW=$(openssl rand -hex 32 2>/dev/null || python3 -c 'import secrets;print(secrets.token_hex(32))')
  sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$NEW|" "$ROOT_DIR/backend/.env" && rm -f "$ROOT_DIR/backend/.env.bak"
  ok "Generated JWT_SECRET"
fi
if grep -q "^EXT_SHARED_SECRET=CHANGE_ME" "$ROOT_DIR/backend/.env" 2>/dev/null; then
  NEW=$(openssl rand -hex 32 2>/dev/null || python3 -c 'import secrets;print(secrets.token_hex(32))')
  sed -i.bak "s|^EXT_SHARED_SECRET=.*|EXT_SHARED_SECRET=$NEW|" "$ROOT_DIR/backend/.env" && rm -f "$ROOT_DIR/backend/.env.bak"
  ok "Generated EXT_SHARED_SECRET"
fi

# ─── 3. MongoDB ───────────────────────────────────────────────────────
if $START_MONGO; then
  step "Checking MongoDB"
  if pgrep -x mongod >/dev/null 2>&1 || (command -v supervisorctl >/dev/null 2>&1 && supervisorctl status mongodb 2>/dev/null | grep -q RUNNING); then
    ok "mongod is already running"
  elif command -v mongod >/dev/null 2>&1; then
    mkdir -p /var/lib/mongo /var/log/mongodb 2>/dev/null || true
    nohup mongod --bind_ip 127.0.0.1 --port 27017 --dbpath /var/lib/mongo --logpath /var/log/mongodb/mongod.log >/dev/null 2>&1 &
    sleep 2
    ok "mongod started in background"
  else
    warn "mongod binary not found — expecting an external MongoDB at the URL in backend/.env"
  fi
fi

# ─── 4. Install dependencies ─────────────────────────────────────────
if $INSTALL_DEPS; then
  step "Installing backend Python dependencies"
  pip install --quiet --upgrade pip
  pip install --quiet -r "$ROOT_DIR/backend/requirements.txt"
  ok "backend deps installed ($(wc -l < "$ROOT_DIR/backend/requirements.txt") packages)"

  step "Installing frontend Node dependencies (yarn)"
  (cd "$ROOT_DIR/frontend" && yarn install --silent)
  ok "frontend deps installed"
fi

# ─── 5. Restart services ────────────────────────────────────────────────
if $RESTART_SERVICES; then
  if command -v supervisorctl >/dev/null 2>&1; then
    step "Restarting services via supervisor"
    sudo supervisorctl restart backend frontend 2>/dev/null || supervisorctl restart backend frontend
    sleep 6
    sudo supervisorctl status 2>/dev/null || supervisorctl status
  else
    warn "supervisorctl not found — starting backend + frontend in dev mode"
    bash "$ROOT_DIR/scripts/dev.sh" &
    sleep 4
  fi
fi

# ─── 6. Smoke test ───────────────────────────────────────────────────
step "Smoke test"
bash "$ROOT_DIR/scripts/health.sh" || warn "health checks reported issues (see above)"

echo
printf "${C_GREEN}✅ BIBI Cars is up.${C_RESET}\n"
printf "   Backend  : http://localhost:8001\n"
printf "   Frontend : http://localhost:3000\n"
printf "   Login    : see backend/.env (BIBI_*_EMAIL / _PASSWORD)\n"
