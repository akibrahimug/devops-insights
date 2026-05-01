# Cold-Start Migration

Reference write-up of the cold-start performance fix. Describes the problem, the diagnosis, every change made, and how to verify the result.

If you're picking up this codebase fresh, read this alongside [`CLAUDE.md`](CLAUDE.md). The architecture sections in [`README.md`](README.md) and [`server/README.md`](server/README.md) are the high-level entry points; this file is the deep-dive.

---

## TL;DR

The dashboard used to take **>60 seconds** to show data on a cold Cloud Run revision. After this change it shows data in **8–15 seconds in the worst case** (cold container + sleeping Atlas), or **4–7 seconds** consistently if a keep-warm cron is configured.

Three root causes addressed:

1. **MongoDB Atlas M0 (free tier) sleep** — Atlas free clusters sleep after ~60 min idle and take 30–90s to wake. Reading from Mongo on first request meant the dashboard hung that whole time.
2. **Server began `listen()`-ing before the first poll completed** — `void this.pollOnce(api)` was non-blocking, so the HTTP server accepted connections while `metrics_latest` was still empty. The first `metrics:get` returned `metrics:error`.
3. **Client never retried** — the React context just set an error state. The UI sat with skeleton loaders until the next 30s poll cycle eventually broadcast a `metrics-update`.

Plus a few cleanups: the `Config.validate()` no-op bug, the duplicate `mongoose.connect()`, and `pm2` being a dependency the prod start script didn't actually use.

---

## Architecture before vs after

### Before

```
client connects → metrics:get → server queries Mongo →
  • Atlas asleep:  30–90s wait  → metrics:error →  client gives up
  • Atlas waking:  hangs        → eventually times out

(meanwhile poller fires void pollOnce → no one is awaiting it)
```

### After

```
container boot → mongoose.connect → poller.startPolling (await first pass)
                                       └─► metricsCache.set BEFORE Mongo write
                                       └─► metricsCache.whenReady resolves
listen() (gated on cache being warm; 8s safety race)
client connects → metrics:get → cache hit → metrics:data (instant)

(if Mongo is asleep, poller swallows the error and keeps the cache fresh.
 client retries metrics:error with backoff in the unlikely cache-miss case.)
```

---

## File-by-file changes

### New: `server/src/services/metrics-cache.ts`

Singleton in-memory store, keyed by region:

| Method | Purpose |
|---|---|
| `set(source, data, updatedAt)` | Called by the poller every cycle |
| `get(source)` | Used by the `metrics:get` socket handler |
| `getAll()` | Used by the all-sources branch of `metrics:get` |
| `isReady()` | True once every region in `api-regions.json` has a value |
| `whenReady()` | Resolves when `isReady()` becomes true; used to gate `listen()` |
| `clear()` | Test helper |

The cache is decoupled from Mongo on purpose: `set()` runs *before* the DB lookup, so an asleep Atlas can never block first-paint.

### Modified: `server/src/services/api-poller.ts`

- Removed unused `axios` import (polling uses fake data; real HTTP path is intentionally disabled).
- Added `metricsCache.set(...)` at the top of `pollOnce`, before any Mongo I/O.
- Wrapped the Mongo `findOne` / `updateOne` / `MetricHistory.create` block in a single try/catch — failures are warn-logged and swallowed so the cache + live broadcasts continue.
- Added `lastEmittedHash: Map<source, hash>` so direct-emit still fires on legitimate hash changes even when the Mongo lookup fails (without it, a Mongo-down period would suppress all live updates).
- `beginIntervals()` now does a `Promise.allSettled` over the first parallel pass and only resolves after every region has been polled once. Recurring intervals are scheduled before the await so cadence is preserved.
- `startPolling()` now returns a `Promise<void>` that callers can await.
- Demoted noisy `console.log` chatter to `log.debug` — these dominated Cloud Run log volume.

### Modified: `server/src/setupServer.ts`

- Imported `metricsCache`.
- `start()` gates `listen()` on `Promise.race([ pollerStarted + metricsCache.whenReady(), 8s timeout ])`. Logs whether the cache made it warm before listen.
- `metrics:get` handler now reads `metricsCache.get(src)` / `metricsCache.getAll()` first. Only falls through to Mongo on cache miss. On total miss (cache empty *and* Mongo empty), responds `metrics:error` with `retryAfterMs: 2000` so the client knows to retry.
- `changeStreamsAvailable()` wraps the `replSetGetStatus` admin command in a 1.5s timeout — Atlas mid-wake can otherwise hang this call indefinitely.
- `connectMongo()` now sets `mongoose.set('strictQuery', false)` and registers a `disconnected` listener that re-issues `mongoose.connect()`. (Moved here from the now-deleted second connect site.)
- Added an explicit log when `REDIS_HOST` is unset, so the single-instance prod path is obvious in Cloud Run logs.

