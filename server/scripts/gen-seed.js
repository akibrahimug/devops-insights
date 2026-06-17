"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const fake_data_generator_1 = require("../src/services/fake-data-generator");
const api_regions_json_1 = __importDefault(require("../src/static/api-regions.json"));
const OUT = (0, path_1.join)(__dirname, "..", "..", "client", "lib", "cache", "seed-metrics.json");
const realNow = Date.now.bind(Date);
function healthyPayloadFor(region) {
    // Walk forward through 30s windows until the region generates a healthy payload.
    const baseWindow = Math.floor(realNow() / 30000);
    for (let i = 0; i < 500; i++) {
        const ts = (baseWindow + i) * 30000;
        Date.now = () => ts;
        try {
            const payload = (0, fake_data_generator_1.generateFakeMetrics)(region);
            if (payload.status === "ok")
                return payload;
        }
        finally {
            Date.now = realNow;
        }
    }
    // Fallback: return whatever the current window produces.
    return (0, fake_data_generator_1.generateFakeMetrics)(region);
}
const sources = api_regions_json_1.default.allowed_sources;
const snapshot = {};
for (const source of sources) {
    snapshot[source] = healthyPayloadFor(source);
}
(0, fs_1.writeFileSync)(OUT, JSON.stringify(snapshot, null, 2) + "\n");
console.log(`Wrote seed snapshot for ${sources.length} regions -> ${OUT}`);
