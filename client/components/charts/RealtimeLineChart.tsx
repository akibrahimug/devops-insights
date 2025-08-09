"use client";

import { useEffect, useState } from "react";
import { MetricChart } from "./MetricChart";

interface RealtimeLineChartProps {
  data: Record<string, any>;
  dataKey: string;
  title: string;
  color?: string;
  maxDataPoints?: number;
}

export function RealtimeLineChart({
  data,
  dataKey,
  title,
  color = "rgb(59, 130, 246)",
  maxDataPoints = 20,
}: RealtimeLineChartProps) {
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: any[];
  }>({
    labels: [],
    datasets: [
      {
        label: title,
        data: [],
        borderColor: color,
        backgroundColor: color.replace("rgb", "rgba").replace(")", ", 0.1)"),
        tension: 0.1,
        fill: true,
      },
    ],
  });

  useEffect(() => {
    if (Object.keys(data).length > 0) {
      // Get current time
      const now = new Date().toLocaleTimeString();

      // Calculate aggregate value across all sources
      const values = Object.values(data);
      const aggregateValue =
        values.reduce((sum: number, item: any) => {
          return sum + (item[dataKey] || 0);
        }, 0) / values.length;

      setChartData((prev) => {
        const newLabels = [...prev.labels, now];
        const newData = [...prev.datasets[0].data, aggregateValue];

        // Keep only the last maxDataPoints
        if (newLabels.length > maxDataPoints) {
          newLabels.shift();
          newData.shift();
        }

        return {
          labels: newLabels,
          datasets: [
            {
              ...prev.datasets[0],
              data: newData,
            },
          ],
        };
      });
    }
  }, [data, dataKey, maxDataPoints]);

  const options = {
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
    animation: {
      duration: 300,
    },
  };

  return (
    <MetricChart
      type="line"
      data={chartData}
      options={options}
      title={title}
      height={250}
    />
  );
}
