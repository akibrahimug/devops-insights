"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCompactNumber } from "@/lib/helpers/utils";
import { WifiHigh, Cpu, ArrowsClockwise } from "@phosphor-icons/react";

export type SeriesPoint = { bucketStart: string; value: number };

type MetricSpec = {
  key: string;
  label: string;
  icon?: (props: { className?: string }) => React.ReactNode;
  // Percentage 0-100 for the bar
  valuePct: number;
  // Display value at the right side
  display: string | number;
  // Optional caption under the bar (e.g., max value)
  caption?: string;
};

interface ServerStatsProps {
  metrics: MetricSpec[];
  className?: string;
}

function max(series: SeriesPoint[]): number {
  return series.reduce(
    (m, p) => (Number(p.value) > m ? Number(p.value) : m),
    0
  );
}

export function ServerStats({ metrics, className = "" }: ServerStatsProps) {
  return (
    <Card
      className={`border-0 shadow dark:bg-gray-800/50 backdrop-blur ${className}`}
    >
      <CardContent className="space-y-4 h-full flex flex-col justify-start gap-4 pt-8">
        {metrics.map((m) => (
          <div key={m.key}>
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span className="inline-flex items-center gap-2">
                {m.icon ? m.icon({ className: "h-4 w-4" }) : null}
                {m.label}
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {m.display}
              </span>
            </div>
            <Progress
              value={m.valuePct}
              className="h-2 bg-gray-200 dark:bg-gray-800"
            />
            {m.caption ? (
              <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                {m.caption}
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
