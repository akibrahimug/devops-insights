"use client";

/**
 * Component: InfrastructureSection
 * I present either live infrastructure KPIs (latest mode) or charts and
 * service health (history mode) for a region. I compose metric mini-cards,
 * line charts, and service status cards.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricChart } from "@/components/charts/MetricChart";
import { CompactHistoryCard } from "@/components/region/CompactHistoryCard";
import { ServicesCard } from "@/components/region/ServicesCard";
import { ServerStats } from "@/components/dashboard/ServerStats";
import { Cpu, ArrowsClockwise, WifiHigh } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCompactNumber,
  formatTimeLabelForRange,
  RangeKey,
} from "@/lib/helpers/utils";
import { SeriesPoint } from "@/components/dashboard/ServerStats";

interface InfrastructureSectionProps {
  mode: "latest" | "history";
  range: RangeKey;
  waitSeries: SeriesPoint[];
  activeConnectionsSeries: SeriesPoint[];
  cpuLoadSeries: SeriesPoint[];
  regionData: {
    activeConnections: number;
    cpus: number;
    waitTime: number;
    cpuLoad: number;
    timers: number;
    services: {
      database: boolean;
      redis: boolean;
    };
  };
  isLoading?: boolean;
}

export function InfrastructureSection({
  mode,
  range,
  waitSeries,
  activeConnectionsSeries,
  cpuLoadSeries,
  regionData,
  isLoading = false,
}: InfrastructureSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {mode === "latest" && (
        <Card className="col-span-full border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur mb-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Cpu className="h-6 w-6" />
              <span>Server stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ServerStats
                className="h-full"
                isLoading={isLoading}
                metrics={[
                  {
                    key: "active-connections",
                    label: "Active Connections",
                    icon: (props: { className?: string }) => (
                      <WifiHigh className={props.className} />
                    ),
                    series: activeConnectionsSeries as any,
                    display:
                      activeConnectionsSeries.length > 0
                        ? formatCompactNumber(
                            activeConnectionsSeries.at(-1)!.value
                          )
                        : formatCompactNumber(regionData.activeConnections),
                    caption: "Current vs 90th percentile",
                  } as any,
                  {
                    key: "cpus",
                    label: "CPU Cores",
                    icon: (props: { className?: string }) => (
                      <Cpu className={props.className} />
                    ),
                    percent: 0,
                    display: `${regionData.cpus} cores`,
                    caption: "Available CPU cores",
                  } as any,
                  {
                    key: "wait",
                    label: "Wait Time",
                    icon: (props: { className?: string }) => (
                      <ArrowsClockwise className={props.className} />
                    ),
                    series: waitSeries as any,
                    display: `${regionData.waitTime} ms`,
                    caption: "Current vs 90th percentile",
                  } as any,
                ]}
              />
              <ServerStats
                className="h-full"
                isLoading={isLoading}
                metrics={[
                  {
                    key: "cpu-load",
                    label: "CPU Load",
                    icon: (props: { className?: string }) => (
                      <Cpu className={props.className} />
                    ),
                    percent: regionData.cpuLoad || 0,
                    display: `${regionData.cpuLoad}%`,
                    caption: "CPU utilization",
                  } as any,
                  {
                    key: "timers",
                    label: "Active Timers",
                    icon: (props: { className?: string }) => (
                      <ArrowsClockwise className={props.className} />
                    ),
                    percent: 0,
                    display: formatCompactNumber(regionData.timers),
                    caption: "Currently active",
                  } as any,
                ]}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "history" ? (
        <Card className="border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <ArrowsClockwise className="h-7 w-7 text-blue-600" />
              <span>Wait Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || waitSeries.length === 0 ? (
              <Skeleton className="w-full h-[220px] rounded-md" />
            ) : (
              <MetricChart
                type="line"
                height={220}
                data={{
                  labels: waitSeries.map((p) =>
                    formatTimeLabelForRange(p.bucketStart, range)
                  ),
                  datasets: [
                    {
                      label: "Wait Time",
                      data: waitSeries.map((p) => p.value),
                      borderColor: "rgb(59, 130, 246)",
                      borderWidth: 2,
                      backgroundColor: "rgba(0,0,0,0)",
                      tension: 0.35,
                      fill: false,
                      pointRadius: (ctx: any) =>
                        ctx.dataIndex % 4 === 0 ? 3 : 0,
                      pointHoverRadius: (ctx: any) =>
                        ctx.dataIndex % 4 === 0 ? 4 : 0,
                      pointBackgroundColor: "rgb(59, 130, 246)",
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
                      ticks: {
                        font: { size: 10 },
                        maxTicksLimit: 6,
                        autoSkip: true,
                        autoSkipPadding: 20,
                      },
                    },
                    y: {
                      grid: { display: false },
                      border: { display: false },
                      ticks: {
                        font: { size: 10 },
                        maxTicksLimit: 5,
                        autoSkip: true,
                      },
                    },
                  },
                }}
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {mode === "history" && (
        <div className="flex flex-col gap-4 justify-end min-h-[260px]">
          <CompactHistoryCard
            className="border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur hover-lift"
            title="CPU Load"
            color="rgb(99, 102, 241)"
            range={range}
            height={110}
            series={cpuLoadSeries}
            isLoading={isLoading}
            icon={(props) => (
              <Cpu className="h-6 w-6 text-indigo-600" {...props} />
            )}
          />

          <ServicesCard
            className="border-0 shadow dark:bg-gray-800/50 backdrop-blur hover-lift self-end w-full"
            databaseUp={regionData.services.database}
            redisUp={regionData.services.redis}
          />
        </div>
      )}
    </div>
  );
}
