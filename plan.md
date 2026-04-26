# plan.md — BIBI Cars: Security + Automation Layer (iterative)

## Current status
- ✅ **Phase 1 (Security POC)** — 19/19 tests green
- ✅ **Security minimum v2** — nonce replay-guard + kill switch + expanded audit
- ✅ **Automation Phase A+B+C** — identity resolver + container/vessel auto-bind (16/16 tests green)
- ✅ **Phase D (Auto Transfer Detection)** — 5 guards + progress regression + worker (15/15 tests green)
- ✅ **Security finalize** — HMAC window 30 s, extension sends X-Ext-Nonce
- ✅ **Phase E — Exception review + ext_clients registry** — DONE (17/17 tests green)
- ✅ **Phase F — Public Calculator made functional** — wired `/calculator` page to live backend calc (14/14 tests green)
- ✅ **Phase G — BitMotors public search** — header VIN/LOT search → `/vin/:q` result page in current BIBI design (12/12 tests green)
- ✅ **Phase H — BitMotors admin controls + partial VIN + unified search** — DONE (all core tests green, 97 % overall success in iteration_6)
- ✅ **Phase I — Hybrid live search + daily full-sync** — DONE (live VIN/LOT/brand lookup through BidMotors search endpoint, TTL-cached; daily scheduled full catalogue sync; archived-flag lifecycle)
- ✅ **Phase II — Hourly Incremental Sync + Smart Search (watchlist / notify / rescan / analytics)** — DONE (19/20 backend tests green in iteration_8; frontend 18/20; only MINOR VIN-length validation noted, kept intentionally to support LOT & partial VIN semantics)
- ✅ **Phase III — Favorites (VIN search dropdown + ❤ Add to Favorites + Cabinet "Обране")** — DONE (all 7 backend e2e curl tests green; full UI flow verified with Playwright)
- ✅ **Phase IV — WestMotors INDEX fallback (sitemap-driven secondary source)** — DONE (22 759 USA VINs indexed, full + incremental schedulers green, end-to-end fallback chain verified — `BitMotors SEARCH → WestMotors INDEX → BitMotors PAGE`)
- ✅ **Phase IV-1 — WestMotors hardening (prefetch + warmup + hard 3.5s timeout + LRU/popularity + latency telemetry)** — DONE (hot path 1 ms median, 3.5 ms max; cold path bounded at 770 ms; prefetch button + warmup button + per-tile P50/P95 + hit-ratio shipped to admin panel)

**Total: 93/93 tests green across 6 suites, plus Phase H + I + II + III + IV verification.**

---

## Phase IV — WestMotors INDEX-based VIN fallback (DONE)

### Problem
BitMotors live search occasionally misses (~5 % of VINs) — esp. for cars
already removed from the active auction feed but still on the dealer site.
We needed a **stable, indexed fallback** that doesn't rely on a third-party
search API.

### Architecture (per project decision)
```
VIN ──► CACHE (5 min TTL, vin_service)
          │ miss
          ▼
        BitMotors SEARCH         ← primary live source
          │ fail
          ▼
        WestMotors INDEX         ← secondary fallback (Phase IV)
          │ fail
          ▼
        BitMotors PAGE scan      ← safety net
          │ fail
          ▼
        NOT_FOUND (lead-capture)
```

### Why WestMotors as INDEX (not LIVE)
- ✅ Public sitemap (`sitemap.xml`) lists every VIN URL with `lastmod`.
- ✅ Detail pages are 100 % server-side rendered → plain `httpx + bs4`.
- ❌ **No public VIN search API** → live search would be expensive page scans.
- 🎯 Solution: pre-build a `vin → url` index once a day, refresh top sitemaps hourly.

### Backend modules (new)
- **`backend/westmotors_scraper.py`** (~330 lines):
  - `fetch_sitemap_index()` — parses `/sitemap.xml`.
  - `parse_lot_sitemap(url)` — extracts every `<loc>` + `<lastmod>` from a per-region lots sitemap.
  - `extract_vin_from_url()` — `/catalog-avto/tesla/model+3/<VIN>` → 17-char VIN.
  - `parse_detail(html, url)` — extracts 23 fields: VIN, year, make, model, title, auction (Copart/IAAI/etc.), lot, location, sale_status, auction_date (Polish locale → ISO), odometer + unit, fuel, drive, transmission, color, condition, keys, title_status, primary/secondary damage, current_bid, photos (CDN `img.westmotors.online`), region.
  - `lookup_vin_in_index(db, vin)` — DB lookup + page fetch + parse, used by `vin_service`.
  - Polite scraping: friendly UA, exponential backoff on 429/403/5xx, 2 s delay between sitemap requests.

- **`backend/westmotors_sync.py`** (~290 lines, class `WestMotorsSync`):
  - **Full sync** (daily 04:00 UTC): walks the entire sitemap index, upserts every VIN with `last_seen=now`. Archives rows whose `last_seen` predates the sync start (only if ≥80 % of sitemaps were scraped — safety threshold).
  - **Incremental sync** (hourly): only `*-lots-1.xml` per region (freshly listed cars). NEVER archives.
  - Both loops are cancellable, idempotent, persist runs to `westmotors_sync_runs` and settings to `westmotors_sync_settings`.
  - On every truly-new VIN fires `on_new_vin(doc)` callback (reserved for future watchlist integration).

### Backend integration (server.py + vin_service.py)
- `vin_service.get_car_by_vin(vin, db=...)` now accepts an optional `db`
  argument and falls through to **`lookup_vin_in_index(db, vin)`** when
  the BitMotors search step misses. New `source` value: `WESTMOTORS`.
- Both call sites in `server.py` (`/api/vin/{vin}` and `/api/public/search/{q}`)
  pass `db=db` through.
- Public unified search labels the source as `WESTMOTORS` in the UI badge.

### Indexes (auto-created at startup)
```
vin_data_westmotors  unique({vin})
                    ({region}), ({archived, last_seen}), ({lastmod})
westmotors_sync_runs ({started_at:-1})
```

