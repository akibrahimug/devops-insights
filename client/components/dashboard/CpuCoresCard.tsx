"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricChart } from "@/components/charts/MetricChart";

type RegionLike = {
  displayName: string;
  results?: {
    stats?: {
      server?: {
        cpus?: number;
      };
    };
  };
};

export function CpuCoresCard({ regions }: { regions: RegionLike[] }) {
  const values = regions.map((r) => r.results?.stats?.server?.cpus || 0);

  // Scriptable gradient (vertical): lowest value (bottom) red -> mid amber -> highest (top) green
  const gradientColor = (ctx: any, opacity = 1) => {
    const { chart } = ctx;
    const { ctx: c, chartArea } = chart || {};
    if (!chartArea) return `rgba(34,197,94,${opacity})`; // fallback
    // Vertical gradient bottom (low) → top (high)
    const grad = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    grad.addColorStop(0, `rgba(239, 68, 68, ${opacity})`); // red at lowest
    grad.addColorStop(0.5, `rgba(245, 158, 11, ${opacity})`); // amber mid
    grad.addColorStop(1, `rgba(34, 197, 94, ${opacity})`); // green at highest
    return grad;
  };

  return (
    <Card className="animate-scale-in border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">
          CPU Cores by Region
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Relative CPU cores per region
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MetricChart
          type="line"
          data={{
            labels: regions.map((r) => r.displayName),
            datasets: [
              {
                label: "CPU Cores",
                data: values,
                borderColor: (c: any) => gradientColor(c, 0.95),
                backgroundColor: (c: any) => gradientColor(c, 0.12),
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointHoverRadius: 5,
              },
            ],
          }}
          options={{
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: "rgba(148, 163, 184, 0.15)" } },
              y: {
                beginAtZero: true,
                grid: { color: "rgba(148, 163, 184, 0.15)" },
              },
            },
          }}
          height={300}
        />
      </CardContent>
    </Card>
  );
}