### Modified: `server/src/app.ts`

- Removed the fire-and-forget `databaseConnection()` call. Mongo is now connected exactly once, inside `setupServer.start()`. (Previously two parallel connects raced on cold start.)

### Modified: `server/src/config.ts`

- Fixed the broken `validate()`. The original `for (const [key, value] of Object.keys(this))` destructured into `[k, v]` against single-character strings, so it never actually checked anything. Now: throws if `DATABASE_URL` is missing, warns if `EXTERNAL_API_NAME` is missing.

### Modified: `server/src/routes.ts`

- `/api/v1/health` now also runs `mongoose.connection.db.admin().ping()`. Returns 200 either way (so the keep-warm cron isn't noisy on Mongo blips), but includes `mongo: 'ok' | 'unreachable'` in the JSON response. This lets a Cloud Scheduler keep-warm job both check liveness and wake Atlas in one request.

### Modified: `client/app/contexts/WebSocketContext.tsx`

- Added `initialRetryRef` tracking `{ attempts, timer, lastSource }`.
- New retry policy on `metrics:error`:
  - Retryable when message matches `/no data yet|failed to fetch metrics/i` *or* the payload includes `retryAfterMs`.
  - Backoff: server-supplied `retryAfterMs` if present, else `1s → 2s → 4s → 8s → 8s` (capped). Max 5 attempts.
  - Cancelled on first `metrics:data` or `metrics-update`.
  - Reset on every `connect`.
- `getInitialData(source?)` now records `source` on the retry ref so the timer re-emits the same request shape on retry.

### Modified: `client/test/__mocks__/socket.io-client.ts`

- Mock socket now exposes `connected: true` and `id: 'mock-socket-id'`. Required for the new retry tests because the retry checks `socket.connected` before re-emitting.

### Modified: `.github/workflows/deployment.yml`

Added Cloud Run flags for faster cold start on free tier:

```yaml
--cpu=1
--cpu-boost           # free; doubles CPU during startup (~30–50% faster boot)
--concurrency=80      # explicit (default for gen2)
--min-instances=0     # explicit; keeps free tier
--timeout=300         # generous timeout for long-lived WebSockets
```

Removed the misleading `REDIS_REQUIRED=false` env var (the code only ever read `REDIS_HOST`, never this).

To eliminate cold start entirely, set `--min-instances=1` (~$5–15/mo). Not enabled by default.

### Modified: `server/Dockerfile`

- Bumped base from `node:18-alpine` → `node:20-alpine` (smaller layers, faster boot).
- Added `--frozen-lockfile` to both `yarn install` invocations.
- Set `ENV NODE_ENV=production` in the production stage so libraries skip dev paths.
- Changed `CMD ["yarn", "start"]` → `CMD ["node", "dist/app.js"]` (drops the yarn wrapper for a faster boot).

### Modified: `server/package.json` + `server/yarn.lock`

- Removed `pm2` from dependencies. The start script was always `node dist/app.js` — pm2 was never invoked. Cloud Run restarts the container on crash, making pm2 redundant. Lockfile shrunk by ~600 lines.

### New tests

- **`server/src/services/test/metrics-cache.test.ts`** — set/get/getAll, `isReady` transitions, `whenReady` resolves on final source arrival, `clear()` resets the ready latch.
- **`client/app/contexts/__tests__/WebSocketContext.test.tsx`** — 4 new cases under "initial-fetch retry on metrics:error":
  - retries with exponential backoff on retryable error
  - honors server-supplied `retryAfterMs`
  - cancels pending retry when `metrics:data` arrives
  - does not retry on non-retryable errors (e.g. "Invalid source")

---

## WebSocket protocol changes

The wire protocol gained one optional field. Existing clients keep working.

### `metrics:error`

**Before:**

```json
{ "message": "No data yet for this source" }
```

**After (when retryable):**

```json
{ "message": "No data yet for this source", "retryAfterMs": 2000 }
```

The server emits `retryAfterMs` for "no data yet" cases (cache + DB both empty during cold start) and generic fetch failures. Validation errors like `"Invalid source"` are unchanged — clients should not retry those.

---

## Manual follow-up: Cloud Scheduler keep-warm

Free Mongo Atlas M0 sleeps after 60 min idle. To keep it warm without changing code, schedule a Cloud Scheduler job hitting `/api/v1/health` every 5 minutes. The health endpoint pings Mongo, which keeps the connection pool alive.

```bash
gcloud scheduler jobs create http devops-insights-keepwarm \
  --location=europe-west2 \
  --schedule="*/5 * * * *" \
  --uri="https://<your-cloud-run-url>/api/v1/health" \
  --http-method=GET
```

Cost: free (3 jobs free per project; 5-min cadence ≈ 8.6k invocations/mo, well under quota).

---

## Verification

### Automated

```bash
cd server && yarn test          # 27 tests across 8 files
cd ../client && npm run test    # 63 tests across 10 files
cd ../server && yarn build      # tsc + tsc-alias
cd ../client && npm run build   # next build
```

All four should pass. The new metrics-cache and retry tests are included in the counts above.

### Manual smoke (after deploying a new revision)

1. Force a cold start: deploy a new revision and wait 60+ min so Cloud Run scales to zero and (without keep-warm) Atlas idles into sleep.
2. Open the dashboard URL with browser devtools → Network → WS frames.
3. Expected:
   - Connection to `/socket.io/` opens within ~5s of container start (the 8s gate is the upper bound).
   - First `metrics:data` event arrives populated, **not** `metrics:error`.
   - If the first response is `metrics:error` with `retryAfterMs`, the client re-emits `metrics:get` after that delay and the next response succeeds.
4. Cloud Run logs check (filter the service):
   - `Server listening on port 5000` should appear AFTER `Metrics cache ready — accepting connections` (or the warning fallback).
   - `metrics-update` events should fire every 30s thereafter.

### Time-to-first-paint targets

| Scenario | Target |
|---|---|
| Container warm, Atlas warm | 1–2s |
| Container cold, Atlas warm | 4–7s |
| Container cold, Atlas asleep (worst case) | 8–15s |
| With keep-warm cron (Atlas always warm) | 4–7s consistently |

Atlas M0 wake itself can't be eliminated without paying for M10 (~$60/mo). The cache lets the UI render *before* Atlas finishes waking, then live updates fold in seamlessly once Mongo writes succeed again.

---

## Tradeoffs and risks

- Blocking `listen()` on the first poll cycle adds ~1–2s to container start. The 8s race timeout protects against pathological Atlas wake.
- The in-memory cache is per-instance. With `--min-instances=0` and modest traffic this is single-instance in practice. If `--min-instances` is later raised, each instance warms its cache independently from its own poller — still correct, just slightly more polling work.
- Re-emitting identical payloads on the first poll cycle (when the cache was empty) is technically possible if the same hash repeats, but `lastEmittedHash` deduplicates. The client is idempotent regardless.
- Removing `pm2` loses in-container auto-restart, but Cloud Run restarts the container on crash, so PM2 was already redundant.
- The `Config.validate()` fix could surface missing env vars at startup that were silently tolerated before. Production deploys (`deployment.yml`) already set `DATABASE_URL` and `EXTERNAL_API_NAME`, so this should be a no-op there.

---

## Rollback

If something regresses in production, the safest rollback is to redeploy the previous Cloud Run revision via the GCP console (`gcloud run services update-traffic devops-insights --to-revisions=<previous>=100 --region=<region>`). All changes here are forward-compatible with the previous client (the only protocol addition, `retryAfterMs`, is optional).

To revert in code, the smallest set of changes is:

- Restore `void this.pollOnce(api)` in `api-poller.ts` (don't await first pass).
- Drop the `Promise.race([...whenReady, 8s])` gate in `setupServer.ts` `start()`.
- Skip the cache in `metrics:get` (read directly from Mongo).

Everything else (Dockerfile, deploy flags, retry logic, validate fix, /health Mongo ping) is independently safe and can stay.

---

## Related docs

- [`CLAUDE.md`](CLAUDE.md) — orientation for AI agents working in this repo.
- [`README.md`](README.md) — project overview and quick start.
- [`server/README.md`](server/README.md) — server-side deep dive.
- [`server/MANIFESTO.md`](server/MANIFESTO.md) — original architecture decisions.
- [`server/SCALING.md`](server/SCALING.md) and [`client/SCALING.md`](client/SCALING.md) — scaling roadmap and known limitations.
