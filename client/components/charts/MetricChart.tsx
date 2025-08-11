"use client";

/**
 * Component: MetricChart
 * I wrap Chart.js with dark-theme aware defaults and compact skeleton loading.
 * I accept an arbitrary chart type and dataset, so I can render mini line/bar charts.
 */

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
import { Skeleton } from "@/components/ui/skeleton";

// Register all default Chart.js components/controllers (fixes 'line is not a registered controller' in prod)
ChartJS.register(...registerables, annotationPlugin);

interface MetricChartProps {
  type: ChartType;
  data: any;
  options?: ChartOptions;
  title?: string;
  height?: number;
  isLoading?: boolean;
}

export function MetricChart({
  type,
  data,
  options = {},
  title,
  height = 300,
  isLoading = false,
}: MetricChartProps) {
  const { theme } = useTheme();
  const chartRef = useRef<ChartJS>(null);

  // Basic data availability check: ensure at least one dataset has non-empty data.
  const hasData = Array.isArray(data?.datasets)
    ? data.datasets.some(
        (ds: any) => Array.isArray(ds?.data) && ds.data.length > 0
      )
    : false;

  // Return theme-aware default options while preserving caller overrides. This is
  // called on render for SSR safety and again when the theme toggles.
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
              size: 11,
            },
          },
          display: false,
        },
        title: {
          display: !!title,
          text: title,
          color: textColor,
          font: {
            size: 14,
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
            ? { display: false, font: { size: 10 } }
            : {
                color: textColor,
                font: { size: 10 },
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
            ? { display: false, font: { size: 10 } }
            : {
                color: textColor,
                font: { size: 10 },
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

  // Update chart when theme changes to keep axis/tooltip colors in sync.
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.options = getThemedOptions();
      chartRef.current.update();
    }
  }, [theme]);

  if (isLoading || !hasData) {
    return (
      <div
        className="relative w-full max-w-full overflow-hidden min-w-0"
        style={{ height: `${height}px` }}
      >
        <Skeleton className="w-full h-full rounded-md" />
      </div>
    );
  }

  return (
    <div
      className="relative w-full max-w-full overflow-hidden min-w-0"
      style={{ height: `${height}px` }}
    >
      <Chart
        ref={chartRef}
        type={type}
        data={data}
        options={getThemedOptions()}
        className="!w-full !h-full block"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
