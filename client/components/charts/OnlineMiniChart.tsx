"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricChart } from "@/components/charts/MetricChart";
import { useMemo } from "react";

type RegionInput = {
  displayName: string;
  results?: { stats?: { online?: number } };
};

export function OnlineMiniChart({
  regions,
  height = 65,
}: {
  regions: RegionInput[];
  height?: number;
}) {
  const labels = useMemo(() => regions.map((r) => r.displayName), [regions]);
  const values = useMemo(
    () => regions.map((r) => (r.results?.stats?.online as number) || 0),
    [regions]
  );
  const max = useMemo(
    () => (values.length ? Math.max(...values) : 0),
    [values]
  );
  const gradientColor = (ctx: any) => {
    const { chart } = ctx;
    const { ctx: c, chartArea } = chart || {};
    if (!chartArea) return "rgb(34, 197, 94)";
    const grad = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    grad.addColorStop(0, "rgba(239, 68, 68, 1)"); // red
    grad.addColorStop(0.5, "rgba(245, 158, 11, 1)"); // amber
    grad.addColorStop(1, "rgba(34, 197, 94, 1)"); // green
    return grad;
  };

  return (
    <Card className="hidden md:block border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur">
      <CardHeader className="py-2">
        <CardTitle className="text-sm">Online by Region</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-stretch gap-3">
          <div className="flex flex-col justify-between text-[10px] text-gray-500 dark:text-gray-400 w-8 shrink-0">
            <span>{max}</span>
            <span>{Math.round(max / 2)}</span>
            <span>0</span>
          </div>
          <div className="flex-1">
            <MetricChart
              type="line"
              data={{
                labels,
                datasets: [
                  {
                    label: "Online",
                    data: values,
                    borderColor: (c: any) => gradientColor(c),
                    backgroundColor: "rgba(0,0,0,0)",
                    fill: false,
                    tension: 0.5,
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
