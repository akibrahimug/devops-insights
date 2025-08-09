"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWebSocket } from "@/app/contexts/WebSocketContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricChart } from "@/components/charts/MetricChart";
import { ActiveConnectionsCard } from "@/components/dashboard/ActiveConnectionsCard";
import { CpuCoresCard } from "@/components/dashboard/CpuCoresCard";
import { CpuLoadComparisonCard } from "@/components/dashboard/CpuLoadComparisonCard";
import {
  RegionsCardSkeleton,
  StatsGridSkeleton,
  ChartCardSkeleton,
} from "@/components/dashboard/Skeletons";
import { ThemeToggle } from "@/components/Theme/theme-toggle";
import { RegionsCard } from "@/components/dashboard/RegionsCard";
import {
  PulseIcon,
  ClockIcon,
  WarningIcon,
  TrendUpIcon,
  ArrowsClockwiseIcon,
  WifiHighIcon,
  TestTubeIcon,
  CpuIcon,
  MemoryIcon,
  HardDriveIcon,
  LightningIcon,
  UsersThreeIcon,
  PlugsIcon,
} from "@phosphor-icons/react";
import {
  formatRegionName,
  formatNumber,
  formatPercentage,
  getServerHealthStatus,
  getMetricColor,
  getChartColor,
  parseErrorRate,
  getPerformanceRating,
} from "@/lib/helpers/utils";

interface RegionData {
  serverStatus: string;
  serverIssue?: string | null;
  strictness: number;
  version: string;
  roles: string[];
  results: {
    stats: {
      online: number;
      server: {
        cpus: number;
        active_connections: number;
        wait_time: number;
        workers: Array<any>;
        cpu_load: number;
      };
      servers_count: number;
      session: number;
    };
    services: {
      redis: boolean;
      database: boolean;
    };
  };
}

interface Region extends RegionData {
  name: string;
  displayName: string;
  health: ReturnType<typeof getServerHealthStatus>;
  performance: ReturnType<typeof getPerformanceRating>;
}

