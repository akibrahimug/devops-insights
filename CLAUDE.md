# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two independent npm projects living side-by-side:

- `server/` — Node.js + TypeScript backend (Express + Socket.IO + Mongoose). Uses **yarn**, Jest, ts-node/nodemon. Path aliases: `@root/*` → `src/*`, `@global/*` → `src/shared/globals/*`, `@services/*` → `src/shared/services/*`. Output goes to `dist/` (path aliases rewritten by `tsc-alias`).
- `client/` — Next.js 16 (App Router) + React 19 + TypeScript dashboard. Uses **pnpm/npm**, Vitest, Tailwind. Path alias: `@/*` → repo root. Talks to the backend exclusively over Socket.IO; HTTP is only used for `/api/v1/health`.

Run all `npm`/`yarn` commands inside the relevant subdirectory, not the repo root.

## Commands

### Backend (`server/`)

```bash
yarn dev              # nodemon + ts-node, pipes through bunyan pretty-printer
yarn build            # tsc -p . && tsc-alias (rewrites @root/* path aliases)
yarn start            # node dist/app.js (used by Docker / Cloud Run)
yarn test             # jest --coverage -w=1 --forceExit --detectOpenHandles
yarn lint:fix
yarn prettier:fix
```

Run a single Jest test: `yarn test --testPathPattern=routes` or `npx jest src/test/routes.test.ts`. Tests live in `**/test/*.ts` under `src/` (note: `test/` is the conventional folder name, not `__tests__`).

Local Mongo with replica set (required for change streams):

```bash
docker compose up -d mongo
docker exec -it mongo-rs mongosh --eval "rs.initiate()"
```

If the DB is a standalone (no replica set), the server auto-falls back to "directEmit" mode where the poller emits to Socket.IO directly instead of relying on change streams.

### Frontend (`client/`)

```bash
npm run dev           # next dev
npm run build
npm run test          # vitest run -c vitest.config.mts
npm run test:ui       # vitest watch UI
npm run test:coverage
```

Run a single test: `npx vitest run -c vitest.config.mts path/to/file.test.tsx`. Two vitest configs exist (`vitest.config.mts` and `vitest.config.ts`) — scripts always pin `-c vitest.config.mts`, do the same when invoking vitest manually.

`NEXT_PUBLIC_BACKEND_URL` (defaults to `http://localhost:5000` via `next.config.ts`) controls which backend the client connects to.

## Architecture

### Hybrid HTTP + WebSocket model

Express handles only system endpoints; **all dashboard data flows over Socket.IO**. The HTTP `/api/v1/metrics` route returns `426 Upgrade Required` and points clients at the WS protocol — don't add new HTTP data routes, extend the socket handlers in `setupServer.ts` instead.

WebSocket protocol (client ⇆ server):

- `metrics:get { source? }` → server replies `metrics:data` (single-source or all-sources shape varies on whether `source` was passed; see `setupServer.ts`).
- `metrics:subscribe { source }` / `metrics:unsubscribe { source }` — joins/leaves the per-region room `metrics:<apiName>:<source>`.
- `metrics:getHistory { source?, from?, to?, limit? }` → `metrics:history`.
- Live broadcasts arrive as `metrics-update` (and `metrics-error` for region failures).
- Errors come back on `metrics:error`. **Retryable errors include `retryAfterMs`** (e.g. `{ message: "No data yet", retryAfterMs: 2000 }`). The client re-emits `metrics:get` after that delay.

Allowed `source` values are loaded from `server/src/static/api-regions.json` (currently 6 regions). The client mirrors this list inline in `app/page.tsx` — keep them in sync.

### Cold-start path and the in-memory cache

First-paint resilience is a deliberate part of the design — see `server/src/services/metrics-cache.ts`. The cache is a process-local snapshot of the latest payload per source. It exists because:

1. **Mongo Atlas M0 (free tier) sleeps** after ~60min idle and takes 30–90s to wake. Reading from Mongo on first request would mean the dashboard hangs that whole time.
2. **Cloud Run scales to zero**, so a cold revision needs to serve data while Mongo is still warming up.

The cache is fed by the poller *before* the Mongo write, so even if Atlas is asleep the cache fills from generated data and clients render in seconds.

Startup sequence in `setupServer.start()`:
1. `mongoose.connect()`
2. Create HTTP + Socket.IO server
3. Wire change streams if available (with a 1.5s timeout — Atlas mid-wake can hang `replSetGetStatus`); otherwise enable `directEmit`
4. `await Promise.race([ poller.startPolling() + metricsCache.whenReady(), 8s timeout ])` — gate `listen()` on the cache being warm so the first connection always gets data
5. `applicationRoutes()` → `listen()`

If the 8s timeout fires before the cache is ready, the server still listens; the client retries with backoff (see below).

### Data flow (backend)

