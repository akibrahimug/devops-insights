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
  count?: number;
}

export interface WebSocketState {
  socket: Socket | null;
  isConnected: boolean;
  metrics: Record<string, MetricData>;
  lastUpdate: Date | null;
  error: string | null;
  subscribeToSource: (source: string) => void;
  unsubscribeFromSource: (source: string) => void;
  getInitialData: (source?: string) => void;
}

const WebSocketContext = createContext<WebSocketState | null>(null);

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, MetricData>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected from backend:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setError(`Connection failed: ${err.message}`);
      setIsConnected(false);
    });

    // Metrics event handlers
    newSocket.on("metrics:data", (data: MetricsResponse) => {
      console.log("Received metrics data:", data);

      if (data.source) {
        // Single source data
        setMetrics((prev) => ({
          ...prev,
          [data.source!]: data.data as MetricData,
        }));
      } else {
        // All sources data
        setMetrics(data.data as Record<string, MetricData>);
      }

      setLastUpdate(new Date());
      setError(null);
    });

    newSocket.on("metrics:error", (err: { message: string }) => {
      console.error("Metrics error:", err);
      setError(err.message);
    });

    // Real-time metrics updates
    newSocket.on("metrics-update", (data: MetricsResponse) => {
      console.log("Received real-time metrics update:", data);

      if (data.source) {
        setMetrics((prev) => ({
          ...prev,
          [data.source!]: data.data as MetricData,
        }));
        setLastUpdate(new Date());
      }
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const subscribeToSource = (source: string) => {
    if (socket && isConnected) {
      console.log(`Subscribing to metrics for source: ${source}`);
      socket.emit("metrics:subscribe", { source });
    }
  };

  const unsubscribeFromSource = (source: string) => {
    if (socket && isConnected) {
      console.log(`Unsubscribing from metrics for source: ${source}`);
      socket.emit("metrics:unsubscribe", { source });
    }
  };

  const getInitialData = (source?: string) => {
    if (socket && isConnected) {
      console.log(
        `Requesting initial data${
          source ? ` for source: ${source}` : " for all sources"
        }`
      );
      socket.emit("metrics:get", source ? { source } : {});
    }
  };

  const value: WebSocketState = {
    socket,
    isConnected,
    metrics,
    lastUpdate,
    error,
    subscribeToSource,
    unsubscribeFromSource,
    getInitialData,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
