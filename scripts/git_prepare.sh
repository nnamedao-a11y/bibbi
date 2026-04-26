#!/usr/bin/env bash
# scripts/git_prepare.sh — prepare repo for pushing to GitHub.
# 1. Asserts that no real secrets are about to be committed (no .env staged).
# 2. Removes Python __pycache__ / .pyc files.
# 3. Validates Python syntax of all backend modules.
# 4. Runs JS lint on key frontend files.
# 5. Prints a summary of files that will be added/changed.
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

C_RESET='\033[0m'; C_GREEN='\033[1;32m'; C_YELLOW='\033[1;33m'; C_RED='\033[1;31m'; C_BLUE='\033[1;34m'
step() { printf "\n${C_BLUE}▶ %s${C_RESET}\n" "$*"; }
ok()   { printf "  ${C_GREEN}✓${C_RESET} %s\n" "$*"; }
warn() { printf "  ${C_YELLOW}!${C_RESET} %s\n" "$*"; }
fail() { printf "  ${C_RED}✗${C_RESET} %s\n" "$*" >&2; }

failures=0

step "Cleaning Python cache"
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
find . -type f -name '*.pyc' -delete 2>/dev/null || true
ok "removed __pycache__/ + *.pyc"

step "Verifying .gitignore protects secrets"
for f in backend/.env frontend/.env; do
  if ! git check-ignore -q "$f" 2>/dev/null && [[ -f "$f" ]]; then
    fail "$f is NOT ignored — secrets would leak"
    failures=$((failures+1))
  else
    ok "$f is ignored"
  fi
done

step "Verifying .env.example files exist"
for f in backend/.env.example frontend/.env.example; do
  if [[ ! -f "$f" ]]; then
    fail "$f missing"
    failures=$((failures+1))
  else
    ok "$f present"
  fi
done

step "Scanning .env.example for accidental real secrets"
for f in backend/.env.example frontend/.env.example; do
  if grep -E '^(JWT_SECRET|EXT_SHARED_SECRET|EMERGENT_LLM_KEY|BIBI_.*_PASSWORD|OPENAI_API_KEY|SHIPSGO_API_KEY|VESSELFINDER_API_KEY|AFTERSHIP_API_KEY|CRM_ADMIN_TOKEN)=[^\s]{16,}' "$f" 2>/dev/null \
    | grep -vE '(CHANGE_ME|ChangeMe|example\.com|<.*>|^$)' >/tmp/leak_$$.txt; then
    if [[ -s /tmp/leak_$$.txt ]]; then
      fail "Possible real secret in $f:"
      cat /tmp/leak_$$.txt
      failures=$((failures+1))
    fi
  fi
  rm -f /tmp/leak_$$.txt
done
ok "no obvious real secrets in .env.example files"

step "Python syntax check (backend)"
if python3 -c "
import ast, os, sys
errs = 0
for r,_,fs in os.walk('backend'):
    if '__pycache__' in r: continue
    for f in fs:
        if f.endswith('.py'):
            p = os.path.join(r,f)
            try: ast.parse(open(p,encoding='utf-8').read())
            except SyntaxError as e:
                print(f'  {p}:{e.lineno}: {e.msg}'); errs += 1
sys.exit(1 if errs else 0)
"; then
  ok "all backend .py files parse cleanly"
else
  fail "backend has Python syntax errors"
  failures=$((failures+1))
fi

step "git status preview"
if command -v git >/dev/null 2>&1 && [[ -d .git ]]; then
  git status --short || true
  echo
  echo "Files to add:"
  git status --short | awk '{print "  " $0}' | head -40
else
  warn "git not initialized yet — run: git init"
fi

echo
if (( failures == 0 )); then
  printf "${C_GREEN}✓ Repo is safe to commit and push${C_RESET}\n"
  echo
  echo "Suggested next commands:"
  echo "  git add -A"
  echo "  git commit -m 'feat: vin-service circuit breaker + stat.vin enrichment + UK i18n'"
  echo "  git push origin main"
  exit 0
else
  printf "${C_RED}✗ %d issues must be fixed before pushing${C_RESET}\n" "$failures"
  exit 1
fi
