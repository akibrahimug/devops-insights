"use client";

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWebSocket } from "@/app/contexts/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActiveConnectionsCard } from "@/components/dashboard/ActiveConnectionsCard";
import { WaitTimeMiniChart } from "@/components/charts/WaitTimeMiniChart";
import { TimersMiniChart } from "@/components/charts/TimersMiniChart";
import { OnlineMiniChart } from "@/components/charts/OnlineMiniChart";
import { CpuCoresCard } from "@/components/dashboard/CpuCoresCard";
import { CpuLoadComparisonCard } from "@/components/dashboard/CpuLoadComparisonCard";

import {
  RegionsCardSkeleton,
  StatsGridSkeleton,
  ChartCardSkeleton,
} from "@/components/dashboard/Skeletons";
import { ThemeToggle } from "@/components/Theme/theme-toggle";
import { RegionsCard } from "@/components/dashboard/RegionsCard";
import { MetricMiniCard } from "@/components/dashboard/MetricMiniCard";
import {
  WarningIcon,
  TrendUpIcon,
  ArrowsClockwiseIcon,
  WifiHighIcon,
  CpuIcon,
  PlugsIcon,
} from "@phosphor-icons/react";
import {
  formatRegionName,
  formatNumber,
  formatPercentage,
  getServerHealthStatus,
  getMetricColor,
} from "@/lib/helpers/utils";

interface RegionData {
  serverStatus: string;
  serverIssue?: string | null;
  strictness: boolean;
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
}

