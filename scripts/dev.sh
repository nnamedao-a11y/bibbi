#!/usr/bin/env bash
# scripts/dev.sh — run backend (uvicorn) + frontend (yarn start) in foreground
# Use ONLY when supervisor is not available. Ctrl-C kills both.
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

trap 'kill $(jobs -p) 2>/dev/null || true' EXIT INT TERM

(
  cd "$ROOT_DIR/backend"
  exec uvicorn server:fastapi_app --host 0.0.0.0 --port 8001 --reload
) &

(
  cd "$ROOT_DIR/frontend"
  exec yarn start
) &

wait
