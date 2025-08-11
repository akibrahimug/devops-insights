# Scaling, Resilience, and Observability

This document highlights current weaknesses, areas for improvement, and concrete proposals to scale and harden the DevOps Insights frontend (Next.js) and its interaction patterns with the backend.

## Gaps and Weaknesses

- **Data-heavy history mode**
  - One-week history merging/lookup in the client can be slow when thousands of points are requested and aggregated (bucketed compression and per-source folding in the browser).
- **Partial test coverage**
  - We prioritized core business logic (WebSocket context, pages, helpers). Some complex chart components, UI wrappers, and edge cases are not yet covered.
  - No end-to-end (E2E) tests; only component/unit tests are present.
- **Client error visibility**
  - Production runtime errors on the client are not currently captured centrally.
- **Realtime fan-out**
  - Subscribing to many sources can increase client-side work and memory usage.

## Strengthening Strategies

### Performance and Data Processing

- **Server-side aggregation for history**
  - Move most of the week-scale aggregation (bucketing, per-source compression, deduplication) to the backend; send pre-aggregated series to the client.
  - Provide pagination/windowing for history (e.g., day slices) and lazy-load additional windows as users scroll or change range.
- **Streaming and incremental rendering**
  - Stream history in smaller chunks, progressively update charts.
  - Use Web Workers for client-side aggregation when backend aggregation isn’t available to prevent main-thread blocking.

### WebSocket Lifecycle and Subscriptions

- **Smarter subscription management**
  - Batch subscribe/unsubscribe messages to reduce chattiness when toggling live/history or switching ranges.

### Testing and Quality

- **Expand test coverage**
  - Add tests for chart components (render guards, dataset mapping, option generation) and UI wrappers (tabs/selects).
  - Add failure-mode tests (socket connect_error, metrics:error), timeouts, reconnection attempts, and header/page coordination.
- **Introduce E2E tests (Playwright/Cypress)**
  - Cover navigation, live vs. history toggling, range selection, and visual smoke tests for charts and cards.

### Observability and Monitoring

- **Client monitoring (Sentry)**
  - Integrate Sentry for Next.js to capture client errors, performance traces, and session replays. Upload source maps in CI for readable stack traces.
  - Track WebSocket lifecycle breadcrumbs (connect/disconnect/errors) and UI interactions (mode switches, range changes).
- **Metrics and profiling**
  - Measure client CPU/memory impact of large history requests. Use Web Vitals and custom metrics for chart render time and data processing latency.

### Security and Resilience

- **Harden WS connection**
  - Use auth tokens, origin checks.
- **Graceful degradation**
  - Implement timeouts for history requests; fallback to smaller windows when the client is under pressure.

## Untested or Lightly Tested Areas

- Complex chart components (`ActiveConnectionsCard`, `CpuCoresCard`, `CpuLoadComparisonCard`, history sections) beyond basic guards.
- UI wrappers and interactions (tabs, selects) across all states and accessibility modes.
- Error/reconnect flows (connect_error, network blips, server restarts).
- Long-range data flows (1 week) with large series and low-end device behavior.

## Roadmap (Suggested)

1. Backend aggregation endpoints for history windows and decimated series.
2. Client streaming + Web Worker aggregation (fallback).
3. Sentry integration with performance tracing and WS breadcrumbs.
4. E2E test suite (Playwright) and increased component coverage for charts.
5. Subscription batching and sampling controls to reduce payload sizes.
6. Progressive loading UX for history (skeletons, chunked updates, cancelation).

## Notes

- Current test suite: 10 files, 61 tests, 100% passing; overall coverage ~39% lines (v8). Core business logic and utilities are well covered; charts and some UI layers are intentionally thinner and should be addressed with follow-up work.