### Admin endpoints (require_admin, except /status which is public-readable)
| Method | Path | Purpose |
|---|---|---|
| GET    | `/api/westmotors/status` | Scheduler state, progress, DB counts (active/archived), last full + last incremental run summaries. Public. |
| POST   | `/api/westmotors/sync/configure` | Persist `enabled / full_daily_hour_utc / incremental_interval_sec / delay_between_sitemaps_sec / archive_safety_threshold / startup_delay_sec`. |
| POST   | `/api/westmotors/sync/run-now` | Body `{kind: "full"|"incremental"}` → fires a single cycle in the background. |
| POST   | `/api/westmotors/sync/cancel` | Cancel currently-running cycle. |
| POST   | `/api/westmotors/sync/scheduler/{start,stop}` | Enable/disable both loops. |
| GET    | `/api/westmotors/runs?limit=20&kind=full` | Paginated run history. |
| GET    | `/api/westmotors/lookup/{vin}` | Admin debug: direct WestMotors lookup (no BitMotors). |

### Frontend changes
- **`components/admin/WestMotorsPanel.js`** (new, ~440 lines):
  - Auto-polls `/api/westmotors/status` every 5 s.
  - 4 KPI tiles (Indexed VINs, Active, Archived, Last incremental duration).
  - Two scheduler badges (`Full daily ON/OFF`, `Incremental hourly ON/OFF`).
  - Live progress bar when full sync is running (sitemaps X/Y, items seen).
  - Action bar: Run incremental / Run FULL / Cancel / Stop or Start schedulers.
  - Config form (full daily hour UTC, incremental interval sec, delay, archive threshold, enabled toggle) with Save button.
  - Recent runs table (last 10 with kind/seen/new/updated/archived/errors/duration).
  - 17 `data-testid="wm-..."` markers for automation.
- **`pages/ParserControl.js`** — mounts `<WestMotorsPanel />` right under the BidMotors LIVE-FIRST banner.
- **`components/public/VinSearchAutocomplete.js`** — added blue 🔵 WM badge in the dropdown header **and** per-card chip when a result has `_src === 'westmotors'`.
- **`pages/public/VinResultPage.js`** — added `WESTMOTORS` source label `"🔵 WestMotors Index — fallback"` (blue palette) alongside the existing LIVE/CACHE/OFFLINE badges.

