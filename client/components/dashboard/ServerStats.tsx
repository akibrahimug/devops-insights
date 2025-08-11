"use client";

/**
 * Component: ServerStats
 * I render a compact list of server KPI rows with icons, primary value, and an
 * optional caption. I am used as a building block for the region infrastructure.
 */

import { Card, CardContent } from "@/components/ui/card";

export type SeriesPoint = { bucketStart: string; value: number };

type MetricSpec = {
  key: string;
  label: string;
  icon?: (props: { className?: string }) => React.ReactNode;
  // Display value at the right side
  display: string | number;
  // Optional caption under the bar (e.g., max value)
  caption?: string;
  // Optional color for the value text
  color?: "default" | "green" | "yellow" | "red" | "blue";
};

interface ServerStatsProps {
  metrics: MetricSpec[];
  className?: string;
  isLoading?: boolean;
}
/**
 * I derive a Tailwind color class for a metric value, defaulting to blue when unspecified.
 */
function getTextColor(metric: MetricSpec): string {
  const colorMap = {
    default: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
  } as const;
  if (metric.color && colorMap[metric.color]) return colorMap[metric.color];
  return colorMap.default;
}

export function ServerStats({
  metrics,
  className = "",
  isLoading = false,
}: ServerStatsProps) {
  return (
    <Card
      className={`border-0 shadow dark:bg-gray-800/50 backdrop-blur ${className}`}
    >
      <CardContent className="space-y-5 h-full flex flex-col justify-start gap-5 pt-8">
        {metrics.map((m, index) => {
          const valueClass = `${getTextColor(
            m
          )} font-semibold text-2xl md:text-3xl ${
            isLoading ? "opacity-60" : ""
          }`;
          return (
            <div
              key={m.key}
              className={
                index > 0
                  ? "border-t border-gray-200 dark:border-gray-700 pt-3"
                  : ""
              }
            >
              <div className="flex items-end justify-between mb-1">
                <span className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  {m.icon ? m.icon({ className: "h-4 w-4" }) : null}
                  {m.label}
                </span>
                <span className={valueClass}>{m.display}</span>
              </div>
              {m.caption ? (
                <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                  {m.caption}
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
