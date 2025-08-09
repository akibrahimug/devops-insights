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
  const sorted = [...regions].sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );
  const values = sorted.map((r) => r.results?.stats?.server?.cpus || 0);

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
    <Card className="animate-scale-in border-0 shadow dark:bg-gray-800/50 backdrop-blur">
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
            labels: sorted.map((r) => r.displayName),
            datasets: [
              {
                label: "CPU Cores",
                data: values,
                borderColor: (c: any) => gradientColor(c, 0.95),
                backgroundColor: (c: any) => gradientColor(c, 0.12),
                fill: true,
                tension: 0.5,
                pointRadius: 2,
                pointHoverRadius: 4,
              },
            ],
          }}
          options={{
            plugins: { legend: { display: false } },
            scales: {
              x: {
                grid: { display: false },
                border: { display: false },
                ticks: { display: false },
              },
              y: {
                beginAtZero: true,
                grid: { display: false },
                border: { display: false },
                ticks: {
                  maxTicksLimit: 3,
                  color: "#9ca3af",
                  font: { size: 10 },
                },
              },
            },
          }}
          height={300}
        />
      </CardContent>
    </Card>
  );
}
