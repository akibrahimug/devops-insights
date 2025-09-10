"use client";

/**
 * Component: RegionStatusCard
 * I summarize the current region status, version, and session count with a
 * small health indicator.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthStatus, formatCompactNumber, formatRelativeTime } from "@/lib/helpers/utils";
import { WarningCircle, Clock, Globe } from "@phosphor-icons/react";

function getHttpStatusMessage(status: number): string {
  const statusMessages: Record<number, string> = {
    408: "Request Timeout",
    429: "Too Many Requests (Rate Limited)", 
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return statusMessages[status] || "HTTP Error";
}

interface RegionStatusCardProps {
  health: HealthStatus;
  serverStatus: string;
  version: string;
  sessionCount: number;
  className?: string;
  footer?: React.ReactNode;
  errorDetails?: {
    error: string;
    httpStatus?: number;
    errorCode?: string;
    timestamp?: string;
  };
}

export function RegionStatusCard({
  health,
  serverStatus,
  version,
  sessionCount,
  className = "",
  footer,
  errorDetails,
}: RegionStatusCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <div
            className={`w-3 h-3 rounded-full ${health.bgColor} animate-pulse`}
          />
          Current region status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${health.textColor}`}>
              {serverStatus?.toUpperCase?.() || "-"}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Server Status
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {version}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Version
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCompactNumber(sessionCount)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Sessions
            </div>
          </div>
        </div>

        {/* Error Details Section */}
        {errorDetails && serverStatus === "error" && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/60 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <WarningCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <h4 className="font-semibold text-red-800 dark:text-red-200">
                Error Details
              </h4>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-red-800 dark:text-red-200">
                    Error Message:
                  </div>
                  <div className="text-red-700 dark:text-red-300">
                    {errorDetails.error}
                  </div>
                </div>
              </div>
              
              {errorDetails.httpStatus && (
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded bg-red-500 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                    !
                  </div>
                  <div>
                    <div className="font-medium text-red-800 dark:text-red-200">
                      HTTP Status Code:
                    </div>
                    <div className="text-red-700 dark:text-red-300">
                      {errorDetails.httpStatus} - {getHttpStatusMessage(errorDetails.httpStatus)}
                    </div>
                  </div>
                </div>
              )}
              
              {errorDetails.timestamp && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-red-800 dark:text-red-200">
                      Last Error:
                    </div>
                    <div className="text-red-700 dark:text-red-300">
                      {formatRelativeTime(errorDetails.timestamp)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 rounded">
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> CPU, memory, and connection stats below may show cached data from the last successful check.
                Services status reflects current connectivity.
              </div>
            </div>
          </div>
        )}

        {footer ? <div className="mt-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
