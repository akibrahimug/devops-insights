"use client";

/**
 * Context: WebSocketContext
 * Provides a single Socket.IO connection and convenience APIs to get latest
 * metrics, subscribe/unsubscribe to sources, toggle live updates, and fetch
 * historical data. I maintain derived UI state like connection status and
 * last update timestamps.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";

export interface MetricData {
  [key: string]: unknown;
}

export interface MetricsResponse {
  api: string;
  source?: string;
  data: MetricData | Record<string, MetricData>;
  updatedAt?: string;
  timestamp?: string;
  updatedAtBySource?: Record<string, string>;
  count?: number;
}

export interface WebSocketState {
  socket: Socket | null;
  isConnected: boolean;
  metrics: Record<string, MetricData>;
  lastUpdate: Date | null;
  latestTimestamps: Record<string, string>;
  history: Array<{
    source: string;
    data: MetricData;
    createdAt: string;
    updatedAt?: string;
  }>;
  error: string | null;
  subscribeToSource: (source: string) => void;
  unsubscribeFromSource: (source: string) => void;
  getInitialData: (source?: string) => void;
  getHistory: (params: {
    source?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) => void;
  enableLive: () => void;
  disableLive: () => void;
}
// WebSocketContext is a context that provides the socket connection and the metrics data
// It is used to subscribe to and unsubscribe from metrics for a given source
// It is used to get the initial data for a given source
// It is used to store the last update time for the metrics
// It is used to store the error message if the connection fails

// Define the context
const WebSocketContext = createContext<WebSocketState | null>(null);

// Resolve backend origin once. Falls back to localhost during dev.
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// Define the WebSocketProvider component
export function WebSocketProvider({ children }: { children: ReactNode }) {
  // Define the state variables (socket, isConnected, metrics, lastUpdate, error)
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, MetricData>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [latestTimestamps, setLatestTimestamps] = useState<
    Record<string, string>
  >({});
  const [history, setHistory] = useState<
    Array<{
      source: string;
      data: MetricData;
      createdAt: string;
      updatedAt?: string;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [liveEnabled, setLiveEnabled] = useState<boolean>(true);
  const liveEnabledRef = useRef<boolean>(liveEnabled);

  // Keep a ref in sync so event handlers use the latest flag
  useEffect(() => {
    liveEnabledRef.current = liveEnabled;
  }, [liveEnabled]);

  // Initialize the Socket.IO connection once on mount. I set up
  // connection lifecycle handlers, latest snapshot and live update channels,
  // and a history channel for time window queries.
  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(BACKEND_URL, {
      transports: ["websocket", "polling"], // Prefer WebSocket; Socket.IO will fall back to polling if WS is unavailable
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000, // 20 seconds timeout
    });

    // Connection event handlers
    newSocket.on("connect", () => {
      console.log("Connected to DevOps Insights backend");
      setIsConnected(true);
      setError(null);
    });

    // Disconnect event handler
    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected from backend:", reason);
      setIsConnected(false);
    });

    // Connection error event handler
    newSocket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setError(`Connection failed: ${err.message}`);
      setIsConnected(false);
    });

    // Metrics event handlers
    // Latest snapshot payload. If a source is provided, I update just that key;
    // otherwise the payload contains a map of all sources.
    newSocket.on("metrics:data", (data: MetricsResponse) => {
      // Only log in live mode; still process payload for initial/latest snapshots
      if (liveEnabledRef.current) {
        console.log("Received metrics data:", data);
      }

      // If the data has a source, update the metrics for that source
      if (data.source) {
        // Single source data (e.g. a single server)
        setMetrics((prev) => ({
          ...prev,
          [data.source!]: data.data as MetricData,
        }));
        // subscribe to realtime updates for this source (only if live mode)
        if (liveEnabledRef.current) {
          try {
            newSocket.emit("metrics:subscribe", { source: data.source });
          } catch {}
        }
      } else {
        // All sources data (e.g. all servers)
        setMetrics(data.data as Record<string, MetricData>);
        if (data.updatedAtBySource) setLatestTimestamps(data.updatedAtBySource);
        // subscribe to realtime updates for all sources returned (only if live mode)
        if (liveEnabledRef.current) {
          try {
            const all = data.data as Record<string, MetricData>;
            Object.keys(all || {}).forEach((src) =>
              newSocket.emit("metrics:subscribe", { source: src })
            );
          } catch {}
        }
      }

      // Update the last update time and clear the error
      setLastUpdate(new Date());
      setError(null);
    });

    // Metrics error event handler
    newSocket.on("metrics:error", (err: { message: string }) => {
      console.error("Metrics error:", err);
      setError(err.message);
    });

    // Real-time metrics updates
    // Live streaming updates for individual sources (suppressed in history mode).
    newSocket.on("metrics-update", (data: MetricsResponse) => {
      // In history mode, suppress logs and updates entirely
      if (!liveEnabledRef.current) return;
      console.log("Received real-time metrics update:", data);

      // If the data has a source, update the metrics for that source
      if (data.source) {
        if (!liveEnabledRef.current) return; // ignore live updates when history mode is active
        // Single source data (e.g. a single server)
        setMetrics((prev) => ({
          ...prev,
          [data.source!]: data.data as MetricData,
        }));
        const ts = data.updatedAt || data.timestamp;
        if (ts) {
          setLatestTimestamps((prev) => ({ ...prev, [data.source!]: ts }));
        }
        // Update the last update time
        setLastUpdate(new Date());
      }
    });

    // Historical data events
    // History payload returns an array of items within the requested window.
    newSocket.on(
      "metrics:history",
      (payload: {
        api: string;
        source?: string;
        items: Array<{
          api: string;
          source: string;
          data: MetricData;
          createdAt: string;
          updatedAt?: string;
        }>;
        count: number;
      }) => {
        console.log("Received history data:", {
          api: payload.api,
          source: payload.source,
          count: payload.count,
          itemsLength: payload.items?.length,
          items: payload.items,
        });

        // Merge new history data with existing data, avoiding duplicates
        setHistory((prevHistory) => {
          const newItems = payload.items.map((it) => ({
            source: it.source,
            data: it.data,
            createdAt: it.createdAt,
            updatedAt: it.updatedAt,
          }));

          // Create a map of existing items by unique key (source + createdAt)
          const existingMap = new Map<
            string,
            {
              source: string;
              data: MetricData;
              createdAt: string;
              updatedAt?: string;
            }
          >();
          prevHistory.forEach((item) => {
            const key = `${item.source}-${item.createdAt}`;
            existingMap.set(key, item);
          });

          // Add new items if they don't already exist
          newItems.forEach((item) => {
            const key = `${item.source}-${item.createdAt}`;
            if (!existingMap.has(key)) {
              existingMap.set(key, item);
            }
          });

          // Convert back to array and sort newest first
          const merged = Array.from(existingMap.values()).sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          return merged;
        });
        setLastUpdate(new Date());
      }
    );

    // Set the socket
    setSocket(newSocket);

    // Cleanup on unmount (close the socket)
    return () => {
      newSocket.close();
    };
  }, []);

  // Subscribe to metrics for a given source.
  const subscribeToSource = (source: string) => {
    if (socket && isConnected) {
      console.log(`Subscribing to metrics for source: ${source}`);
      socket.emit("metrics:subscribe", { source });
    }
  };

  // Unsubscribe from metrics for a given source.
  const unsubscribeFromSource = (source: string) => {
    if (socket && isConnected) {
      console.log(`Unsubscribing from metrics for source: ${source}`);
      socket.emit("metrics:unsubscribe", { source });
    }
  };

  // Request the latest snapshot for a source or all sources.
  const getInitialData = (source?: string) => {
    // If the socket is connected, emit the request to get the initial data
    if (socket && isConnected) {
      console.log(
        `Requesting initial data${
          source ? ` for source: ${source}` : " for all sources"
        }`
      );
      // Emit the request to get the initial data
      socket.emit("metrics:get", source ? { source } : {});
    }
  };

  // Request historical data for a time window (clears existing history first
  // to avoid mixing ranges in the UI).
  const getHistory = (params: {
    source?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    if (socket && isConnected) {
      // Clear existing history when making a new request to avoid mixing time ranges
      setHistory([]);
      console.log("Cleared existing history for new request");
      // Emit the request to get the history data
      socket.emit("metrics:getHistory", params || {});
    } else {
      console.warn("Cannot request history: socket not connected", {
        socketExists: !!socket,
        isConnected,
      });
    }
  };

  // Toggle live streaming mode for the UI (history mode disables live updates).
  const disableLive = () => setLiveEnabled(false);
  const enableLive = () => setLiveEnabled(true);

  // When disabling live (entering history mode), proactively unsubscribe from all known sources
  useEffect(() => {
    if (!liveEnabled && socket && isConnected) {
      try {
        const srcs = Object.keys(metrics || {});
        srcs.forEach((s) => socket.emit("metrics:unsubscribe", { source: s }));
      } catch {}
    }
    // Only react to liveEnabled changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveEnabled]);

  // Define the value of the context (socket, isConnected, metrics, lastUpdate, error, subscribeToSource, unsubscribeFromSource, getInitialData)
  const value: WebSocketState = {
    socket,
    isConnected,
    metrics,
    lastUpdate,
    latestTimestamps,
    history,
    error,
    subscribeToSource,
    unsubscribeFromSource,
    getInitialData,
    getHistory,
    enableLive,
    disableLive,
  };

  // Return the context provider with the value
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Use the context in the app
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  // If the context is not found, throw an error
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
