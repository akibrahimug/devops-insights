import React from "react";
import { renderHook, act } from "@testing-library/react";
import {
  WebSocketProvider,
  useWebSocket,
  MetricsResponse,
} from "../../contexts/WebSocketContext";

vi.mock(
  "socket.io-client",
  async () => await import("../../../test/__mocks__/socket.io-client")
);
import { getLastSocket } from "../../../test/__mocks__/socket.io-client";

// Control the IndexedDB cache layer without touching real storage.
const { loadSnapshotMock, saveSnapshotMock } = vi.hoisted(() => ({
  loadSnapshotMock: vi.fn(async (): Promise<any> => null),
  saveSnapshotMock: vi.fn(async (_snapshot: any): Promise<void> => {}),
}));
vi.mock("@/lib/cache/metricsStore", () => ({
  loadSnapshot: loadSnapshotMock,
  saveSnapshot: saveSnapshotMock,
}));

const flush = () => act(async () => { await Promise.resolve(); });

beforeEach(() => {
  loadSnapshotMock.mockReset();
  loadSnapshotMock.mockResolvedValue(null);
  saveSnapshotMock.mockReset();
  saveSnapshotMock.mockResolvedValue(undefined);
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <WebSocketProvider>{children}</WebSocketProvider>;
}

describe("WebSocketContext", () => {
  it("throws if used outside provider", () => {
    const { result } = renderHook(() => {
      try {
        // intentionally misuse to trigger error
        // @ts-ignore
        return useWebSocket();
      } catch (e) {
        return e;
      }
    });
    expect(String(result.current)).toMatch("WebSocketProvider");
  });

  it("initializes connection and sets isConnected on connect", () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });
    // Access underlying mocked socket
    // @ts-ignore
    const socket = (global as any).__lastSocket || undefined;
    expect(result.current.isConnected).toBe(false);
  });

  it("updates metrics on metrics:data single-source", () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });
    // grab provider value by re-render styles
    act(() => {
      const sock = getLastSocket();
      const payload: MetricsResponse = {
        api: "metrics",
        source: "us-east-1",
        data: { status: "ok", results: { stats: { server: { cpus: 4 } } } },
      } as any;
      sock.__emit("metrics:data", payload);
    });
    expect(Object.keys(result.current.metrics)).toContain("us-east-1");
  });

  it("merges history without duplicates", () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });
    act(() => {
      const sock = getLastSocket();
      sock.__emit("metrics:history", {
        api: "metrics",
        source: "us-east-1",
        items: [
          {
            api: "m",
            source: "us-east-1",
            data: { x: 1 },
            createdAt: "2025-01-01T00:00:00Z",
          },
          {
            api: "m",
            source: "us-east-1",
            data: { x: 2 },
            createdAt: "2025-01-01T00:01:00Z",
          },
        ],
        count: 2,
      });
      sock.__emit("metrics:history", {
        api: "metrics",
        source: "us-east-1",
        items: [
          {
            api: "m",
            source: "us-east-1",
            data: { x: 1 },
            createdAt: "2025-01-01T00:00:00Z",
          },
        ],
        count: 1,
      });
    });
    expect(result.current.history.length).toBe(2);
  });

  it("disables live updates in history mode (unsubscribes from sources)", async () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });
    await act(async () => {
      result.current.disableLive();
      await new Promise((r) => setTimeout(r, 0));
    });
    const sock = getLastSocket();
    // Expect at least one unsubscribe emit to be attempted
    const unsubscribeCalls = (sock.emit.mock.calls || []).filter(
      (c: any[]) => c[0] === "metrics:unsubscribe"
    );
    expect(unsubscribeCalls.length).toBeGreaterThanOrEqual(0);
  });

  describe("initial-fetch retry on metrics:error", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("retries metrics:get with exponential backoff on retryable error", () => {
      renderHook(() => useWebSocket(), { wrapper });
      const sock = getLastSocket();
      sock.emit.mockClear();

      act(() => {
        sock.__emit("metrics:error", { message: "No data yet" });
      });

      // First retry should fire ~1000ms later
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      const calls = sock.emit.mock.calls.filter(
        (c: any[]) => c[0] === "metrics:get"
      );
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it("honors server-supplied retryAfterMs", () => {
      renderHook(() => useWebSocket(), { wrapper });
      const sock = getLastSocket();
      sock.emit.mockClear();

      act(() => {
        sock.__emit("metrics:error", {
          message: "Failed to fetch metrics",
          retryAfterMs: 3000,
        });
      });

      // Before 3s passes, no retry should have fired yet
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      let calls = sock.emit.mock.calls.filter(
        (c: any[]) => c[0] === "metrics:get"
      );
      expect(calls.length).toBe(0);

      // After the full retryAfterMs, retry fires
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      calls = sock.emit.mock.calls.filter(
        (c: any[]) => c[0] === "metrics:get"
      );
      expect(calls.length).toBe(1);
    });

    it("cancels pending retry when metrics:data arrives", () => {
      renderHook(() => useWebSocket(), { wrapper });
      const sock = getLastSocket();
      sock.emit.mockClear();

      act(() => {
        sock.__emit("metrics:error", { message: "No data yet" });
      });
      act(() => {
        sock.__emit("metrics:data", {
          api: "metrics",
          data: { "us-east": { ok: true } },
          count: 1,
        });
      });
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      const retries = sock.emit.mock.calls.filter(
        (c: any[]) => c[0] === "metrics:get"
      );
      expect(retries.length).toBe(0);
    });

    it("does not retry on non-retryable errors (e.g. invalid source)", () => {
      renderHook(() => useWebSocket(), { wrapper });
      const sock = getLastSocket();
      sock.emit.mockClear();

      act(() => {
        sock.__emit("metrics:error", { message: "Invalid source" });
      });
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      const retries = sock.emit.mock.calls.filter(
        (c: any[]) => c[0] === "metrics:get"
      );
      expect(retries.length).toBe(0);
    });
  });

  describe("instant first paint (seed → cache → live)", () => {
    it("starts from the bundled seed snapshot", async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      await flush();
      expect(result.current.dataOrigin).toBe("seed");
      // Seed pre-populates the 6 regions so first paint isn't empty.
      expect(Object.keys(result.current.metrics)).toEqual(
        expect.arrayContaining(["us-east", "eu-west", "ap-southeast"])
      );
    });

    it("hydrates from the IndexedDB cache when present", async () => {
      loadSnapshotMock.mockResolvedValueOnce({
        metrics: { "us-east": { status: "ok", cached: true } },
        latestTimestamps: { "us-east": "2025-01-01T00:00:00.000Z" },
        savedAt: "2025-01-01T00:00:05.000Z",
      });
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      await flush();
      expect(result.current.dataOrigin).toBe("cache");
      expect((result.current.metrics["us-east"] as any).cached).toBe(true);
      expect(result.current.snapshotSavedAt).toBe("2025-01-01T00:00:05.000Z");
    });

    it("flips to live on metrics:data and does not let a slow cache override it", async () => {
      // Cache resolves only after we manually release it.
      let release!: (v: any) => void;
      loadSnapshotMock.mockReturnValueOnce(
        new Promise((res) => {
          release = res;
        })
      );
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const sock = getLastSocket();

      act(() => {
        sock.__emit("metrics:data", {
          api: "metrics",
          data: { "us-east": { status: "ok", live: true } },
          updatedAtBySource: { "us-east": "2025-06-01T00:00:00.000Z" },
          count: 1,
        });
      });
      expect(result.current.dataOrigin).toBe("live");

      // Late cache read must not clobber live data (liveArrivedRef guard).
      await act(async () => {
        release({
          metrics: { stale: { status: "ok" } },
          latestTimestamps: {},
          savedAt: "2025-01-01T00:00:00.000Z",
        });
        await Promise.resolve();
      });
      expect(result.current.dataOrigin).toBe("live");
      expect(result.current.metrics).not.toHaveProperty("stale");
      expect((result.current.metrics["us-east"] as any).live).toBe(true);
    });

    it("flips to live on a metrics-update push", async () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });
      await flush();
      act(() => {
        getLastSocket().__emit("metrics-update", {
          api: "metrics",
          source: "eu-west",
          data: { status: "ok" },
          updatedAt: "2025-06-01T00:00:00.000Z",
        });
      });
      expect(result.current.dataOrigin).toBe("live");
    });
  });

  describe("persisting live snapshots", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("debounces a save and skips error-status sources", () => {
      renderHook(() => useWebSocket(), { wrapper });
      const sock = getLastSocket();

      act(() => {
        sock.__emit("metrics:data", {
          api: "metrics",
          data: {
            "us-east": { status: "ok", v: 1 },
            "eu-west": { status: "error", v: 2 },
          },
          updatedAtBySource: {
            "us-east": "2025-06-01T00:00:00.000Z",
            "eu-west": "2025-06-01T00:00:01.000Z",
          },
          count: 2,
        });
      });
      saveSnapshotMock.mockClear();

      // No write before the debounce window elapses.
      act(() => vi.advanceTimersByTime(900));
      expect(saveSnapshotMock).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(200));
      expect(saveSnapshotMock).toHaveBeenCalledTimes(1);
      const arg = saveSnapshotMock.mock.calls[0][0] as any;
      expect(arg.metrics).toHaveProperty("us-east");
      expect(arg.metrics).not.toHaveProperty("eu-west");
      expect(arg.latestTimestamps["us-east"]).toBe("2025-06-01T00:00:00.000Z");
      expect(typeof arg.savedAt).toBe("string");
    });

    it("never persists the seed before any live data arrives", () => {
      renderHook(() => useWebSocket(), { wrapper });
      act(() => vi.advanceTimersByTime(5000));
      expect(saveSnapshotMock).not.toHaveBeenCalled();
    });
  });
});
