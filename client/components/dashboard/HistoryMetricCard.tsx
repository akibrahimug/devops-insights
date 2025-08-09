"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricChart } from "@/components/charts/MetricChart";
import { ReactNode } from "react";

type IconType = (props: { className?: string }) => ReactNode;

interface HistoryMetricCardProps {
  title: string;
  icon: IconType;
  labels: string[];
  values: number[];
  color: string; // CSS color string: e.g. "rgb(147, 51, 234)"
  height?: number;
  className?: string;
}

export function HistoryMetricCard({
  title,
  icon: Icon,
  labels,
  values,
  color,
  height = 260,
  className = "border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur hover-lift",
}: HistoryMetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MetricChart
          type="line"
          height={height}
          data={{
            labels,
            datasets: [
              {
                label: title,
                data: values,
                borderColor: color,
                backgroundColor: "rgba(0,0,0,0)",
                tension: 0.35,
                fill: false,
              },
            ],
          }}
          options={{
            plugins: { legend: { display: false } },
            scales: {
              x: {
                grid: { display: false },
                border: { display: false },
              },
              y: {
                grid: { display: false },
                border: { display: false },
              },
            },
          }}
        />
      </CardContent>
    </Card>
  );
}
