"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
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

// Get the backend URL from the environment variables
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

  // Use effect to initialize the socket connection
  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(BACKEND_URL, {
      transports: ["websocket", "polling"], // Fallback to polling if WebSocket fails
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
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
    newSocket.on("metrics:data", (data: MetricsResponse) => {
      console.log("Received metrics data:", data);

      // If the data has a source, update the metrics for that source
      if (data.source) {
        // Single source data (e.g. a single server)
        setMetrics((prev) => ({
          ...prev,
          [data.source!]: data.data as MetricData,
        }));
        // subscribe to realtime updates for this source (only if live mode)
        if (liveEnabled) {
          try {
            newSocket.emit("metrics:subscribe", { source: data.source });
          } catch {}
        }
      } else {
        // All sources data (e.g. all servers)
        setMetrics(data.data as Record<string, MetricData>);
        if (data.updatedAtBySource) setLatestTimestamps(data.updatedAtBySource);
        // subscribe to realtime updates for all sources returned (only if live mode)
        if (liveEnabled) {
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
    newSocket.on("metrics-update", (data: MetricsResponse) => {
      console.log("Received real-time metrics update:", data);

      // If the data has a source, update the metrics for that source
      if (data.source) {
        if (!liveEnabled) return; // ignore live updates when history mode is active
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

        // Sort newest first to ensure UI sees fresh data immediately
        const sorted = [...payload.items].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setHistory(
          sorted.map((it) => ({
            source: it.source,
            data: it.data,
            createdAt: it.createdAt,
            updatedAt: it.updatedAt,
          }))
        );
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

  // Subscribe to metrics for a given source
  const subscribeToSource = (source: string) => {
    if (socket && isConnected) {
      console.log(`Subscribing to metrics for source: ${source}`);
      socket.emit("metrics:subscribe", { source });
    }
  };

  // Unsubscribe from metrics for a given source
  const unsubscribeFromSource = (source: string) => {
    if (socket && isConnected) {
      console.log(`Unsubscribing from metrics for source: ${source}`);
      socket.emit("metrics:unsubscribe", { source });
    }
  };

  // Get the initial data for a given source
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

  // Get historical data for a time window
  const getHistory = (params: {
    source?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    if (socket && isConnected) {
      console.log("Requesting history with params:", params);
      socket.emit("metrics:getHistory", params || {});
    } else {
      console.warn("Cannot request history: socket not connected", {
        socketExists: !!socket,
        isConnected,
      });
    }
  };

  const disableLive = () => setLiveEnabled(false);
  const enableLive = () => setLiveEnabled(true);

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
