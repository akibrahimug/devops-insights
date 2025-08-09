"use client";

import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  registerables,
  ChartOptions,
  ChartType,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { formatCompactNumber } from "@/lib/helpers/utils";
import annotationPlugin from "chartjs-plugin-annotation";

// Register all default Chart.js components/controllers (fixes 'line is not a registered controller' in prod)
ChartJS.register(...registerables, annotationPlugin);

interface MetricChartProps {
  type: ChartType;
  data: any;
  options?: ChartOptions;
  title?: string;
  height?: number;
}

export function MetricChart({
  type,
  data,
  options = {},
  title,
  height = 300,
}: MetricChartProps) {
  const { theme } = useTheme();
  const chartRef = useRef<ChartJS>(null);

  // Create theme-aware default options
  const getThemedOptions = (): ChartOptions => {
    const isDark = theme === "dark";
    const textColor = isDark ? "#e5e7eb" : "#374151";
    const gridColor = isDark ? "#374151" : "#e5e7eb";

    const isLine = type === "line";
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: {
              family: "Inter, sans-serif",
            },
          },
          display: false,
        },
        title: {
          display: !!title,
          text: title,
          color: textColor,
          font: {
            size: 16,
            family: "Inter, sans-serif",
            weight: 600 as const,
          },
        },
        tooltip: {
          backgroundColor: isDark ? "#1f2937" : "#ffffff",
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: gridColor,
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const raw = context.parsed?.y;
              const value = typeof raw === "number" ? raw : Number(raw || 0);
              const label = context.dataset?.label || "";
              const formatted = formatCompactNumber(value);
              return label ? `${label}: ${formatted}` : formatted;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: isLine
            ? { display: false }
            : {
                color: textColor,
              },
          grid: {
            color: gridColor,
          },
          border: {
            color: gridColor,
          },
        },
        y: {
          ticks: isLine
            ? { display: false }
            : {
                color: textColor,
                callback: (val: any) =>
                  formatCompactNumber(
                    typeof val === "number" ? val : Number(val || 0)
                  ),
              },
          grid: {
            color: gridColor,
          },
          border: {
            color: gridColor,
          },
        },
      },
      ...options,
    };
  };

  // Update chart when theme changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.options = getThemedOptions();
      chartRef.current.update();
    }
  }, [theme]);

  return (
    <div style={{ height: `${height}px` }}>
      <Chart
        ref={chartRef}
        type={type}
        data={data}
        options={getThemedOptions()}
      />
    </div>
  );
}