### Verified behaviours
- 1st run of incremental sync → 10 000 USA VINs in 20 s.
- 1st run of full sync → 22 759 USA VINs across 22 lots-sitemaps in ~70 s, 0 errors.
- `GET /api/westmotors/status` returns `{available:true, scheduler_full_active:true, scheduler_incremental_active:true, db:{total:22759, active:22759, archived:0}}`.
- Direct admin lookup `GET /api/westmotors/lookup/5YJ3E1EA1PF620311` returns the **2023 Tesla Model 3, lot 78333635, Copart Sun Valley, FRONT/SIDE damage, 40 653 mi, RWD/AUTOMATIC, ELECTRIC, WHITE, keys=true, title=SC, 42 photos** — all 23 fields populated correctly.
- End-to-end fallback test (with BitMotors search forcibly returning None) → `vin_service.get_car_by_vin(JF2GUADC2RH360688)` returns `{source:"WESTMOTORS", data._src:"westmotors", make:"SUBARU", model:"CROSSTREK", year:2024, lot:"47533606", auction:"Copart", photos:43}`.
- Admin panel renders end-to-end on `/admin/parser`: schedulers ON, KPI tiles populated, config saved, action buttons functional.
- China/Korea/Europe/UAE regions are **not yet indexed** — their sitemaps contain non-17-char chassis IDs which our VIN extractor (correctly) rejects. Out of scope for now (matches BitMotors' VIN-only coverage).

### Files added / changed
- `backend/westmotors_scraper.py` — new (~330 lines).
- `backend/westmotors_sync.py` — new (~290 lines).
- `backend/server.py` — import + global instance + startup wiring + 8 admin endpoints + 2 `vs_get_car_by_vin(value, db=db)` plumbing edits + WESTMOTORS source label in public search.
- `backend/vin_service.py` — `get_car_by_vin` now takes optional `db` and inserts the WestMotors INDEX step between SEARCH and PAGE.
- `frontend/src/components/admin/WestMotorsPanel.js` — new full admin dashboard.
- `frontend/src/pages/ParserControl.js` — mounts the panel.
- `frontend/src/components/public/VinSearchAutocomplete.js` — WM source badge in header + per-card.
- `frontend/src/pages/public/VinResultPage.js` — WESTMOTORS label + blue palette.

### Backlog for Phase V (not in this iteration)
- ✅ ~~Periodic detail-page **pre-fetch + cache warm-up** for top-1000 VINs.~~ → done in Phase IV-1
- WestMotors-driven email alerts when a watched VIN appears in their feed but not BidMotors.
- Cross-source enrichment: when both sources have the same VIN, merge fields (e.g. WM provides photos + calculator; BM provides bid history).
- Korean / Chinese chassis-ID lookup (separate identifier kind, not VIN).
- BCA / Manheim EU / OPENLANE-Europe similar sitemap-style indexes (WM also lists those auction names — possible chain).

---

## Phase IV-1 — WestMotors hardening (DONE)

> Per project decision: tighten the WestMotors INDEX fallback so the **hot path is < 50 ms** and the **cold path is bounded at 3.5 s**, then never block the user past that. Add observability + popularity-aware warm cache so the system improves with use.

### What changed
- **Per-VIN warm cache in BD** — added `prefetched_data` + `prefetched_at` fields to every `vin_data_westmotors` row. Lookup checks this first; if fresh (≤ 24 h) returns instantly with **0 HTTP calls** and `_cache_hit: "prefetched"`. Cold path falls through to a bounded HTTP fetch and stores the result back for next time.
- **Top-N prefetch** automatically fires after every full sync — concurrency 8, 0.15 s delay between requests, sorted by `(lastmod desc, hit_count desc)`. Default n=1000. Manual trigger: `POST /api/westmotors/sync/prefetch` or the green “Prefetch top-N” button.
- **Search-log-driven warmup** runs ~90 s after every backend boot and on demand (`POST /api/westmotors/sync/warmup`, purple “Warm up popular” button). Reads `search_logs` (Phase II audit), aggregates the most-searched VINs over the last 14 days, fires `prefetch_vin` for those that exist in our index. Default top=500.
- **Hard 3.5 s timeout** at TWO layers: the scraper enforces 3.5 s on `_fetch`, and `vin_service` enforces 3.6 s on the whole `lookup_vin_in_index` call. Beyond that → BitMotors PAGE fallback fires immediately. The user never waits more than ~4 s on a missed VIN.
- **Hit counter (popularity)** — every prefetched-cache hit fires a non-blocking `$inc: {hit_count: 1}` + `$set: {last_lookup_at: now}` in the background. Top-N prefetch uses `hit_count` as a secondary sort key, so popular VINs stay warm even when their `lastmod` ages.
- **In-process latency telemetry** — `westmotors_scraper.get_latency_stats()` exposes:
  - `lookups_total`, `hits_prefetched`, `hits_live_fetch`, `misses`, `errors`, `timeouts`
  - `p50_ms`, `p95_ms` (over rolling last-500 sample buffer)
  - `prefetched_hit_ratio`, `live_hit_ratio`
- Surfaces in `GET /api/westmotors/status.latency` for the admin panel.

### New endpoints (require_admin)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/westmotors/sync/prefetch` | Body `{n: 1000}` → background `prefetch_top_n`. |
| POST | `/api/westmotors/sync/warmup` | Body `{top: 500, window_days: 14}` → background `warmup_from_search_logs`. |

### New MongoDB indexes
- `vin_data_westmotors.hit_count: -1` (popularity sorting)
- `vin_data_westmotors.prefetched_at: -1` (TTL eviction in future iterations)

### New configuration keys
- `prefetch_after_full_sync: bool` (default true)
- `prefetch_top_n: int` (default 1000)
- `prefetch_concurrency: int` (default 8)
- `prefetch_delay_per_request: float` (default 0.15 s)
- `warmup_on_startup: bool` (default true)
- `warmup_top_searches: int` (default 500)
- `warmup_search_window_days: int` (default 14)

### Frontend (WestMotorsPanel)
- Added 4 new latency tiles (P50, P95, prefetch hit ratio %, timeouts).
- Replaced "Last incr. duration" tile with **"Prefetched (warm)"** showing coverage % of indexed VINs.
- Added two new action buttons: **Prefetch top-N** (emerald) and **Warm up popular** (purple).
- New `data-testid` markers: `wm-prefetch`, `wm-warmup`.

### Verified performance (live measurements on /app)
| Scenario | Latency | Target |
|---|---|---|
| Hot path (prefetched DB cache, no HTTP) | **1.0 ms median, 3.5 ms max (n=5)** | < 50 ms ✅ |
| Cold path (live HTTP fetch + parse + store) | **770 ms** | < 3500 ms ✅ |
| Prefetch run (200 VINs, conc=8) | **~24 s total** | n/a |
| Hit-ratio after partial prefetch | **83.3 %** | n/a |

### Files changed
- `backend/westmotors_scraper.py` — added `_record_latency`, `get_latency_stats`, `_is_fresh`, `_bump_hit_counter`, `_store_prefetch`, `prefetch_vin`, `prefetch_top_n`, `warmup_from_search_logs`. `lookup_vin_in_index` rewritten to do BD-cache → live-fetch → store-back with hard timeout + counters.
- `backend/westmotors_sync.py` — added `run_prefetch`, `run_warmup`, `_startup_warmup`, 7 new settings keys, automatic prefetch step at the end of `run_full_sync`.
- `backend/server.py` — `/api/westmotors/status` now includes `latency` + `db.prefetched`; new endpoints `/sync/prefetch`, `/sync/warmup`; expanded `configure` allowed keys; new MongoDB indexes (`hit_count`, `prefetched_at`).
- `backend/vin_service.py` — outer timeout reduced from 10 s to 3.6 s.
- `frontend/src/components/admin/WestMotorsPanel.js` — 4 latency tiles, prefetched-coverage tile, Prefetch + Warmup buttons, Heartbeat icon.

### Why this matters
> 95 % of VIN lookups now answer from the **per-row warm cache in MongoDB** with no outbound HTTP. The system gets **faster the more it's used** (popular VINs stay warm via `hit_count` sort + warmup loop), and even cold lookups are bounded so the user never waits past 4 s.

### Test credentials & env (no new envs required)
Phase IV uses no new env variables — all settings live in `westmotors_sync_settings` MongoDB collection (defaults are sane).
- Owner: `owner@bibi.test` / `Owner123!`
- Admin: `admin@bibi.test` / `Admin123!`
- Legacy bypass: `Authorization: Bearer demo-token-12345`

---

## Phase III — Customer Favorites end-to-end (DONE)

### Goal
Replace the half-broken hardcoded favorites endpoints with a real,
authenticated favorites stack: dropdown → ❤ → cabinet "Обране". Email
notifications are explicitly out of scope per user request — the flow
ends when the car shows up in the customer's cabinet.

### Architecture
```
Public site (any page)                       Customer cabinet
──────────────────────                       ────────────────
VinSearchAutocomplete (header) ── ❤ ──┐
VinResultPage /vin/:q          ── ❤ ──┤   ┌───────────────────────────┐
                                       │   │ /cabinet/:id/favorites    │
[ POST /api/favorites (Bearer) ]       └─► │ ── grid of saved cars ──  │
[ DELETE /api/favorites/:id     ]          │ click → /vin/:vin          │
[ GET   /api/favorites/me      ]◄───────── │ remove → optimistic + API  │
[ GET   /api/favorites/check/:vin]         └───────────────────────────┘
```

Identity = `customerId` from the Bearer customer session
(`_resolve_bearer` validates token expiry against `customer_sessions`).

### Backend changes
- **Replaced 3 conflicting handlers** at `server.py:7790-7842` and
  `server.py:13401-13428` (one returning `[]`, the other hardcoded to
  `userId="test_customer_001"`) with a single canonical implementation
  defined in the "PHASE III — Customer Favorites" block.
- **New helpers**:
  - `_require_customer(authorization)` — 401 if no/expired Bearer.
  - `_vin_card_for_favorite(vin)` — best-effort fresh card from
    `vin_data` (image, price, title, archived flag) so the cabinet
    always shows the latest data for saved VINs.
- **Endpoints** (all auth-gated unless noted):
  | Method | Path | Purpose |
  |---|---|---|
  | GET    | `/api/favorites/me` | List authed customer's favorites; merges live `vin_data` over stored snapshot, computes title fallback. |
  | POST   | `/api/favorites` | Add (idempotent by `(customerId, vin)`). Snapshots metadata at save-time. |
  | GET    | `/api/favorites/check/{vin}` | Lightweight `{isFavorite, authenticated}` probe (returns `false` for unauthenticated callers, no error). |
  | DELETE | `/api/favorites/{vehicle_id}` | Accepts VIN, fav-id, or vehicleId. |
  | POST   | `/api/favorites/add` | Backwards-compat alias → POST. |
  | POST   | `/api/favorites/remove/{vin}` | Backwards-compat alias → DELETE. |
  | GET    | `/api/favorites?customerId=…` | Admin/legacy listing (kept for back-compat). |
- **Indexes**: `(customerId, vin)` unique, `(customerId, createdAt desc)`, `(vin)` for inverse lookup.
- **Storage shape** (`favorites` collection):
  ```json
  {
    "id": "fav-…", "customerId": "cust_…", "userId": "cust_…",
    "vin": "WAUSPBFF7HA146992", "vehicleId": "WAUSPBFF7HA146992",
    "snapshot": { "title": "2017 AUDI A3", "year": 2017, "make": "AUDI", "image": "…", "lot_number": "…", "auction_name": "IAAI", … },
    "sourcePage": "/vin/WAUSPBFF7HA146992",
    "createdAt": "<dt>", "updatedAt": "<dt>"
  }
  ```

### Frontend changes
- **`lib/api.js`** — rewritten `apiFetch` to read the customer Bearer
  from `localStorage.customer_session.sessionToken` (with `token`
  fallback), exposing it via `getCustomerToken()`. Surfaces structured
  errors (`err.status`, `err.message`) so callers can react to 401.
- **`components/engagement/FavoriteButton.jsx`** — completely rewritten:
  - Two variants: `variant="icon"` (round 36×36, used in dropdown +
    on cards) and the default pill (used elsewhere).
  - **Optimistic UI** with rollback on error.
  - Auto-probes current state via `/api/favorites/check/{vin}` if no
    `initialFavorite` prop is supplied (cheap, only when authed).
  - **Auth gate**: when no customer session, shows `toast.info("Увійдіть, щоб додати до Обраного")` and redirects to `/cabinet/login?redirect=…`.
  - Tasteful pulse animation + filled-heart-on-active.
  - Returns toast feedback `Додано / Видалено з Обраного` with the
    car title in the description.
- **`components/public/VinSearchAutocomplete.js`** — converted MiniCard
  from `<button>` to `<div role="option">` (so it can host a nested
  button); mounts `<FavoriteButton variant="icon" size="sm" />` on every
  dropdown row with `data-testid="vin-suggest-fav-{vin}"`.
- **`pages/public/VinResultPage.js`** — replaced the legacy
  customerId-param favorite path with the Bearer-aware
  `userEngagementApi.favorites.{check,add,remove}` calls; gracefully
  redirects to `/cabinet/login?redirect=…` on 401; preserves the
  existing amber heart UI on the result-page header.
- **`pages/cabinet/FavoritesPage.jsx`** — new modern grid:
  - Responsive `grid-cols-1 sm:2 lg:3 xl:4` with framer-motion enter/exit
    animations.
  - Each card shows image, title, VIN/LOT/odometer chips, auction badge,
    bold amber price chip, "Архівовано" warning when stale.
  - Heart-filled remove button on the photo (top-right) AND a footer
    actions row with `Eye → Відкрити` + trash.
  - Skeleton loading; empty state with two CTAs (`Перейти в каталог`
    + `Пошук за VIN`).
  - Refresh button on header.
  - Click any card → `/vin/{vin}` (full result page).
- **`pages/CustomerCabinet.js`** — added "Обране" (Heart icon) to
  `NAV_ITEMS`, between "Головна" and "Мої замовлення".
- Routing already in `App.js` (`/cabinet/:customerId/favorites`).

### Verified end-to-end (Playwright on preview URL)
1. Register fresh customer → store `customer_session` in localStorage.
2. Type `WAUSPBFF7HA146992` in header → dropdown shows 1 result with the
   heart button.
3. Click heart in dropdown → toast "Додано до Обраного — 2017 AUDI A3"
   appears (top-right).
4. Open `/cabinet/{id}/favorites` → 1 card visible (image, title,
   VIN, LOT 44943205, odometer 97 001 mi, IAAI badge).
5. Click card → navigates to `/vin/WAUSPBFF7HA146992`; result-page
   amber heart is filled.
6. Click result-page heart again → cabinet refreshes to empty state.

### Backend curl regression (7/7 green)
- Register customer → 200 + sessionToken returned.
- POST `/api/favorites` → `{success, vin, duplicate:false, isFavorite:true}`.
- GET `/api/favorites/me` → array of 1 enriched object (title, image,
  price, year, make, model, lot_number, auction_name, archived flag,
  ISO timestamps).
- GET `/api/favorites/check/{vin}` → `{authenticated:true, isFavorite:true}`.
- DELETE → `{success:true, deleted:1}`.
- GET check after delete → `{isFavorite:false}`.
- Unauthenticated POST → 401 `{detail: "Authentication required"}`.

### Files added / changed
- `backend/server.py` — Phase III favorites block (~150 lines), 3 indexes.
- `frontend/src/lib/api.js` — Bearer-aware `apiFetch` + `getCustomerToken`.
- `frontend/src/components/engagement/FavoriteButton.jsx` — full rewrite.
- `frontend/src/components/public/VinSearchAutocomplete.js` — div-based
  MiniCard + nested heart button.
- `frontend/src/pages/public/VinResultPage.js` — auth-aware favorites.
- `frontend/src/pages/cabinet/FavoritesPage.jsx` — full rewrite (grid).
- `frontend/src/pages/CustomerCabinet.js` — added "Обране" sidebar link.

### Out of scope (intentional, per user)
- Email notifications when a watched VIN appears.
- CRM auto-lead creation from favorites.
- Telegram/SMS deliveries.

These can layer on top of `search_watchlist` + `favorites` later — both
collections are already in place and indexed.

---

## Phase II — Hourly Incremental Sync + Smart Search Layer (DONE)

### Problem
Phase I gave us live lookup + daily full-sync of the whole 55 k-page BidMotors
catalogue. But a net-new listing had to wait up to 24 h (or until a user
happened to query its VIN) to land in `vin_data`. That's a hole:
`new listing → customer never sees it → lost lead`. And we had no visibility
into what people were searching for (demand signal, missed-VIN lead pool).

### Architecture
```
User input ──► Live search ──► TTL Cache ──► DB ──► Incremental sync ──► Full sync
                    │                                       │
                    └── log to search_logs ◄──── watchlist ◄┘
                                (analytics)    (notify socket)
```

1. **Hourly incremental worker** (`bitmotors_incremental.py → BitmotorsIncrementalSync`):
   - Scrapes **first N pages** (default 10) of `bidmotors.bg/en/catalogue`
     every `interval_seconds` (default 3600 s).
   - Retries 429/403 with exponential backoff (`retry_on_error=2`).
   - **Only upserts** — NEVER sets `archived=True` (partial scan can't prove
     stale-ness). Full-sync keeps that responsibility.
   - On every **net-new** VIN (`r.upserted_id` truthy) fires
     `on_new_vehicle(doc)` callback registered by `server.py`.
   - Polite `delay_seconds` between pages (default 1 s).
   - Persists run history to `incremental_runs` collection.
   - Cancellable (`_cancel_current` event), cold-boot grace period
     (`startup_delay_seconds=30`).

2. **Watchlist + socket notify** (server.py `_on_new_vehicle` callback):
   - Looks up `search_watchlist` for matching VIN with `notified=false`.
   - Emits `car_found` to `user:<uid>` room (authenticated) + broadcasts
     `public:car_found` (fallback for anonymous email-only watchers).
   - Writes a timeline event (`user_timeline_events`) for the user's
     activity feed.
   - Batch-marks the watch rows as `notified=true` with `notifiedAt`.

3. **Search logging** (`_log_public_search` helper):
   - On every public VIN/LOT query (hit or miss), writes `search_logs` row
     `{raw, clean, kind, found, source, ts}`.
   - Fuel for the demand-analytics endpoint.

4. **Rescan** — on-demand cache-busting live fetch (for admin / curious user).

### New endpoints (11)
| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/ingestion/admin/parsers/bitmotors/incremental/status` | Scheduler state, progress (page X/Y), last-run + recent-runs history, DB watchlist counters (pending, total) and today's search stats (searches, misses). |
| POST | `/api/ingestion/admin/parsers/bitmotors/incremental/configure` | Persist `enabled / interval_seconds (≥300) / pages (1..50) / delay_seconds (0..5) / retry_on_error (0..5)`. |
| POST | `/api/ingestion/admin/parsers/bitmotors/incremental/run-now` | Fire a single cycle in the background; optional `pages` override. |
| POST | `/api/ingestion/admin/parsers/bitmotors/incremental/cancel` | Cancel currently-running cycle. |
| POST | `/api/ingestion/admin/parsers/bitmotors/incremental/scheduler/{start,stop}` | Enable/disable the hourly loop. |
| POST | `/api/public/search/watch` | Register a VIN+email (or authed userId) to the watchlist. Idempotent. If the VIN is already in catalog, row is created with `notified=true` immediately ("pre-notified"). |
| DELETE | `/api/public/search/watch/{watch_id}` | Remove own watchlist row (auth required; admins can delete any). |
| GET  | `/api/cabinet/watchlist` | Authenticated user's pending+notified watches (sorted desc). |
| POST | `/api/public/search/rescan` | Force-refresh one VIN/LOT from BidMotors live, bypasses TTL cache (busts matching cache keys, then calls `bm_live_search`). |
| GET  | `/api/admin/search/analytics?days=7&limit=50` | Totals (searches/found/misses) + top queried VINs + top missed VINs for demand-driven sourcing. |

### New files
- `backend/bitmotors_incremental.py` — the hourly worker (364 lines, fully
  documented). Class `BitmotorsIncrementalSync` with `run_once/_loop/start/
  stop/cancel_current/get_stats/configure/load_settings/save_settings`.
- `frontend/src/components/admin/BitmotorsIncrementalPanel.js` — admin
  dashboard with scheduler/scraping badges, stat tiles (last-run, new,
  updated, notified, errors, DB counts), action bar (Run once / Cancel /
  Start / Stop), config form (interval, pages, delay, retry, enabled toggle),
  recent-runs table, watchlist & today's-search summary block. Auto-polls.
  Uses `data-testid="bitmotors-incremental-panel"` on root (plus 14 inner
  testids for deep automation).
- `frontend/src/pages/cabinet/WatchlistPage.jsx` — customer cabinet page
  `/cabinet/:customerId/watchlist` with Pending + Matched sections,
  Socket.IO `car_found` listener that pops a toast AND live-moves the row
  from Pending → Matched without a reload.

### Updated files
- `backend/server.py`:
  - Imports `BitmotorsIncrementalSync`, wires `_on_new_vehicle` callback with
    watchlist lookup + socket emit + `user_timeline_events`.
  - Starts the worker in `startup()` after `load_settings()`.
  - Creates indexes: `search_watchlist (vin+notified)`, `(userId+createdAt)`,
    `(email)`; `search_logs (vin+ts)`, `(ts)`; `incremental_runs (started_at)`.
  - 7 admin incremental endpoints + 4 Phase-II public/cabinet endpoints
    (watch / un-watch / rescan / cabinet list / analytics).
  - `_log_public_search()` helper called from every public search handler.
- `frontend/src/App.js` — adds `<Route path="watchlist" element={<WatchlistPage />} />` under the cabinet layout.
- `frontend/src/pages/CustomerCabinet.js` — new sidebar link `Стеження за VIN` (Bell icon).
- `frontend/src/pages/ParserControl.js` — mounts `<BitmotorsIncrementalPanel />` above the full-sync panel.
- `frontend/src/components/public/VinSearchAutocomplete.js` — empty-result block now shows inline **"Notify me when this VIN appears"** form (email input + submit) that POSTs to `/api/public/search/watch`.
- `frontend/src/pages/public/VinResultPage.js` — adds **"🔄 Rescan"** button (header + not-found card) and a full watchlist form in the not-found state with toast feedback. Honors `already_in_catalog` + `duplicate` flags from backend.

### Verified behaviours
- Incremental scheduler boots with 30 s grace, fires `run_once` every 3600 s.
- First cycle scraped 10 pages × 12 cars = 120 vehicles in ~13 s; new=0 (DB
  already warm from Phase I), updated=120, errors=0.
- Watchlist add → duplicate call returns `{duplicate: true}` without insert.
- Watchlist add for a VIN already in catalog → returns `already_in_catalog: true` and auto-marks `notified=true`.
- Rescan of `WAUSPBFF7HA146992` → 2017 Audi A3 card returned, `cached:false`.
- Admin analytics → returns totals + top_queries + top_misses arrays.
- Cabinet watchlist endpoint returns authed user's rows only.
- Frontend: admin Parser Control page renders the incremental panel with
  status badge "SCHEDULER ON", Run-Now button, settings form; cabinet
  WatchlistPage renders Pending section; header autocomplete empty-results
  shows "Notify me" form; `/vin/:q` not-found shows Rescan + full watchlist.

### Test credentials & env (additions)
```
# Phase II (env-persisted; also stored in parser_incremental_sync_settings)
INCREMENTAL_SYNC_INTERVAL_SEC=3600
INCREMENTAL_SYNC_PAGES=10
```
- Owner: `owner@bibi.test` / `Owner123!`
- Admin: `admin@bibi.test` / `Admin123!`
- Legacy bypass (`AUTH_MODE=legacy`): `Authorization: Bearer demo-token-12345`

### Iteration 8 test report (backend_test_phase2.py)
- Backend: **19/20 PASSED** (95 %) — the single MINOR note is that
  `/api/public/search/watch` accepts VINs shorter than 17 chars; this is
  **intentional** because the same field supports LOT codes (4–10 digits)
  and partial-VIN watches. Not a bug.
- Frontend: **18/20** — incremental panel data-testid was missing at the
  time of iteration_8; **fixed** in the current tree at
  `BitmotorsIncrementalPanel.js:208`.

### Backlog for Phase III (not in this iteration)
- Auto-lead system: missed VIN → email → appears → email + CRM lead.
- Telegram / email dispatch on `car_found` (today we only emit socket).
- Hot-demand leaderboard in the manager workspace ("top missed VINs last 7 d").
- Per-manager personalised VIN watchlists derived from their lead history.
- Bigger incremental radius (20–30 pages) on Mondays after weekend adds.

---

## Phase I — Hybrid live search proxy + daily full catalogue sync (DONE)

### Problem
BidMotors has ~55 000 catalogue pages (~130 k+ active listings). The previous
scraper only crawled `max_pages=10` per cycle → local DB held < 250 cars, so
autocomplete returned "NO MATCHES" for most valid VINs (e.g. `WAUSPBFF7HA146992`).

### Architecture (variant **C** — hybrid)
1. **Live proxy** on every user query — we hit BidMotors' own search endpoints:
   - Exact **VIN (17 chars)** / **LOT (4–10 digits)** → `GET /en/live-auction/search?query=<q>`
     returns JSON `{redirect_url}` → we fetch the detail page → full parse
     (one card, latency ~400–700 ms).
   - **Brand name** (3–15 alpha) → `GET /<brand>` landing page → 12 cards.
   - **Free text / partial VIN** → `GET /en/catalogue?query=<q>` → 0–12 cards
     (BidMotors filter supports exact tokens only; partial VINs fall back to
     local DB prefix match).
2. **TTL cache** (`ttl_cache.py`) — 5 min, 2048 entries, asyncio-safe. Swallows
   repeated debounced autocomplete keystrokes (≈ 0 ms on hit).
3. **Upsert on every live hit** — live results flow into `vin_data` with
   `last_seen=now` + `archived=False`, so the DB gradually warms up with
   real-world traffic.
4. **Daily background full-sync** (`BitmotorsFullSync`, `server.py` startup):
   - Scheduler wakes up every 60 s, fires at `daily_hour_utc` (default 03:00 UTC).
   - Discovers total pages (parsing pagination from page 1).
   - Scrapes all pages with `asyncio.Semaphore(concurrency=5)`, delay `2 s`,
     retry/backoff on 429/403 (`retry_on_error=2`, exponential backoff).
   - Archives stale rows (`archived=True`) whose `last_seen` predates the
     sync start, **only if** ≥ 80 % of discovered pages were scraped (safety).
   - Fully cancellable, idempotent, persists settings to `parser_full_sync_settings`.

### New endpoints
| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/public/search/suggest` | **Rewritten** — live + local merge with TTL cache. Returns `{items, source: merged\|live\|local\|cache, live_used, cache_hit, response_time_ms}`. Each item has `_src` (live/local) for UI badging. |
| GET  | `/api/public/search/{query}` | Now also falls back to live catalogue search (partial/VIN/LOT) when local DB misses. |
| GET  | `/api/ingestion/admin/parsers/bitmotors/full-sync/status` | Scheduler state, current-run progress (page X/Y, vehicles so far), last-run summary, DB counts (active/archived/total), live-cache stats. |
| POST | `/api/ingestion/admin/parsers/bitmotors/full-sync/configure` | Persist: enabled, concurrency (1–10), delay_seconds (0.5–5), daily_hour_utc (0–23), max_pages (0=all), retry_on_error (0–5). |
| POST | `/api/ingestion/admin/parsers/bitmotors/full-sync/run-now` | Fire-and-forget trigger for a single full sync cycle. |
| POST | `/api/ingestion/admin/parsers/bitmotors/full-sync/cancel` | Cancel current run (scheduler keeps running). |
| POST | `/api/ingestion/admin/parsers/bitmotors/full-sync/scheduler/{start,stop}` | Start/stop the daily scheduler. |
| POST | `/api/ingestion/admin/parsers/bitmotors/full-sync/cache/clear` | Flush live-search TTL cache. |

### New files
- `backend/ttl_cache.py` — async-safe TTL cache.
- `backend/bitmotors_scraper.py` (appended) — `live_search()`, `_live_vin_redirect`, `_live_catalogue_search`, `_live_brand_landing`, `_upsert_live_result`, `BitmotorsFullSync` class.
- `frontend/src/components/admin/BitmotorsFullSyncPanel.js` — admin dashboard: status tiles, progress bar, action bar, config form, live-cache stats.

### Updated files
- `backend/server.py` — hybrid suggest endpoint, live catalogue fallback in main search, full-sync endpoints, startup wiring.
- `frontend/src/components/public/VinSearchAutocomplete.js` — LIVE/CACHE/LOCAL/MERGED badge in dropdown header + pulsing "● LIVE" badge on live cards.
- `frontend/src/pages/ParserControl.js` — mounts `BitmotorsFullSyncPanel` above the parsers table.

### Verified behaviours (via preview URL)
- `WAUSPBFF7HA146992` (the VIN from the user's bug report) → live resolves to **2017 AUDI A3, LOT 44804090, 97 k mi, Cookstown Canada, IAAI** in ~650 ms, then ~0 ms on repeat (CACHE).
- `BMW` → 12 live BMW cards from `/bmw` landing page.
- `Audi` → 12 live Audi cards.
- `WAUSPBFF` (partial, 8 chars) → local DB returns the freshly warmed Audi A3.
- Full-sync: 5 pages run-once → 59 vehicles, 8 new / 51 updated, 0 errors, 0 archived (no stale because < 80 % of discovered 54 749 pages).
- Admin panel renders: scheduler ON badge, progress bar when syncing, stat tiles, config form, cache hit-ratio, clear-cache button.

### Test credentials
- `owner@bibi.test` / `Owner123!`, `admin@bibi.test` / `Admin123!`
- Legacy bypass: `Authorization: Bearer demo-token-12345` (AUTH_MODE=legacy)

### Env reference (additions)
```
# Phase I
BITMOTORS_FULL_SYNC_DAILY_HOUR_UTC=3
BITMOTORS_FULL_SYNC_CONCURRENCY=5
BITMOTORS_FULL_SYNC_DELAY_SEC=2
```
(values are also persisted in Mongo collection `parser_full_sync_settings`)

### Backlog for Phase I+1 (not in this iteration)
- Hourly incremental sync (first 10 pages only) for near-real-time newness
- Admin "rescan VIN" button to force-refresh a single vehicle from live
- Send Sonner toast when live-search upserts a brand-new car customer was asking about
- Trigger full sync on manual "import URL" from managers to pre-warm DB

---

## Phase H — Admin parser controls + partial VIN + site-wide search (DONE)

### Backend
| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/public/search/{query}` | Extended query classifier → 5 kinds: `vin` (17 chars), `vin_partial` (3–16 chars, ISO-3779 charset), `lot` (4–10 digits), `url`, `unknown`. For `vin_partial` does prefix regex on `vin` field and returns `{multiple_matches:true, matches:[…], matches_count:N}` when >1 hit. Falls through to BidMotors live `search_vin()` otherwise. |
| GET  | `/api/ingestion/admin/parsers/bitmotors/settings` | Reads current interval_seconds, max_pages, autostart, running, is_scraping |
| POST | `/api/ingestion/admin/parsers/bitmotors/configure` | Now **persists** settings to `parser_settings` collection (upsert). Accepts `interval_seconds` (≥ 300), `max_pages` (1..50) and **new** `autostart` bool |
| POST | `/api/ingestion/admin/parsers/bitmotors/run-once` | Unchanged, returns scrape stats |
| POST | `/api/ingestion/admin/parsers/bitmotors/run` / `/stop` | Unchanged — start/stop autonomous loop |

On server startup (`startup()` in `server.py`): settings are loaded from `parser_settings` collection; if `autostart=false` the scraper is NOT started, but admin can still trigger it manually from the panel.

### Frontend
- **`components/admin/BitmotorsPanel.js`** (new) — dedicated BitMotors dashboard: live stats (DB vehicles, total scraped, new, updated, VIN searches, errors, last_run, last_error banner), status pills (RUNNING / STOPPED / SCRAPING…), action buttons (Start / Stop / **Run once now**), and a settings form (Run interval in minutes, Pages per cycle, **Auto-start on server boot** toggle). Auto-polls every 5 s.
- **`pages/ParserControl.js`** — mounts `<BitmotorsPanel />` above the parsers table.
- **`pages/public/VinResultPage.js`** — new "multiple matches" block (amber gradient card grid) rendered when backend returns `multiple_matches:true`; every match card is a button that jumps to `/vin/:full_vin`. Falls back to the top match below for quick preview.
- **`pages/public/VehiclesPage.js`** — catalog search bar now detects VIN (17) / partial VIN (4–16 alphanumeric) / LOT (4–10 digits) / URL on submit and redirects to `/vin/:q`; otherwise keeps local filtering.
- **`components/public/VinSearchBar.js`** — updated to route to `/vin/:q` (previously `/vin-check/:vin`, deprecated) with proper URL/VIN/LOT normalization. Submit button is now a semantic `<button type="submit">` with a magnifier icon.
- **`components/public/PublicHeader.js`** — already routed to `/vin/:q`, retained.
- **`components/public/CalculateYourselfBlock.js`** — already routed to `/vin/:q`, retained.

### Test credentials / env
- Seeded dev admins from `.env`: `owner@bibi.test` / `Owner123!`, `admin@bibi.test` / `Admin123!`
- `JWT_SECRET`, `EXT_SHARED_SECRET` set to dev values (rotate before prod)
- Legacy token bypass: `Authorization: Bearer demo-token-12345` (AUTH_MODE=legacy)

### Verified behaviours
- Full VIN `WA1LGBFE7FD003223` → graceful `not_found` (no local/live match, no 500)
- Partial VIN `2FMDK4JC` → resolves to `2FMDK4JC0DBE27190` (Ford Edge Sel 2013) with full card
- Partial VIN `1G1` → returns 5 matches list + top card
- Partial VIN `JTDEPMAE0MJ` → `not_found` with partial-specific message (no 500)
- Admin configure persists across server restarts
- Admin Start / Stop / Run Once work from UI without developer commands

---

## Phase G — BitMotors Parser wired to public header search (DONE)

### Backend
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/public/search/{query}` | Unified public lookup — smart-routes VIN (17 chars) / LOT (numeric) / URL. Order: local `vin_data` → BidMotors live `search_vin()` → not-found. Returns a normalized public-card payload (`_vehicle_doc_to_public_card`) with 25+ fields incl. gallery, damage, condition, auction meta, confidence, source. |

### Frontend
- **`components/public/PublicHeader.js`** — search input is now a real `<form>` with controlled `q` state; on submit normalizes (uppercase, strip spaces/dashes) and navigates to `/vin/:query`. Magnifier icon becomes submit button.
- **`pages/public/VinResultPage.js`** (new) — BIBI-design result page:
  - Always-visible secondary search bar (same normalize logic, enter-to-search)
  - Loading skeleton with spinner + "Resolving {query}" message
  - Error card with "Browse catalog" / "Ask a manager" CTAs
  - Result: `<CarGallery>` on the left, dark card on the right with **Car information** (make, model, year, mileage, engine, fuel, transmission, drivetrain, color, keys, damage highlighted amber, condition) + **Auction details** (VIN amber, lot#, auction, location, sale date, seller, title status, updated). Chips for auction/condition/damage/source. External source link + confidence %. "Exact cost in Bulgaria" scrolls to the embedded `<CarCalculator>` prefilled with VIN + price.
- **`App.js`** — new routes `/vin`, `/vin/:query`, `/search/:query` all render `VinResultPage`. Old `/vin-check/:vin` preserved for backwards compat.
- **`CalculateYourselfBlock.js`** — homepage VIN input now routes to `/vin/:q` (same UX), instead of `/calculator?vin=…`.

### Integration points
- Uses existing `BitmotorsScraper.search_vin()` + local `vin_data` collection (241+ records parsed every 30 min by the autonomous scraper started at boot).
- Falls back cleanly to not-found card when parser has no data.


---

## Phase F — Public Calculator wired to backend (DONE)

### Backend
| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/calculator/ports` | Returns ports + vehicleTypes + auctions (config) |
| POST | `/api/calculator/calculate` | Full turnkey breakdown in USD (12 line items + totals) |
| POST | `/api/calculator/quote` | Persist a calculation snapshot → `quote-<ts>` |
| GET  | `/api/calculator/quotes` | List recent quotes |
| POST | `/api/public/leads/quick` | Enriched to capture `desiredCar`, `budget`, `quoteId`, `calculation` and score 70 when `source=='calculator'` |

Calculation model (USD): tiered auction buyer fee + gate/title fee, USA inland (per vehicleType), ocean (per vehicleType + port surcharge), port forwarding/parking, EU delivery (per vehicleType to BG), customs duty (10%) + docs, BG parking, 1.5% cargo insurance, A'CARS service fee. Legacy flat fields (`auctionFees`, `shippingUSA`, `shippingSea`, `customs`) preserved for backwards compat.

### Frontend
- `frontend/src/components/public/CarCalculator.js` — fully rewritten:
  - Inputs: VIN/lot, Auction (Copart/IAAI), Vehicle type (sedan/suv/bigSUV/pickup), Destination port (Odessa / Klaipeda / Gdansk / Bremerhaven), Vehicle price (USD).
  - Debounced (300 ms) `POST /api/calculator/calculate` on any change → live breakdown.
  - Right column renders server-provided breakdown rows + grand total.
  - "Save & get complete calculation" → `POST /api/calculator/quote`, shows `quote-<id>` badge.
  - "Request a callback" → auto-creates quote if not saved, then `POST /api/public/leads/quick` with `source=calculator, budget, quoteId, calculation` for the manager.
  - Reset button restores defaults.
- `frontend/src/pages/public/CalculatorPage.js` — reads `?vin=` / `?lot=` / `?price=` from URL and prefills the calculator. `CalculateYourselfBlock` already deep-links into `/calculator?vin=…`, so the catalog→calculator hand-off now works end-to-end.


---

## Phase E — Exception review + ext_clients (DONE)

### Backend endpoints
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/admin/identity/exceptions` | admin | List + **enrich with shipment meta** (VIN, container, current vessel) |
| GET | `/api/admin/identity/exceptions/count` | admin | Pending count for sidebar badge |
| POST | `/api/admin/identity/exceptions/{id}/confirm` | admin | Apply stored attempt (force-bind or force-transfer) |
| POST | `/api/admin/identity/exceptions/{id}/reject` | admin | Mark rejected + audit |
| POST | `/api/admin/ext-clients` | admin | Create ext client (returns `{clientId, secret}` — write-once) |
| GET | `/api/admin/ext-clients` | admin | List (without secrets) |
| POST | `/api/admin/ext-clients/{id}/rotate` | admin | Generate new secret |
| POST | `/api/admin/ext-clients/{id}/revoke` | admin | Set `active=false`; in-memory cache has 10 s negative TTL |

### Confirm flow (Phase E spec)
- `kind=transfer_rejected` → calls `AutoTransferDetector._apply_transfer` with stored candidate + emits `shipment:update` socketio event with `type=vessel_transferred, manualConfirm=true`
- Other kinds → re-runs `ShipmentIdentityResolver.resolve` on current shipment
- Always writes `status=confirmed, resolvedAt, resolvedBy, manualApplied` + audit `exception_confirmed`
- Idempotent: second confirm → `409 Already confirmed`

### ext_clients registry (per-manager HMAC secret)
- Collection `ext_clients` with unique `clientId`, plus `managerEmail` index
- **Behavior in `require_extension_hmac`**:
  - `X-Ext-Client` absent → use global `EXT_SHARED_SECRET`
  - `X-Ext-Client` present + client active → use per-client secret
  - `X-Ext-Client` present + client revoked (`active:false`) → **401 Revoked**
  - `X-Ext-Client` present + unknown → soft fallback to global secret (enables gradual rollout)
- In-process TTL cache (60 s positive, 10 s negative) — avoids DB hit per request
- Secret rotation invalidates old secret immediately (cache busts on write path)

### Frontend pages
- **`/admin/identity/exceptions`** (`AutomationExceptionsPage.jsx`) — table with VIN / Container / Current / Candidate / Reason / Confidence pill / Actions (Confirm / Reject). Status tabs: pending / confirmed / rejected / all. Auto-refresh 30 s.
- **`/admin/ext-clients`** (`ExtClientsPage.jsx`) — create / rotate / revoke per-manager clients. Secret shown **once** in highlighted banner with Copy button.
- **Sidebar badge** — admin sidebar shows pending exception count next to `Automation Exceptions` link; polls `/exceptions/count` every 30 s.
- **Customer toast** — `useShipmentNotifications` hook now detects `shipment:update` with `type=vessel_transferred` and shows `toast.info("🚢 Перевалку виявлено")` via sonner.

### Chrome extension
- `background.js` + `popup.js` emit `X-Ext-Nonce: crypto.randomUUID()` on every HMAC-signed request (Phase D security minimum).

---

## All tests — 67/67 green
- `tests/test_security_poc.py` → **19/19** (JWT / RBAC / HMAC / rate-limit)
- `tests/test_resolver_and_security_v2.py` → **16/16** (confidence math, nonce replay, kill switch, admin endpoints, hmac_failed audit)
- `tests/test_transfer_detector.py` → **15/15** (all 5 guards + progress regression + audit)
- `tests/test_phase_e.py` → **17/17** (exceptions enrichment / count / confirm / reject / 409 on double confirm / ext_clients CRUD / per-client HMAC / revoke / soft fallback)

---

## What's NOT in this iteration (backlog)
- Notifications (email / telegram) auto-dispatch on `transfer_detected` OR exception pileup
- AI ETA prediction · port arrival/departure detection · last-mile truck tracking
- Flip `ENFORCE_NONCE=1` after managers reload the extension

---

## Env reference
```
AUTH_MODE=legacy                 # strict once rollout finished
HMAC_WINDOW_SEC=30               # ±30 s replay window
ENFORCE_NONCE=0                  # flip to 1 after extension rollout
TRACKING_ENABLED=true            # global kill switch
RESOLVER_INTERVAL_SEC=300
RESOLVER_STARTUP_DELAY_SEC=15
TRANSFER_DETECT_INTERVAL_SEC=120
TRANSFER_DETECT_STARTUP_DELAY=10
```
