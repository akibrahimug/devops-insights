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

If the DB is a standalone (no replica set), the server auto-falls back to "directEmit" mode where the poller emits to Socket.IO directly instead of relying on change streams — see `setupServer.ts:51-57`.

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

- `metrics:get { source? }` → server replies `metrics:data` (single-source or all-sources shape varies on whether `source` was passed; see `setupServer.ts:146-197`).
- `metrics:subscribe { source }` / `metrics:unsubscribe { source }` — joins/leaves the per-region room `metrics:<apiName>:<source>`.
- `metrics:getHistory { source?, from?, to?, limit? }` → `metrics:history`.
- Live broadcasts arrive as `metrics-update` (and `metrics-error` for region failures).
- Errors come back on `metrics:error`.

Allowed `source` values are loaded from `server/src/static/api-regions.json` (currently 6 regions). The client mirrors this list inline in `app/page.tsx` — keep them in sync.

### Data flow (backend)

1. **`api-poller.ts`** polls `https://data--<source>.<apiName>.io/status?stats=1` every 30s for each region. `apiName` comes from `EXTERNAL_API_NAME` env var (lowercased). Each payload is SHA1-hashed; on hash change it upserts `metrics_latest` and appends to `metrics_history`.
2. **`change-streams.ts`** watches `metrics_latest` via Mongo change streams (requires replica set) and emits `metrics-update` to the per-region Socket.IO room. If change streams aren't available, the poller emits directly (`enableDirectEmit()`).
3. **Mongo models** (`shared/services/db/models/Metric.models.ts`): `MetricLatest` (one doc per `(api, source)`, unique compound index) and `MetricHistory` (append-only, 7-day TTL on `createdAt`).
4. **Multi-instance leadership**: when `REDIS_HOST` is set, `RedisLeaderLock` (`shared/services/redis/leader.lock.ts`) ensures only one instance polls at a time. Socket.IO also wires the Redis adapter for cross-instance broadcasting (`setupServer.ts:104-116`). Without Redis, the server runs single-instance.

### Frontend state model

`client/app/contexts/WebSocketContext.tsx` is the single source of truth for socket lifecycle and metrics state. It:

- Maintains one Socket.IO connection for the whole app (mounted in `app/layout.tsx`).
- Tracks `metrics` (current snapshot), `latestTimestamps`, `history`, `isConnected`, and a `liveEnabled` flag.
- Auto-subscribes to every source returned by `metrics:get` when live mode is on; unsubscribes from all when entering history mode.
- Uses a `liveEnabledRef` so socket event handlers (closed over the initial state) can read the latest flag — when adding new handlers, follow the same ref pattern.

`HeaderContext` is configured by each page via `useHeader().setHeader(...)` in an effect; the global `HeaderMount` renders it. Pages own their auto-refresh / live-vs-history toggle and pass callbacks up.

Region drill-down lives at `app/regions/[region]/page.tsx`.

### Config and validation

`server/src/config.ts` is a singleton with `validate()`. **Note**: `validate()` iterates `Object.keys(this)` but destructures into `[key, value]` — this is a bug (the loop body never sees real values), so missing-env-var validation does not actually throw. Treat env vars as optional defaults rather than relying on validation.

Required-ish env vars: `DATABASE_URL`, `EXTERNAL_API_NAME`, `PORT` (default 5000), `REDIS_HOST` (optional, enables leader election + adapter), `CLIENT_URL`, `NODE_ENV`.

## Deployment

GitHub Actions (`.github/workflows/deployment.yml`) builds `server/Dockerfile` on every push to `master` and deploys to Google Cloud Run (`devops-insights` service). The Dockerfile is multi-stage and runs as a non-root user; `yarn start` runs `node dist/app.js` directly (the README mentions PM2 but the Dockerfile does not use it). Frontend deploys via Vercel (see `.vercel/`).
