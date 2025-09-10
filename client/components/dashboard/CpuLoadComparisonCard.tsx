"use client";

/**
 * Component: CpuLoadComparisonCard
 * Compares a selected region's CPU load against the global average.
 */

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricChart } from "@/components/charts/MetricChart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RegionLike = {
  displayName: string;
  results?: {
    stats?: {
      server?: {
        cpu_load?: number;
      };
    };
  };
};

export function CpuLoadComparisonCard({ regions }: { regions: RegionLike[] }) {
  const ordered = useMemo(
    () =>
      [...regions].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [regions]
  );
  const [selected, setSelected] = useState<string>(
    ordered[0]?.displayName || ""
  );

  const cpuByRegion = useMemo(
    () =>
      ordered.map((r) => ({
        name: r.displayName,
        cpu: r.results?.stats?.server?.cpu_load ?? 0,
      })),
    [ordered]
  );

  // Global average across all regions (does not change with selection)
  const avgAll = useMemo(() => {
    if (cpuByRegion.length === 0) return 0;
    const total = cpuByRegion.reduce((sum, r) => sum + (r.cpu || 0), 0);
    return total / cpuByRegion.length;
  }, [cpuByRegion]);

  // Selected region cpu (changes with dropdown)
  const selectedCpu = useMemo(() => {
    const current =
      cpuByRegion.find((r) => r.name === selected) || cpuByRegion[0];
    return current?.cpu || 0;
  }, [cpuByRegion, selected]);

  // Theme-aligned gradient (vertical): light violet -> purple-light -> theme purple
  const gradientColor = (ctx: any, opacity = 1) => {
    const { chart } = ctx;
    const { ctx: c, chartArea } = chart || {};
    if (!chartArea) return `rgba(124,58,237,${opacity})`;
    const grad = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    grad.addColorStop(0, `rgba(233, 213, 255, ${opacity})`); // violet-200
    grad.addColorStop(0.5, `rgba(168, 85, 247, ${opacity})`); // purple-500
    grad.addColorStop(1, `rgba(124, 58, 237, ${opacity})`); // theme purple
    return grad;
  };

  return (
    <Card className="animate-scale-in border-0 shadow dark:bg-gray-800/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-gray-900 dark:text-white">
              CPU Load Comparison
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Compare a region's CPU load vs the average of other regions
            </CardDescription>
          </div>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              {cpuByRegion.map((r) => (
                <SelectItem key={r.name} value={r.name}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <MetricChart
          type="bar"
          data={{
            labels: [""],
            datasets: [
              {
                label: "Average",
                data: [avgAll],
                backgroundColor: (c: any) => gradientColor(c, 0.3),
                borderColor: (c: any) => gradientColor(c, 0.45),
                borderWidth: 1,
                borderRadius: 12,
                barPercentage: 0.7,
                categoryPercentage: 0.6,
              },
              {
                label: "Selected region",
                data: [selectedCpu],
                backgroundColor: (c: any) => gradientColor(c, 0.85),
                borderColor: (c: any) => gradientColor(c, 1),
                borderWidth: 1,
                borderRadius: 12,
                barPercentage: 0.4,
                categoryPercentage: 0.6,
              },
            ],
          }}
          options={{
            plugins: { legend: { display: false } },
            indexAxis: "y" as const,
            scales: {
              x: {
                beginAtZero: true,
                grid: { display: false },
                border: { display: false },
                ticks: { color: "#9ca3af" },
              },
              y: {
                grid: { display: false },
                ticks: { display: false },
                border: { display: true, color: "rgba(124, 58, 237, 0.35)" },
              },
            },
          }}
          height={220}
        />
      </CardContent>
    </Card>
  );
}
