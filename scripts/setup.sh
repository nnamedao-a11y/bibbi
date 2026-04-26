#!/usr/bin/env bash
# scripts/setup.sh — install backend + frontend dependencies (no service restart)
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

bash "$ROOT_DIR/scripts/quickstart.sh" --no-services --skip-mongo
