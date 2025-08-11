"use client";

/**
 * Component: TimersMiniChart
 * I render a compact line chart showing active timers per region.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricChart } from "@/components/charts/MetricChart";
import { useMemo } from "react";
import { formatCompactNumber } from "@/lib/helpers/utils";

type RegionInput = {
  displayName: string;
  results?: { stats?: { server?: { timers?: number } } };
};

export function TimersMiniChart({
  regions,
  height = 170,
}: {
  regions: RegionInput[];
  height?: number;
}) {
  const labels = useMemo(() => regions.map((r) => r.displayName), [regions]);
  const values = useMemo(
    () => regions.map((r) => (r.results?.stats?.server?.timers as number) || 0),
    [regions]
  );
  const max = useMemo(
    () => (values.length ? Math.max(...values) : 0),
    [values]
  );

  return (
    <Card className="border-0 shadow dark:bg-gray-800/50 backdrop-blur">
      <CardHeader>
        <CardTitle>Timers by Region</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-stretch gap-3">
          <div className="flex flex-col justify-between text-[10px] text-gray-500 dark:text-gray-400 w-8 shrink-0">
            <span>{formatCompactNumber(max)}</span>
            <span>{formatCompactNumber(Math.round(max / 2))}</span>
            <span>0</span>
          </div>
          <div className="flex-1">
            <MetricChart
              type="line"
              data={{
                labels,
                datasets: [
                  {
                    label: "Timers",
                    data: values,
                    borderColor: "rgb(124, 58, 237)",
                    borderWidth: 2,
                    backgroundColor: "rgba(0,0,0,0)",
                    fill: false,
                    tension: 0.6,
                    pointRadius: (ctx: any) =>
                      ctx.dataIndex % 4 === 0 ? 3 : 0,
                    pointHoverRadius: (ctx: any) =>
                      ctx.dataIndex % 4 === 0 ? 4 : 0,
                    pointBackgroundColor: "rgb(124, 58, 237)",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 1,
                    cubicInterpolationMode: "monotone",
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { display: false },
                  },
                  y: {
                    display: false,
                    grid: { display: false },
                    border: { display: false },
                  },
                },
              }}
              height={height}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
