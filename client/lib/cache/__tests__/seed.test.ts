import { describe, it, expect } from "vitest";
import { seedMetrics, seedTimestamps } from "../seed";

const REGIONS = [
  "us-east",
  "eu-west",
  "eu-central",
  "us-west",
  "sa-east",
  "ap-southeast",
];

describe("bundled seed snapshot", () => {
  it("covers exactly the 6 supported regions", () => {
    expect(Object.keys(seedMetrics).sort()).toEqual([...REGIONS].sort());
  });

  it("renders every region healthy so first paint is green", () => {
    for (const region of REGIONS) {
      expect((seedMetrics[region] as any).status).toBe("ok");
    }
  });

  it("matches the live payload shape consumed by the dashboard", () => {
    for (const region of REGIONS) {
      const value = seedMetrics[region] as any;
      // Fields the dashboard filter + cards read off each region.
      expect(typeof value.version).toBe("string");
      expect(Array.isArray(value.roles)).toBe(true);
      expect(typeof value.results.stats.online).toBe("number");
      expect(typeof value.results.stats.server.cpus).toBe("number");
      expect(Array.isArray(value.results.stats.server.workers)).toBe(true);
      expect(typeof value.results.memory.usage_percent).toBe("number");
      expect(typeof value.results.services.database).toBe("boolean");
    }
  });

  it("provides a timestamp for every seeded region", () => {
    expect(Object.keys(seedTimestamps).sort()).toEqual(
      Object.keys(seedMetrics).sort()
    );
    for (const region of REGIONS) {
      expect(() => new Date(seedTimestamps[region]).toISOString()).not.toThrow();
    }
  });
});
