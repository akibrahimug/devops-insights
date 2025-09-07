"use client";

/**
 * Component: RegionStatusSection
 * I render the top portion of the region page, combining current status with
 * either service health or a compact history card depending on the mode.
 */

import { RegionStatusCard } from "@/components/region/RegionStatusCard";
import { ServicesCard } from "@/components/region/ServicesCard";
import { CompactHistoryCard } from "@/components/region/CompactHistoryCard";
import {
  getServerHealthStatus,
  formatCompactNumber,
  RangeKey,
} from "@/lib/helpers/utils";
import { SeriesPoint } from "@/components/dashboard/ServerStats";
import { WifiHigh, WarningCircle } from "@phosphor-icons/react";

interface RegionStatusSectionProps {
  mode: "latest" | "history";
  health: ReturnType<typeof getServerHealthStatus>;
  serverStatus: string;
  sessionCount: number;
  version: string;
  databaseUp: boolean;
  redisUp: boolean;
  range: RangeKey;
  activeConnectionsSeries: SeriesPoint[];
  errorDetails?: {
    error: string;
    httpStatus?: number;
    errorCode?: string;
    timestamp?: string;
  };
}

export function RegionStatusSection({
  mode,
  health,
  serverStatus,
  sessionCount,
  version,
  databaseUp,
  redisUp,
  range,
  activeConnectionsSeries,
  errorDetails,
}: RegionStatusSectionProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <RegionStatusCard
        className={`mb-6 ${
          mode === "history"
            ? "bg-indigo-50 dark:bg-indigo-900/20 md:w-1/2"
            : "dark:bg-gray-800/50 md:w-2/3"
        } border-0 shadow backdrop-blur hover-lift`}
        health={health}
        serverStatus={serverStatus}
        sessionCount={Number(formatCompactNumber(sessionCount)) as any}
        version={version as string}
        errorDetails={errorDetails}
        footer={
          mode === "history" ? (
            <div className="rounded-md border border-amber-300/60 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60 px-3 py-2 text-xs md:text-sm font-medium shadow-sm inline-flex items-center gap-2">
              <WarningCircle className="h-9 w-9 " />
              <span>
                Only this card shows live data in history mode. Other sections
                display historical data for the selected range.
              </span>
            </div>
          ) : undefined
        }
      />

      {mode === "history" ? (
        <CompactHistoryCard
          className="mb-6 border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur hover-lift md:w-1/2"
          title="Active Connections"
          color="rgb(14, 165, 233)"
          range={range}
          height={140}
          series={activeConnectionsSeries}
          icon={(props) => (
            <WifiHigh className="h-6 w-6 text-cyan-600" {...props} />
          )}
        />
      ) : (
        <ServicesCard
          className="mb-6 border-0 shadow dark:bg-gray-800/50 backdrop-blur hover-lift md:w-1/3"
          databaseUp={databaseUp}
          redisUp={redisUp}
        />
      )}
    </div>
  );
}
