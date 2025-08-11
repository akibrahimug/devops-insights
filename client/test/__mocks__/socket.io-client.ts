import { vi } from "vitest";

// Lightweight mock for socket.io-client used in WebSocketContext tests
export const io = vi.fn(() => {
  const handlers: Record<string, Function[]> = {};
  const socket = {
    on: (event: string, cb: Function) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(cb);
    },
    emit: vi.fn(),
    close: vi.fn(),
    // test-only helper to trigger events
    __emit: (event: string, payload?: any) => {
      (handlers[event] || []).forEach((fn) => fn(payload));
    },
  } as any;
  lastSocket = socket;
  return socket;
});

export type Socket = ReturnType<typeof io>;
export let lastSocket: any = null;
export const getLastSocket = () => lastSocket;
