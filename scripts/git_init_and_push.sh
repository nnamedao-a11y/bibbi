#!/usr/bin/env bash
# scripts/git_init_and_push.sh — first-time push to a fresh GitHub repo.
# Usage:
#   bash scripts/git_init_and_push.sh git@github.com:USER/REPO.git
#   bash scripts/git_init_and_push.sh https://github.com/USER/REPO.git "my commit msg"
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REMOTE_URL="${1:-}"
MSG="${2:-feat: BIBI Cars CRM — initial commit}"
BRANCH="${BRANCH:-main}"

if [[ -z "$REMOTE_URL" ]]; then
  cat <<EOF
Usage: $(basename "$0") <remote-url> ["commit message"]
  e.g.  $(basename "$0") git@github.com:L2PAD/bibbib.git "first push"
EOF
  exit 2
fi

bash "$ROOT_DIR/scripts/git_prepare.sh"

if [[ ! -d .git ]]; then
  git init -b "$BRANCH"
fi

git add -A
if git diff --cached --quiet; then
  echo "Nothing to commit."
else
  git commit -m "$MSG"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

git branch -M "$BRANCH"
git push -u origin "$BRANCH"
