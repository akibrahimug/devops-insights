import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  loadSnapshot,
  saveSnapshot,
  type PersistedSnapshot,
} from "../metricsStore";

function makeSnapshot(
  overrides: Partial<PersistedSnapshot> = {}
): PersistedSnapshot {
  return {
    metrics: { "us-east": { status: "ok", value: 1 } },
    latestTimestamps: { "us-east": "2025-01-01T00:00:00.000Z" },
    savedAt: "2025-01-01T00:00:01.000Z",
    ...overrides,
  };
}

describe("metricsStore (IndexedDB)", () => {
  beforeEach(() => {
    // Fresh in-memory IndexedDB per test for isolation.
    globalThis.indexedDB = new IDBFactory();
  });

  it("returns null when nothing has been persisted", async () => {
    await expect(loadSnapshot()).resolves.toBeNull();
  });

  it("round-trips a saved snapshot", async () => {
    const snapshot = makeSnapshot();
    await saveSnapshot(snapshot);
    await expect(loadSnapshot()).resolves.toEqual(snapshot);
  });

  it("overwrites the previous snapshot (single latest record)", async () => {
    await saveSnapshot(makeSnapshot({ savedAt: "2025-01-01T00:00:01.000Z" }));
    await saveSnapshot(
      makeSnapshot({
        metrics: { "eu-west": { status: "ok", value: 2 } },
        savedAt: "2025-01-02T00:00:00.000Z",
      })
    );
    const loaded = await loadSnapshot();
    expect(loaded?.savedAt).toBe("2025-01-02T00:00:00.000Z");
    expect(loaded?.metrics).toEqual({ "eu-west": { status: "ok", value: 2 } });
  });

  describe("without IndexedDB (SSR / private mode)", () => {
    let original: typeof globalThis.indexedDB;
    beforeEach(() => {
      original = globalThis.indexedDB;
      // Simulate an environment where IndexedDB is unavailable.
      (globalThis as any).indexedDB = undefined;
    });
    afterEach(() => {
      globalThis.indexedDB = original;
    });

    it("loadSnapshot degrades to null without throwing", async () => {
      await expect(loadSnapshot()).resolves.toBeNull();
    });

    it("saveSnapshot is a no-op without throwing", async () => {
      await expect(saveSnapshot(makeSnapshot())).resolves.toBeUndefined();
    });
  });
});
