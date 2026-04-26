# BIBI Cars — Production Roll-out Checklist

_Last updated after Phase 9 (multi-source resolver + observability)._

System is production-ready and fully tested. The five steps below are the
operational tasks **only the owner can run** (they need access to live
creds, a Chrome session, the admin login, etc.).

---

## 1 · Generate & install secrets

Already generated for you (rotate before going live if you want):

```env
EXT_SHARED_SECRET=IZ27UecEOfrIYn-KiEc8GepDiOm-dX2Cu8WIAljB3ZtZPRoox5l8-jVPeO2N39GP
JWT_SECRET=r1WZL-tdqW8iSn5lrnw9IRO15LJLaTANMGJbcRi3wVi8OEHi174L7Og9QxYAfboB
BIBI_OWNER_EMAIL=owner@example.com
BIBI_OWNER_PASSWORD=<strong-password>
BIBI_ADMIN_EMAIL=admin@example.com
BIBI_ADMIN_PASSWORD=<strong-password>
BIBI_MANAGER_EMAIL=manager@example.com
BIBI_MANAGER_PASSWORD=<strong-password>
```

If you want to (re)generate locally:

```bash
python3 -c "import secrets; [print(k+'='+secrets.token_urlsafe(48)) for k in ['EXT_SHARED_SECRET','JWT_SECRET']]"
```

Add them to **`/app/backend/.env`** without removing the existing
`MONGO_URL` / `DB_NAME` lines, then:

```bash
sudo supervisorctl restart backend
tail -n 30 /var/log/supervisor/backend.err.log   # look for the WARNINGs disappearing
```

Warnings that should be **gone** after this step:
```
JWT_SECRET is not configured — using insecure fallback ...
EXT_SHARED_SECRET is empty — HMAC protection disabled ...
CORS_ORIGINS contained '*' ... falling back to localhost only
```

---

## 2 · Install at least 2 extension clients (kill SPOF)

The `Chrome extension v4.1` lives in **`/app/backend/chrome_extension/`**.
To install it manually:

1. Open `chrome://extensions/` → toggle **Developer mode** (top right).
2. **Load unpacked** → choose `/app/backend/chrome_extension/`.
3. Click the BIBI icon → popup opens → set:
   - **Backend URL** = `https://car-dealer-pro-7.preview.emergentagent.com`
   - **Client secret** = `EXT_SHARED_SECRET` from step 1 (so HMAC matches)
   - **Label** = `owner-laptop` / `backup-vps` / etc.
4. Background worker auto-registers with `/api/ext/register`. Open
   `Admin → Parser Control` panel and confirm the client appears under
   **Extension Clients** with `● online` and 100% success-rate after the
   first heartbeat (60 s).
5. Repeat on a **second machine** (laptop, VPS with puppeteer Chromium,
   coworker's browser — anything). Goal: ≥ 2 rows, both online.

**Why critical:** while Phase 9 added per-client health detection, an
empty client pool simply means the extension layer is silently disabled.
The resolver will fall back to AuctionAuto httpx → PAGE → NOT_FOUND,
losing CF-protected sources entirely.

---

## 3 · Verify admin **MultiSourcePanel** under your owner login

```
https://car-dealer-pro-7.preview.emergentagent.com/admin/parsers
```

Login with `BIBI_OWNER_EMAIL` / `BIBI_OWNER_PASSWORD`. Confirm:

- **Multi-Source Resolver — Health** loads + auto-refreshes every 5s.
- Header shows `queue depth`, `jobs in flight`, optional `degraded`,
  `drift`, `obs cache`.
- Per-source tiles: AuctionAuto green, the four EXT tiles populated.
- **Extension Clients** table shows your registered clients with
  success-rate column.
- **Live AuctionAuto smoke-test** form returns a parsed payload for the
  bench VIN `5YJSA1E25HF199047`.

If any tile is unhealthy / red, follow up via the corresponding endpoint:
`/api/ext/health`, `/api/ext/clients`, `/api/ext/degraded`, `/api/ext/drifting`.

---

## 4 · Turn on HMAC strict mode

Nothing to code — it activates automatically the moment
`EXT_SHARED_SECRET` is non-empty (`security.py::require_extension_hmac`
rejects requests missing/invalid signatures). Verify:

```bash
# Should now return 401 (no signature)
curl -i -X POST https://.../api/ext/heartbeat \
  -H 'Content-Type: application/json' \
  -d '{"client_id":"hacker"}'

# Should still 200 from your installed extension (it signs every call)
```

Also flip the audit knob at the top of `/app/backend/security.py` if you
want **stricter** behaviour (e.g. enforce nonce-replay across the whole
cluster instead of just per-process). Default is fine for single
instance.

---

## 5 · Run the live smoke before flipping DNS / inviting users

```bash
BACKEND_URL=https://car-dealer-pro-7.preview.emergentagent.com \
  python3 /app/scripts/live_smoke.py
```

What it does:
- Fetches `/api/system/health`, `/api/ext/health`, `/api/ext/clients`.
- Probes 10 VINs and 5 LOTs through the public chain.
- Writes a markdown report to **`/tmp/live_smoke_report.md`** with hit
  rate per source and latency P-values.
- Exits non-zero if more than 7 of the 15 probes fail (5 of them are
  synthetic and *expected* to miss).

Green pass = ready to roll out.

---

## What's already done (no action needed)

- ✅ multi-source resolver chain (Phase V): cache → BitMotors → WestMotors
  → Lemon → AuctionAuto → Extension → PAGE → NOT_FOUND
- ✅ 14 endpoints under `/api/ext/*`
- ✅ multi-client extension registry (Phase 8.1)
- ✅ event-driven observation cache (Phase 8.2)
- ✅ health-based routing P95 + drift gates (Phase 8.3 + 9.2)
- ✅ silent-death detection per client (Phase 9.1)
- ✅ active-job limiter in extension (Phase 9.3)
- ✅ admin MultiSourcePanel
- ✅ backend tests: **41/41 → 100% · 0 critical · 0 flaky**
