"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCompactNumber } from "@/lib/helpers/utils";

export type SeriesPoint = { bucketStart: string; value: number };

interface HistoryResourceStatsProps {
  activeConnectionsSeries: SeriesPoint[];
  waitSeries: SeriesPoint[];
  cpus: number;
  // Fallbacks for latest mode rendering (optional)
  activeConnectionsFallback?: number;
  waitMsFallback?: number;
  className?: string;
}

function average(series: SeriesPoint[]): number {
  if (!series?.length) return 0;
  const sum = series.reduce((acc, p) => acc + (Number(p.value) || 0), 0);
  return sum / series.length;
}

function max(series: SeriesPoint[]): number {
  return series.reduce(
    (m, p) => (Number(p.value) > m ? Number(p.value) : m),
    0
  );
}

export function HistoryResourceStats({
  activeConnectionsSeries,
  waitSeries,
  cpus,
  activeConnectionsFallback,
  waitMsFallback,
  className = "",
}: HistoryResourceStatsProps) {
  const hasActiveSeries = activeConnectionsSeries?.length > 0;
  const activeConnLatest = hasActiveSeries
    ? activeConnectionsSeries.at(-1)!.value
    : Number(activeConnectionsFallback) || 0;
  const activeConnMax = hasActiveSeries
    ? max(activeConnectionsSeries)
    : activeConnLatest;
  const activeConnPct =
    activeConnMax > 0
      ? Math.min(100, Math.round((activeConnLatest / activeConnMax) * 100))
      : 0;

  const hasWaitSeries = waitSeries?.length > 0;
  const waitLatest = hasWaitSeries
    ? waitSeries.at(-1)!.value
    : Number(waitMsFallback) || 0;
  const waitMax = hasWaitSeries ? max(waitSeries) : waitLatest;
  const waitPct =
    waitMax > 0 ? Math.min(100, Math.round((waitLatest / waitMax) * 100)) : 0;

  return (
    <Card
      className={`border-0 shadow dark:bg-gray-800/50 backdrop-blur h-full ${className}`}
    >
      <CardContent className="space-y-2 h-full flex flex-col justify-start">
        {/* Active Connections */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Active Connections</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatCompactNumber(activeConnLatest)}
            </span>
          </div>
          <Progress
            value={activeConnPct}
            className="h-2 bg-gray-200 dark:bg-gray-800"
          />
        </div>

        {/* CPUs */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>CPUs</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {cpus}
            </span>
          </div>
          <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* Wait Time */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Wait Time</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatCompactNumber(waitLatest)}
            </span>
          </div>
          <Progress
            value={waitPct}
            className="h-2 bg-gray-200 dark:bg-gray-800"
          />
        </div>
      </CardContent>
    </Card>
  );
}
