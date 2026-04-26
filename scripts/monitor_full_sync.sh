#!/bin/bash
# /app/scripts/monitor_full_sync.sh
# Pings the full-sync status every 5 minutes, appends to /var/log/full_sync_monitor.log
# Detects:
#   - Sync stopped while not finished (probably backend crash)
#   - DB count went backwards
#   - Sync finished successfully

LOG=/var/log/full_sync_monitor.log
HOST=http://localhost:8001
TOKEN="demo-token-12345"
INTERVAL=300  # 5 min

prev_page=0
prev_total=0
declare -i restart_count=0

echo "[$(date -u +%H:%M:%S)] === MONITOR STARTED (interval=${INTERVAL}s) ===" >> "$LOG"

while true; do
    ts=$(date -u +%Y-%m-%dT%H:%M:%S)
    resp=$(curl -s --max-time 10 "$HOST/api/ingestion/admin/parsers/bitmotors/full-sync/status" \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    if [ -z "$resp" ]; then
        echo "[$ts] ERR: backend unreachable" >> "$LOG"
        sleep $INTERVAL
        continue
    fi
    
    # Parse with python
    parsed=$(echo "$resp" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    s = d.get('stats', {}) or {}
    db = d.get('db_counts', {}) or {}
    print(f\"{s.get('is_scraping')}|{s.get('current_page',0) or 0}|{s.get('current_total_pages',0) or 0}|{s.get('current_vehicles',0) or 0}|{s.get('last_errors_count',0) or 0}|{db.get('total',0) or 0}|{s.get('run_count',0) or 0}|{s.get('last_run_finished_at') or ''}|{s.get('last_run_started_at') or ''}\")
except Exception as e:
    print(f'ERR|{e}')
" 2>/dev/null)
    
    if [[ "$parsed" == ERR* ]]; then
        echo "[$ts] $parsed" >> "$LOG"
    else
        IFS='|' read -r is_scraping cur_page total_pages cur_vehicles errs db_total run_cnt finished started <<< "$parsed"
        pct="0"
        if [ "${total_pages:-0}" -gt 0 ] 2>/dev/null; then
            pct=$(awk "BEGIN{printf \"%.2f\", ($cur_page/$total_pages)*100}")
        fi
        # Detect restart: page went backwards
        if [ "${cur_page:-0}" -lt "${prev_page:-0}" ] 2>/dev/null; then
            restart_count=$((restart_count + 1))
            echo "[$ts] ⚠️  RESTART DETECTED #${restart_count} (was $prev_page, now $cur_page)" >> "$LOG"
        fi
        if [ "$is_scraping" = "True" ]; then
            echo "[$ts] running  page=${cur_page}/${total_pages} (${pct}%) scraped=${cur_vehicles} db_total=${db_total} errs=${errs}" >> "$LOG"
        else
            if [ -n "$finished" ] && [ -n "$started" ]; then
                echo "[$ts] ✅ FINISHED runs=${run_cnt} db_total=${db_total} (last page=${cur_page}/${total_pages})" >> "$LOG"
            else
                # Sync is stopped AND no run timestamps → the in-memory state was reset
                # (likely backend restart). Auto-trigger run-now to resume accumulation.
                echo "[$ts] ⏸ STOPPED — no in-memory run, db_total=${db_total} → triggering run-now" >> "$LOG"
                curl -s -X POST "$HOST/api/ingestion/admin/parsers/bitmotors/full-sync/run-now" \
                    -H "Authorization: Bearer $TOKEN" --max-time 5 >> "$LOG" 2>&1
                echo "" >> "$LOG"
            fi
        fi
        prev_page=$cur_page
        prev_total=$total_pages
    fi
    
    sleep $INTERVAL
done
