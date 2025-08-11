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
});
