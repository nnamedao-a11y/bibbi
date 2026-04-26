#!/usr/bin/env bash
# scripts/health.sh — quick smoke test of backend & frontend.
# Exits 0 if everything green, 1 otherwise. Output is concise.
set -Eeuo pipefail

C_RESET='\033[0m'; C_GREEN='\033[1;32m'; C_YELLOW='\033[1;33m'; C_RED='\033[1;31m'
ok()   { printf "  ${C_GREEN}✓${C_RESET} %s\n" "$*"; }
warn() { printf "  ${C_YELLOW}!${C_RESET} %s\n" "$*"; }
fail() { printf "  ${C_RED}✗${C_RESET} %s\n" "$*"; }

BE="${BACKEND_URL:-http://localhost:8001}"
FE="${FRONTEND_URL:-http://localhost:3000}"

failures=0
check() {
  local label="$1" url="$2" expect="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$url" || echo 000)
  if [[ "$code" == "$expect" ]]; then
    ok "$label → HTTP $code"
  else
    fail "$label → HTTP $code (expected $expect) — $url"
    failures=$((failures+1))
  fi
}

echo "─ Backend ($BE)"
check "calculator/ports"        "$BE/api/calculator/ports"
check "public/vehicles"         "$BE/api/public/vehicles"
check "westmotors/status"       "$BE/api/westmotors/status"
check "lemon/status"            "$BE/api/lemon/status"
check "vin-service/circuit"     "$BE/api/vin-service/circuit"
check "statvin/stats"           "$BE/api/statvin/stats"
check "vin sample lookup"       "$BE/api/vin/WAUSPBFF7HA146992"

echo
echo "─ Frontend ($FE)"
check "home page"               "$FE/"
check "catalog"                 "$FE/catalog"
check "calculator"              "$FE/calculator"
check "login"                   "$FE/login"
check "vin sample"              "$FE/vin/WAUSPBFF7HA146992"

if (( failures == 0 )); then
  printf "\n${C_GREEN}✓ All %d checks green${C_RESET}\n" 12
  exit 0
else
  printf "\n${C_RED}✗ %d checks failed${C_RESET}\n" "$failures"
  exit 1
fi
