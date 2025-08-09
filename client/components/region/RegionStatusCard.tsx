"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthStatus, formatCompactNumber } from "@/lib/helpers/utils";

interface RegionStatusCardProps {
  health: HealthStatus;
  serverStatus: string;
  version: string;
  sessionCount: number;
  className?: string;
}

export function RegionStatusCard({
  health,
  serverStatus,
  version,
  sessionCount,
  className = "",
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
      </CardContent>
    </Card>
  );
}
