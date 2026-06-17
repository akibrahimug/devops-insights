/**
 * One-off script: generate a bundled seed snapshot for the client.
 *
 * The client renders this snapshot instantly on a first-ever visit (before any
 * IndexedDB cache exists and while the backend cold-starts). We produce it from
 * the real `generateFakeMetrics` so the shape stays exactly in sync with what
 * the socket later delivers.
 *
 * For every region we search forward through the generator's 30-second time
 * windows for one that yields a healthy ("ok") payload, so the seed always
 * shows a green dashboard rather than a coincidental error state.
 *
 * Run:  npx ts-node scripts/gen-seed.ts   (from server/)
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { generateFakeMetrics } from "../src/services/fake-data-generator";
import regions from "../src/static/api-regions.json";

const OUT = join(
  __dirname,
  "..",
  "..",
  "client",
  "lib",
  "cache",
  "seed-metrics.json",
);

const realNow = Date.now.bind(Date);

function healthyPayloadFor(region: string): unknown {
  // Walk forward through 30s windows until the region generates a healthy payload.
  const baseWindow = Math.floor(realNow() / 30000);
  for (let i = 0; i < 500; i++) {
    const ts = (baseWindow + i) * 30000;
    Date.now = () => ts;
    try {
      const payload = generateFakeMetrics(region) as { status?: string };
      if (payload.status === "ok") return payload;
    } finally {
      Date.now = realNow;
    }
  }
  // Fallback: return whatever the current window produces.
  return generateFakeMetrics(region);
}

const sources: string[] = regions.allowed_sources;
const snapshot: Record<string, unknown> = {};
for (const source of sources) {
  snapshot[source] = healthyPayloadFor(source);
}

writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + "\n");
console.log(
  `Wrote seed snapshot for ${sources.length} regions -> ${OUT}`,
);