export default function DevOpsDashboard() {
  const {
    metrics,
    isConnected,
    error,
    getInitialData,
    getHistory,
    latestTimestamps,
    history,
    enableLive,
    disableLive,
  } = useWebSocket();
  const [regions, setRegions] = useState<Region[]>([]);
  const [globalHistoricalData, setGlobalHistoricalData] = useState<any>({
    labels: [],
    datasets: [],
  });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"latest" | "history">("latest");
  const [activeRange, setActiveRange] = useState<
    "1m" | "30m" | "1h" | "1d" | "1w" | ""
  >("");

  // Process data into regions depending on mode (latest vs history)
  useEffect(() => {
    if (mode === "latest") {
      if (Object.keys(metrics).length === 0) return;
      const processed = Object.entries(metrics)
        .filter(
          ([_, value]: [string, any]) =>
            value && typeof value === "object" && value.status
        )
        .map(([key, value]: [string, any]) => {
          const regionData: RegionData = {
            serverStatus: value.status,
            serverIssue: value.server_issue ?? null,
            strictness: value.strict,
            version: value.version,
            roles: value.roles,
            results: value.results,
          };
          const health = getServerHealthStatus(regionData.serverStatus);
          const performance = getPerformanceRating(0, 0);
          return {
            name: key,
            displayName: formatRegionName(key),
            ...regionData,
            health,
            performance,
          };
        });
      console.log("Latest mode processed regions:", processed);
      setRegions(processed);
      setLastUpdated(new Date());
      return;
    }

    // History mode: compute per-source average cpu_load in the range and display that
    if (mode === "history" && Array.isArray(history) && history.length > 0) {
      const bySource = new Map<
        string,
        { latestAt: string; latest: any; items: any[] }
      >();
      history.forEach((it) => {
        const cur = bySource.get(it.source) || {
          latestAt: "",
          latest: null,
          items: [],
        };
        if (!cur.latestAt || new Date(it.createdAt) > new Date(cur.latestAt)) {
          cur.latestAt = it.createdAt;
          cur.latest = it.data;
        }
        cur.items.push(it);
        bySource.set(it.source, cur);
      });
      const processed = Array.from(bySource.entries()).map(([key, bucket]) => {
        // Average all the metrics charts use
        const loads = bucket.items
          .map((x) => (x.data as any)?.results?.stats?.server?.cpu_load)
          .filter((n) => typeof n === "number");
        const avgLoad = loads.length
          ? loads.reduce((a: number, b: number) => a + b, 0) / loads.length
          : 0;

        const connections = bucket.items
          .map(
            (x) => (x.data as any)?.results?.stats?.server?.active_connections
          )
          .filter((n) => typeof n === "number");
        const avgConnections = connections.length
          ? connections.reduce((a: number, b: number) => a + b, 0) /
            connections.length
          : 0;

        const cpus = bucket.items
          .map((x) => (x.data as any)?.results?.stats?.server?.cpus)
          .filter((n) => typeof n === "number");
        const avgCpus = cpus.length
          ? cpus.reduce((a: number, b: number) => a + b, 0) / cpus.length
          : 0;

        const base = bucket.latest || {};
        const results = (base as any)?.results || {};
        const stats = results?.stats || {};
        const server = stats?.server || {};
        const valueWithAvg = {
          ...(base as any),
          results: {
            ...results,
            stats: {
              ...stats,
              server: {
                ...server,
                cpu_load: avgLoad,
                active_connections: avgConnections,
                cpus: avgCpus,
              },
            },
          },
        };

        const regionData: RegionData = {
          serverStatus: (base as any)?.status,
          serverIssue: (base as any)?.server_issue ?? null,
          strictness: (base as any)?.strict,
          version: (base as any)?.version,
          roles: (base as any)?.roles,
          results: valueWithAvg.results,
        };
        const health = getServerHealthStatus(regionData.serverStatus);
        const performance = getPerformanceRating(0, 0);
        return {
          name: key,
          displayName: formatRegionName(key),
          ...regionData,
          health,
          performance,
        };
      });
      console.log("History mode processed regions:", processed);
      setRegions(processed);
      const maxCreated = Math.max(
        ...Array.from(bySource.values()).map((v) =>
          new Date(v.latestAt).getTime()
        )
      );
      if (isFinite(maxCreated)) setLastUpdated(new Date(maxCreated));
    }
  }, [metrics, history, mode]);

  // Initialize data on mount
  useEffect(() => {
    if (!isConnected) return;
    if (mode === "latest") {
      enableLive?.();
      getInitialData();
    } else {
      disableLive?.();
    }
  }, [isConnected, mode]);

  // Calculate aggregate metrics
  const totalSessions = regions.reduce((sum, region) => sum + 0, 0);
  const totalThroughput = regions.reduce((sum, region) => sum + 0, 0);
  const totalConnections = regions.reduce((sum, region) => sum + 0, 0);
  const totalRequestsPerSecond = regions.reduce((sum, region) => sum + 0, 0);

  const avgLatency =
    regions.length > 0
      ? regions.reduce((sum, region) => sum + 0, 0) / regions.length
      : 0;
  const avgErrorRate =
    regions.length > 0
      ? regions.reduce((sum, region) => sum + parseErrorRate("null"), 0) /
        regions.length
      : 0;
  const avgCpuUsage =
    regions.length > 0
      ? regions.reduce((sum, region) => sum + 0, 0) / regions.length
      : 0;
  const avgMemoryUsage =
    regions.length > 0
      ? regions.reduce((sum, region) => sum + 0, 0) / regions.length
      : 0;
  const avgDiskUsage =
    regions.length > 0
      ? regions.reduce((sum, region) => sum + 0, 0) / regions.length
      : 0;

  const handleLoadHistoryRange = (range: "1m" | "30m" | "1h" | "1d" | "1w") => {
    // Ensure we're in history mode when a range is picked
    if (mode !== "history") setMode("history");
    const now = new Date();
    const to = now.toISOString();
    const from = new Date(now);
    switch (range) {
      case "1m":
        from.setMinutes(now.getMinutes() - 1);
        break;
      case "30m":
        from.setMinutes(now.getMinutes() - 30);
        break;
      case "1h":
        from.setHours(now.getHours() - 1);
        break;
      case "1d":
        from.setDate(now.getDate() - 1);
        break;
      case "1w":
        from.setDate(now.getDate() - 7);
        break;
    }
    setActiveRange(range);
    setIsLoading(true);
    disableLive?.();
    getHistory({ from: from.toISOString(), to });
    setTimeout(() => setIsLoading(false), 800);
  };

  const handleSwitchToLatest = () => {
    setMode("latest");
    setActiveRange("");
    enableLive?.();
    getInitialData();
  };

  const handleSwitchToHistory = () => {
    setMode("history");
    disableLive?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-6 transition-all duration-500">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* top bar */}
        <header className="flex items-center justify-between animate-fade-in">
          <div className="animate-slide-in-left">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
              Global DevOps Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
              <WifiHighIcon
                size={32}
                weight="bold"
                className={isConnected ? "text-green-500" : "text-red-500"}
              />
              {isConnected ? "Connected to real-time data" : "Disconnected"}
            </p>
          </div>
          <div className="flex items-center gap-3 animate-slide-in-right">
            <ThemeToggle />
            <div className="flex items-center gap-2 border rounded-md px-1 py-1 dark:border-gray-700">
              <Button
                size="sm"
                variant={mode === "latest" ? "default" : "outline"}
                onClick={handleSwitchToLatest}
              >
                Latest
              </Button>
              <Button
                size="sm"
                variant={mode === "history" ? "default" : "outline"}
                onClick={handleSwitchToHistory}
              >
                History
              </Button>
            </div>
            {mode === "history" && (
              <div className="flex items-center gap-1">
                {(
                  [
                    { key: "30m", label: "30m" },
                    { key: "1h", label: "1h" },
                    { key: "1d", label: "1d" },
                    { key: "1w", label: "1w" },
                  ] as Array<{ key: "30m" | "1h" | "1d" | "1w"; label: string }>
                ).map((r) => (
                  <Button
                    key={r.key}
                    size="sm"
                    variant={activeRange === r.key ? "default" : "outline"}
                    onClick={() => handleLoadHistoryRange(r.key)}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            )}
            {mode === "latest" && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Latest data • {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            {mode === "history" && activeRange && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {isLoading
                  ? "Loading..."
                  : `History ${activeRange} • ${lastUpdated.toLocaleTimeString()}`}
              </div>
            )}
          </div>
        </header>

        {/* error message */}
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* regions card */}
        {regions.length > 0 ? (
          <RegionsCard regions={regions} />
        ) : (
          <RegionsCardSkeleton />
        )}

        {/* metrics card */}
        {regions.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-6">
            {[
              {
                title: "Total Sessions",
                value: totalSessions,
                icon: UsersThreeIcon,
                formatter: formatNumber,
                color: "text-purple-600",
                bgColor: "bg-purple-100 dark:bg-purple-900/20",
              },
              {
                title: "Throughput",
                value: totalThroughput,
                icon: PulseIcon,
                formatter: (v: number) => `${formatNumber(v)}/m`,
                color: "text-green-600",
                bgColor: "bg-green-100 dark:bg-green-900/20",
              },
              {
                title: "Avg Latency",
                value: avgLatency,
                icon: ClockIcon,
                formatter: (v: number) => `${v.toFixed(1)}ms`,
                color: getMetricColor(avgLatency, {
                  good: 100,
                  warning: 150,
                  critical: 200,
                }),
                bgColor: "bg-blue-100 dark:bg-blue-900/20",
              },
              {
                title: "Error Rate",
                value: avgErrorRate,
                icon: WarningIcon,
                formatter: (v: number) => formatPercentage(v),
                color: getMetricColor(avgErrorRate, {
                  good: 0.5,
                  warning: 1,
                  critical: 2,
                }),
                bgColor: "bg-red-100 dark:bg-red-900/20",
              },
            ].map((metric, index) => (
              <Card
                key={metric.title}
                className="transition-all duration-300 animate-fade-in border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur hover:shadow-xl hover:scale-105"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {metric.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <metric.icon className={`h-4 w-4 ${metric.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      metric.color === "string"
                        ? metric.color
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {typeof metric.formatter === "function"
                      ? metric.formatter(metric.value)
                      : metric.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <StatsGridSkeleton items={4} />
        )}

        {regions.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {[
              {
                title: "CPU Usage",
                value: avgCpuUsage,
                icon: CpuIcon,
                formatter: (v: number) => `${v.toFixed(0)}%`,
                color: getMetricColor(avgCpuUsage, {
                  good: 50,
                  warning: 75,
                  critical: 90,
                }),
              },
              {
                title: "Memory",
                value: avgMemoryUsage,
                icon: MemoryIcon,
                formatter: (v: number) => `${v.toFixed(0)}%`,
                color: getMetricColor(avgMemoryUsage, {
                  good: 50,
                  warning: 75,
                  critical: 90,
                }),
              },
              {
                title: "Disk Usage",
                value: avgDiskUsage,
                icon: HardDriveIcon,
                formatter: (v: number) => `${v.toFixed(0)}%`,
                color: getMetricColor(avgDiskUsage, {
                  good: 60,
                  warning: 80,
                  critical: 90,
                }),
              },
              {
                title: "RPS Total",
                value: totalRequestsPerSecond,
                icon: LightningIcon,
                formatter: formatNumber,
                color: "text-indigo-600",
              },
              {
                title: "Connections",
                value: totalConnections,
                icon: PlugsIcon,
                formatter: formatNumber,
                color: "text-cyan-600",
              },
              {
                title: "Regions",
                value: regions.length,
                icon: TrendUpIcon,
                formatter: (v: number) => v.toString(),
                color: regions.length > 0 ? "text-green-600" : "text-gray-600",
              },
            ].map((metric, index) => (
              <Card
                key={metric.title}
                className="transition-all duration-300 animate-fade-in border-0 shadow dark:bg-gray-800/50 backdrop-blur hover:shadow-lg"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {metric.title}
                    </p>
                    <metric.icon className={`h-4 w-4 ${metric.color}`} />
                  </div>
                  <p className={`text-xl font-bold ${metric.color}`}>
                    {metric.formatter(metric.value)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <StatsGridSkeleton
            items={6}
            cols="grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {regions.length > 0 ? (
            <ActiveConnectionsCard regions={regions} />
          ) : (
            <ChartCardSkeleton height={300} />
          )}
          {regions.length > 0 ? (
            <CpuCoresCard regions={regions} />
          ) : (
            <ChartCardSkeleton height={300} />
          )}
        </div>

        {/* CPU load comparison (single graph with selector) */}
        <div className="mb-6">
          {regions.length > 0 ? (
            <CpuLoadComparisonCard regions={regions} />
          ) : (
            <ChartCardSkeleton height={260} />
          )}
        </div>
      </div>
    </div>
  );
}
