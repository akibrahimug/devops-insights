"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricChart } from "@/components/charts/MetricChart";
import { getChartColor } from "@/lib/helpers/utils";

type RegionLike = {
  displayName: string;
  results?: {
    stats?: {
      server?: {
        active_connections?: number;
      };
    };
  };
};

export function ActiveConnectionsCard({ regions }: { regions: RegionLike[] }) {
  // Build data array once
  const values = regions.map(
    (r) => r.results?.stats?.server?.active_connections || 0
  );
  console.log("ActiveConnectionsCard - regions:", regions, "values:", values);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);

  // Color helpers (theme violet scale → low to high)
  const hexToRgb = (hex: string): [number, number, number] => {
    const n = hex.replace("#", "");
    const bigint = parseInt(
      n.length === 3
        ? n
            .split("")
            .map((c) => c + c)
            .join("")
        : n,
      16
    );
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  };
  const rgbToCss = (r: number, g: number, b: number, a = 1) =>
    `rgba(${r}, ${g}, ${b}, ${a})`;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const lerpRgb = (
    c1: [number, number, number],
    c2: [number, number, number],
    t: number
  ) =>
    [
      Math.round(lerp(c1[0], c2[0], t)),
      Math.round(lerp(c1[1], c2[1], t)),
      Math.round(lerp(c1[2], c2[2], t)),
    ] as [number, number, number];

  // Low → mid → high (violet-200 → violet-400 → theme purple)
  const low = hexToRgb("#e9d5ff"); // violet-200
  const mid = hexToRgb("#a78bfa"); // violet-400
  const high = hexToRgb("#7c3aed"); // theme purple-accent

  const valueToColor = (v: number) => {
    const norm = max === min ? 0 : (v - min) / (max - min);
    if (norm <= 0.5) {
      const t = norm / 0.5;
      const [r, g, b] = lerpRgb(low, mid, t);
      return rgbToCss(r, g, b, 0.9);
    }
    const t = (norm - 0.5) / 0.5;
    const [r, g, b] = lerpRgb(mid, high, t);
    return rgbToCss(r, g, b, 1);
  };

  return (
    <Card className="animate-scale-in border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">
          Active Connections by Region
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Current server active connections across all regions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MetricChart
          type="bar"
          data={{
            labels: regions.map((r) => r.displayName),
            datasets: [
              {
                label: "Active Connections",
                data: values,
                backgroundColor: values.map((v) => valueToColor(v)),
                borderColor: values.map((v) => valueToColor(v)),
                borderWidth: 1,
                borderRadius: 6,
              },
            ],
          }}
          options={{
            indexAxis: "y" as const,
            plugins: {
              legend: { display: false },
            },
            scales: {
              x: {
                beginAtZero: true,
                grid: {
                  color: "rgba(124, 58, 237, 0.12)",
                  lineWidth: 0.5,
                },
                border: { color: "rgba(124, 58, 237, 0.25)" },
              },
              y: {
                grid: { display: false },
                border: { color: "rgba(124, 58, 237, 0.25)" },
              },
            },
          }}
          height={300}
        />
      </CardContent>
    </Card>
  );
}
