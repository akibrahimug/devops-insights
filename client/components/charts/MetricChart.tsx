"use client";

import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartType,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { useTheme } from "next-themes";
import annotationPlugin from "chartjs-plugin-annotation";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

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
    const backgroundColor = isDark ? "#111827" : "#ffffff";

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
        },
      },
      scales: {
        x: {
          ticks: {
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
          ticks: {
            color: textColor,
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
