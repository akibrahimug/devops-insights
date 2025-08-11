"use client";

/**
 * Page: TestWebSocket
 * Simple test page to verify WebSocket connectivity and payloads.
 */

import { useWebSocket } from "@/app/contexts/WebSocketContext";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TestWebSocket() {
  const { isConnected, error, socket, getInitialData, metrics } =
    useWebSocket();

  useEffect(() => {
    console.log("WebSocket Test Page - Current state:", {
      isConnected,
      error,
      socketExists: !!socket,
      backendUrl:
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
    });
  }, [isConnected, error, socket]);

  const testConnection = () => {
    console.log("Testing connection...");
    if (isConnected) {
      console.log("Requesting initial data...");
      getInitialData();
    } else {
      console.log("Not connected yet");
    }
  };

  return (
    <div className="container mx-auto p-0 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Backend URL:</strong>{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}
            </code>
          </div>

          <div>
            <strong>Connection Status:</strong>{" "}
            <span className={isConnected ? "text-green-600" : "text-red-600"}>
              {isConnected ? "Connected ✅" : "Disconnected ❌"}
            </span>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div>
            <strong>Socket Object:</strong>{" "}
            {socket ? "Present" : "Not initialized"}
          </div>

          <div>
            <strong>Metrics Data:</strong>
            <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2 overflow-auto">
              {JSON.stringify(metrics, null, 2)}
            </pre>
          </div>

          <Button onClick={testConnection} disabled={!isConnected}>
            Test Get Initial Data
          </Button>

          <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            Check the browser console for detailed connection logs.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
