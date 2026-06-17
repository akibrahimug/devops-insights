/**
 * Bundled seed snapshot.
 *
 * Shipped with the client so a first-ever visitor (empty IndexedDB) sees a full
 * dashboard instantly, before the backend cold-start delivers live data. The
 * JSON is generated from the server's `generateFakeMetrics` via
 * `server/scripts/gen-seed.ts`, so its shape mirrors live payloads exactly.
 *
 * Re-generate with: cd server && npx ts-node scripts/gen-seed.ts
 */

import type { MetricData } from "@/app/contexts/WebSocketContext";
import seedJson from "./seed-metrics.json";

export const seedMetrics = seedJson as unknown as Record<string, MetricData>;

// A fixed, clearly-old timestamp so the "cached" indicator and any age display
// treat the seed as stale until real data arrives. Epoch keeps it unambiguous.
const SEED_TIMESTAMP = new Date(0).toISOString();

export const seedTimestamps: Record<string, string> = Object.keys(
  seedMetrics,
).reduce<Record<string, string>>((acc, source) => {
  acc[source] = SEED_TIMESTAMP;
  return acc;
}, {});
