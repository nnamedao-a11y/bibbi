#!/usr/bin/env bash
# scripts/seed.sh — wipe and reseed staff (admin / manager / team_lead)
# according to BIBI_*_EMAIL / _PASSWORD in backend/.env.
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MONGO_URL="$(grep -E '^MONGO_URL=' "$ROOT_DIR/backend/.env" | head -1 | cut -d= -f2- | tr -d '\"')"
DB_NAME="$(grep -E '^DB_NAME=' "$ROOT_DIR/backend/.env" | head -1 | cut -d= -f2- | tr -d '\"')"
MONGO_URL="${MONGO_URL:-mongodb://localhost:27017}"
DB_NAME="${DB_NAME:-bibi_cars}"

FORCE=false
for arg in "$@"; do
  case "$arg" in
    -f|--force) FORCE=true ;;
    -h|--help)
      cat <<EOF
Usage: $(basename "$0") [-f|--force]

Reseeds the 'staff' collection from environment variables in backend/.env.
Without -f, it asks for confirmation before deleting existing staff rows.
EOF
      exit 0 ;;
  esac
done

if ! $FORCE; then
  read -r -p "This will WIPE 'staff' collection in $DB_NAME and reseed from backend/.env. Continue? [y/N] " yn
  [[ "$yn" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
fi

mongosh --quiet "$MONGO_URL/$DB_NAME" --eval 'print("deleted=" + db.staff.deleteMany({}).deletedCount);' || true

# Restart backend so the seed_default_staff() routine in server.py runs again
if command -v supervisorctl >/dev/null 2>&1; then
  sudo supervisorctl restart backend 2>/dev/null || supervisorctl restart backend
  sleep 6
else
  echo "supervisorctl not available — restart your backend manually so the seed routine runs."
fi

mongosh --quiet "$MONGO_URL/$DB_NAME" --eval '
db.staff.find({}, {_id:0, email:1, role:1, name:1, seeded:1}).forEach(d => printjson(d));
print("---total: " + db.staff.countDocuments());
'