export default function DevOpsDashboard() {
  const {
    metrics,
    isConnected,
    error,
    getInitialData,
    enableLive,
    disableLive,
  } = useWebSocket();
  const [regions, setRegions] = useState<Region[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(false);

  // Process data into regions (latest only)
  useEffect(() => {
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
        return {
          name: key,
          displayName: formatRegionName(key),
          ...regionData,
          health,
        };
      });
    console.log("Latest mode processed regions:", processed);
    setRegions(processed);
    setLastUpdated(new Date());
  }, [metrics]);

  // Debug snapshot (latest only)
  useEffect(() => {
    try {
      const sourcesLatest = Object.keys(metrics || {});
      console.groupCollapsed("Dashboard data snapshot (latest)");
      console.table(sourcesLatest.map((s) => ({ source: s })));
      console.groupEnd();
    } catch {}
  }, [metrics, isConnected]);

  // Initialize / control data flow based on live toggle
  useEffect(() => {
    if (!isConnected) return;
    getInitialData();
    if (autoRefreshEnabled) enableLive?.();
    else disableLive?.();
  }, [isConnected, autoRefreshEnabled]);

  const toggleAutoRefresh = () => {
    if (!autoRefreshEnabled) {
      setAutoRefreshEnabled(true);
      enableLive?.();
      getInitialData();
      return;
    }
    setAutoRefreshEnabled(false);
    disableLive?.();
  };

  const totalConnections = useMemo(() => {
    return regions.reduce((sum, region) => {
      const v =
        (region as any)?.results?.stats?.server?.active_connections || 0;
      return sum + (typeof v === "number" ? v : 0);
    }, 0);
  }, [regions]);

  const totalCpus = useMemo(() => {
    return regions.reduce((sum, region) => {
      const v = (region as any)?.results?.stats?.server?.cpus || 0;
      return sum + (typeof v === "number" ? v : 0);
    }, 0);
  }, [regions]);

  // Chart data: wait time and timers by region (current snapshot)
  const chartLabels = useMemo(
    () => regions.map((r) => r.displayName),
    [regions]
  );
  const waitTimes = useMemo(
    () =>
      regions.map(
        (r) => ((r as any)?.results?.stats?.server?.wait_time as number) || 0
      ),
    [regions]
  );
  const timersCounts = useMemo(
    () =>
      regions.map(
        (r) => ((r as any)?.results?.stats?.server?.timers as number) || 0
      ),
    [regions]
  );

  const totalCpuLoad = useMemo(() => {
    return regions.reduce((acc: number, region: any) => {
      const v = (region as any)?.results?.stats?.server?.cpu_load || 0;
      return acc + (typeof v === "number" ? v : 0);
    }, 0);
  }, [regions]);

  // Per-region error rate cards (from serverIssue; null => 0)
  const regionErrorRates = useMemo(() => {
    const ordered = [...regions].sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );
    return ordered.map((r) => {
      const raw = (r as any)?.serverIssue ?? 0;
      const num = typeof raw === "number" ? raw : parseFloat(String(raw));
      const value = Number.isFinite(num) ? num : 0;
      return { title: r.displayName, value };
    });
  }, [regions]);

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
                className={
                  !isConnected
                    ? "text-red-500"
                    : autoRefreshEnabled
                    ? "text-green-500"
                    : "text-amber-500"
                }
                aria-label={
                  !isConnected
                    ? "Disconnected"
                    : autoRefreshEnabled
                    ? "Live streaming enabled"
                    : "Live streaming paused"
                }
              />
              {autoRefreshEnabled
                ? isConnected
                  ? "Connected to real-time data"
                  : "Disconnected"
                : null}
            </p>
          </div>
          <div className="flex items-center gap-3 animate-slide-in-right">
            <ThemeToggle />
            <div className="flex items-center gap-2 border rounded-md px-1 py-1 dark:border-gray-700">
              {/* Latest tab (indicator only) */}
              <Tabs value="latest">
                <TabsList className="bg-transparent p-0 gap-1">
                  <TabsTrigger
                    value="latest"
                    className="px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    onClick={() => {
                      enableLive?.();
                      getInitialData();
                    }}
                  >
                    Latest
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {/* Refresh toggle (stream live when enabled; freeze when off) */}
              <Button
                size="icon"
                variant="ghost"
                aria-pressed={autoRefreshEnabled}
                title={
                  autoRefreshEnabled ? "Auto-refresh: on" : "Auto-refresh: off"
                }
                onClick={toggleAutoRefresh}
                className={
                  autoRefreshEnabled
                    ? "text-blue-600 hover:text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                }
              >
                <ArrowsClockwiseIcon size={18} weight="bold" />
              </Button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Latest data • {lastUpdated.toLocaleTimeString()}
            </div>
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

        {/* Per-region Error Rate cards (from serverIssue; null => 0) */}
        {regionErrorRates.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {regionErrorRates.map((item, index) => (
              <Card
                key={item.title}
                className="transition-all duration-300 animate-fade-in border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur hover:shadow-xl hover:scale-105"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Server Issues
                    </CardTitle>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.title}
                    </div>
                  </div>
                  <div
                    className={`p-2 rounded-lg bg-red-100 dark:bg-red-900/20`}
                  >
                    <WarningIcon
                      className={`h-4 w-4 ${getMetricColor(item.value, {
                        good: 0.5,
                        warning: 1,
                        critical: 2,
                      })}`}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold text-gray-900 dark:text-white`}
                  >
                    {formatPercentage(item.value)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <StatsGridSkeleton items={6} />
        )}

        {regions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Left: stacked mini-cards */}
            <div className="flex flex-col gap-3">
              <MetricMiniCard
                title="Total CPU Load"
                value={totalCpuLoad}
                icon={CpuIcon}
                color="text-purple-600"
                formatter={(v) => v.toFixed(2)}
              />
              <MetricMiniCard
                title="CPUs Total"
                value={totalCpus}
                icon={CpuIcon}
                color="text-indigo-600"
                formatter={formatNumber}
              />
              <MetricMiniCard
                title="Total Active Connections"
                value={totalConnections}
                icon={PlugsIcon}
                color="text-cyan-600"
                formatter={formatNumber}
              />
              <MetricMiniCard
                title="Regions"
                value={regions.length}
                icon={TrendUpIcon}
                color={regions.length > 0 ? "text-green-600" : "text-gray-600"}
                formatter={(v) => v.toString()}
              />
              <OnlineMiniChart regions={regions as any} />
            </div>

            {/* Right: charts */}
            <div className="flex flex-col gap-4">
              <WaitTimeMiniChart regions={regions as any} />
              <TimersMiniChart regions={regions as any} />
            </div>
          </div>
        ) : (
          <StatsGridSkeleton items={4} />
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
