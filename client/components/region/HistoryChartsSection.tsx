"use client";

/**
 * Component: HistoryChartsSection
 * Two side-by-side history charts (Timers and Online Users) for the region view.
 */

import { MetricChart } from "@/components/charts/MetricChart";
import { ArrowsClockwise, WifiHigh } from "@phosphor-icons/react";
import {
  formatTimeLabelForRange,
  formatCompactNumber,
  RangeKey,
} from "@/lib/helpers/utils";
import { SeriesPoint } from "@/components/dashboard/ServerStats";

interface HistoryChartsSectionProps {
  range: RangeKey;
  timersSeries: SeriesPoint[];
  onlineSeries: SeriesPoint[];
}

export function HistoryChartsSection({
  range,
  timersSeries,
  onlineSeries,
}: HistoryChartsSectionProps) {
  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-md shadow-lg dark:bg-gray-800/50 backdrop-blur">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white mb-2 font-bold">
            <ArrowsClockwise className="h-7 w-7 text-purple-600" />
            <span className="text-sm">Timers</span>
          </div>
          <MetricChart
            type="line"
            height={260}
            data={{
              labels: timersSeries.map((p) =>
                formatTimeLabelForRange(p.bucketStart, range)
              ),
              datasets: [
                {
                  label: "Timers",
                  data: timersSeries.map((p) => p.value),
                  borderColor: "rgb(147, 51, 234)",
                  borderWidth: 2,
                  backgroundColor: "rgba(0,0,0,0)",
                  tension: 0.35,
                  fill: false,
                  pointRadius: (ctx: any) => (ctx.dataIndex % 4 === 0 ? 3 : 0),
                  pointHoverRadius: (ctx: any) =>
                    ctx.dataIndex % 4 === 0 ? 4 : 0,
                  pointBackgroundColor: "rgb(147, 51, 234)",
                  pointBorderColor: "#ffffff",
                  pointBorderWidth: 1,
                },
              ],
            }}
            options={{
              plugins: { legend: { display: false } },
              scales: {
                x: {
                  grid: { display: false },
                  border: { display: false },
                  offset: true,
                  ticks: {
                    maxTicksLimit: 6,
                    autoSkip: true,
                    autoSkipPadding: 16,
                    maxRotation: 0,
                    minRotation: 0,
                  },
                },
                y: {
                  grid: { display: false },
                  border: { display: false },
                  beginAtZero: true,
                  min: 0,
                  ticks: {
                    maxTicksLimit: 5,
                    autoSkip: true,
                    padding: 6,
                    callback: (val: any) =>
                      formatCompactNumber(
                        typeof val === "number" ? val : Number(val || 0)
                      ),
                  },
                },
              },
            }}
          />
        </div>
        <div className="p-5 rounded-md shadow-lg dark:bg-gray-800/50 backdrop-blur">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white mb-2 font-bold">
            <WifiHigh className="h-7 w-7 text-green-600" />
            <span className="text-sm">Online Users</span>
          </div>
          <MetricChart
            type="line"
            height={260}
            data={{
              labels: onlineSeries.map((p) =>
                formatTimeLabelForRange(p.bucketStart, range)
              ),
              datasets: [
                {
                  label: "Online Users",
                  data: onlineSeries.map((p) => p.value),
                  borderColor: "rgb(34, 197, 94)",
                  borderWidth: 2,
                  backgroundColor: "rgba(0,0,0,0)",
                  tension: 0.35,
                  fill: false,
                  pointRadius: (ctx: any) => (ctx.dataIndex % 4 === 0 ? 3 : 0),
                  pointHoverRadius: (ctx: any) =>
                    ctx.dataIndex % 4 === 0 ? 4 : 0,
                  pointBackgroundColor: "rgb(34, 197, 94)",
                  pointBorderColor: "#ffffff",
                  pointBorderWidth: 1,
                },
              ],
            }}
            options={{
              plugins: { legend: { display: false } },
              scales: {
                x: {
                  grid: { display: false },
                  border: { display: false },
                  offset: true,
                  ticks: {
                    maxTicksLimit: 6,
                    autoSkip: true,
                    autoSkipPadding: 16,
                    maxRotation: 0,
                    minRotation: 0,
                  },
                },
                y: {
                  grid: { display: false },
                  border: { display: false },
                  beginAtZero: true,
                  min: 0,
                  ticks: {
                    maxTicksLimit: 5,
                    autoSkip: true,
                    padding: 6,
                    callback: (val: any) =>
                      formatCompactNumber(
                        typeof val === "number" ? val : Number(val || 0)
                      ),
                  },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