1. **`api-poller.ts`** — `pollOnce(source)` generates a fake payload via `generateFakeMetrics()` (real HTTP polling is intentionally disabled — fake data keeps cold start cheap), populates `metricsCache.set(source, ...)` first, then attempts a SHA1-keyed Mongo upsert. The Mongo write is wrapped in try/catch so an asleep Atlas does not break the cache or live updates. `lastEmittedHash` per source ensures `directEmit` still broadcasts on hash change even when Mongo is unreachable.
2. **`change-streams.ts`** watches `metrics_latest` via Mongo change streams (requires replica set) and emits `metrics-update` to the per-region Socket.IO room. If change streams aren't available, `directEmit` (in the poller) takes over.
3. **`metrics-cache.ts`** — singleton with `set`, `get`, `getAll`, `isReady`, `whenReady`. The `metrics:get` handler reads from this cache first; only if the cache is empty does it fall back to Mongo.
4. **Mongo models** (`shared/services/db/models/Metric.models.ts`): `MetricLatest` (one doc per `(api, source)`, unique compound index) and `MetricHistory` (append-only, 7-day TTL on `createdAt`).
5. **Multi-instance leadership**: when `REDIS_HOST` is set, `RedisLeaderLock` (`shared/services/redis/leader.lock.ts`) ensures only one instance polls at a time. Socket.IO also wires the Redis adapter for cross-instance broadcasting. Without Redis, the server runs single-instance — the prod Cloud Run config does NOT set `REDIS_HOST`.

### Frontend state model

`client/app/contexts/WebSocketContext.tsx` is the single source of truth for socket lifecycle and metrics state. It:

- Maintains one Socket.IO connection for the whole app (mounted in `app/layout.tsx`).
- Tracks `metrics` (current snapshot), `latestTimestamps`, `history`, `isConnected`, and a `liveEnabled` flag.
- Auto-subscribes to every source returned by `metrics:get` when live mode is on; unsubscribes from all when entering history mode.
- Uses a `liveEnabledRef` so socket event handlers (closed over the initial state) can read the latest flag — when adding new handlers, follow the same ref pattern.
- **Retries `metrics:get` with exponential backoff** (1s → 2s → 4s → 8s, max 5 attempts) when the server emits `metrics:error` with a retryable message ("No data yet", "Failed to fetch metrics") or a `retryAfterMs` hint. Tracked via `initialRetryRef`. Cancelled on first `metrics:data` or `metrics-update`. Reset on every `connect`.

#### Client-side instant first paint (seed → IndexedDB → live)

To avoid showing skeletons while the backend cold-starts, `metrics`/`latestTimestamps` are fed by three layers, each overriding the previous, all wired in `WebSocketContext`:

1. **Bundled seed** (`client/lib/cache/seed.ts` + `seed-metrics.json`) — the *initial* state, so first paint (incl. SSR) shows a full dashboard. Generated from the server's `generateFakeMetrics` via `server/scripts/gen-seed.ts` (run `cd server && npx ts-node scripts/gen-seed.ts` to regenerate — it picks a healthy window per region). **If the live payload shape changes, regenerate the seed** so it stays in sync.
2. **IndexedDB cache** (`client/lib/cache/metricsStore.ts`) — a hydrate-on-mount effect loads the user's last persisted *live* snapshot. A debounced effect persists every live snapshot back (skipping `status === "error"` sources). Store helpers are fault-tolerant (SSR/private-mode/quota → no-op), so call them only from effects.
3. **Live socket data** — `metrics:data` / `metrics-update` handlers set `liveArrivedRef.current = true` and `dataOrigin = "live"`. The `liveArrivedRef` guard stops a slow IndexedDB read from clobbering live data that raced in first — follow this ref pattern if you add hydration paths.

`dataOrigin` (`"seed" | "cache" | "live"`) and `snapshotSavedAt` are exposed on the context; pages pass `dataStale: dataOrigin !== "live"` into `setHeader` to render the muted "Cached · updating…" badge (`AppHeader`), which clears on the first live payload.

`HeaderContext` is configured by each page via `useHeader().setHeader(...)` in an effect; the global `HeaderMount` renders it. Pages own their auto-refresh / live-vs-history toggle and pass callbacks up.

Region drill-down lives at `app/regions/[region]/page.tsx`.

### Config and validation

`server/src/config.ts` is a singleton with `validate()`. Required: `DATABASE_URL`. Recommended (warned, not thrown): `EXTERNAL_API_NAME`. Optional: `REDIS_HOST`, `CLIENT_URL`, `PORT` (default 5000), `NODE_ENV`.

## Deployment

GitHub Actions (`.github/workflows/deployment.yml`) builds `server/Dockerfile` on every push to `master` and deploys to Google Cloud Run (`devops-insights` service). Key flags: `--cpu=1 --cpu-boost --memory=512Mi --concurrency=80 --min-instances=0 --timeout=300`. `--cpu-boost` is free and shortens cold start by ~30–50%. `--min-instances=0` keeps the free tier — bump to `1` if cold starts ever become unacceptable (~$5–15/mo).

The Dockerfile is multi-stage on `node:20-alpine`, runs as a non-root user, and starts via `node dist/app.js` directly (no PM2 — Cloud Run restarts the container on crash, making PM2 redundant).

Frontend deploys via Vercel (see `.vercel/`).

### Atlas M0 keep-warm

The free Mongo Atlas M0 cluster sleeps after ~60 min idle. To prevent the resulting 30–90s wake-up cost, set up a Cloud Scheduler job hitting `/api/v1/health` every 5 minutes — the health endpoint pings Mongo, keeping the connection pool warm. Free tier covers it (3 jobs / no incremental cost at this cadence).

## See also

- `MIGRATION.md` — detailed write-up of the cold-start fix (what changed, why, how to verify).
- `server/MANIFESTO.md` — original architecture decisions.
- `server/SCALING.md` and `client/SCALING.md` — scaling roadmap and known limitations.
