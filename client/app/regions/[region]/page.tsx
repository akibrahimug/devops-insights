"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Database,
  Cpu,
  ArrowsClockwise,
  WifiHigh,
  Shield,
  Eye,
  EyeSlash,
  Key,
  CopySimple,
} from "@phosphor-icons/react";
import { useHeader } from "@/app/contexts/HeaderContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { useWebSocket } from "@/app/contexts/WebSocketContext";
import { useEffect, useState } from "react";
import {
  formatRegionName,
  formatNumber,
  getServerHealthStatus,
  formatCompactNumber,
  formatTimeLabelForRange,
  windowMsForRange,
  bucketMsForRange,
  RangeKey,
} from "@/lib/helpers/utils";
import {
  compressPerSourceByTime,
  HistoryItem,
  extractWaitTime,
  extractTimers,
  extractOnline,
  extractActiveConnections,
  extractCpuLoad,
} from "@/lib/helpers/history";
import { RegionDetailSkeleton } from "@/components/dashboard/Skeletons";
import { RegionStatusCard } from "@/components/region/RegionStatusCard";
import { ServicesCard } from "@/components/region/ServicesCard";
import { CompactHistoryCard } from "@/components/region/CompactHistoryCard";
import { WorkersCard } from "@/components/dashboard/WorkersCard";
import { MetricChart } from "@/components/charts/MetricChart";
import { ServerStats } from "@/components/dashboard/ServerStats";

interface RegionData {
  serverStatus: string;
  serverIssue?: number;
  strictness: boolean;
  version: string;
  roles: string[];
  serversCount: number;
  results: {
    version: number;
  };
  online: number;
  session: number;
  cpuLoad: number;
  waitTime: number;
  timers: number;
  cpus: number;
  activeConnections: number;
  services: {
    redis: boolean;
    database: boolean;
  };
  workers: Array<[string, any]>;
}

interface Region {
  name: string;
  displayName: string;
  data: RegionData;
  health: ReturnType<typeof getServerHealthStatus>;
}

export default function RegionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const {
    metrics,
    getHistory,
    history,
    enableLive,
    disableLive,
    isConnected,
    getInitialData,
  } = useWebSocket();
  const [region, setRegion] = useState<Region | null>(null);
  const { setHeader } = useHeader();
  const [mode, setMode] = useState<"latest" | "history">("latest");
  const [range, setRange] = useState<RangeKey>("1m");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showBlockedKeys, setShowBlockedKeys] = useState<
    Record<string, boolean>
  >({});
  const [showTopKeys, setShowTopKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (Object.keys(metrics).length > 0) {
      const regionKey = params.region as string;
      const regionData: any = (metrics as any)[regionKey] || {};

      if (regionData) {
        const workersEntries: Array<[string, any]> = Array.isArray(
          regionData?.results?.stats?.server?.workers
        )
          ? (regionData.results.stats.server.workers as Array<[string, any]>)
          : Object.entries(regionData?.results?.stats?.server?.workers || {});

        const data: RegionData = {
          serverStatus: String(regionData.status || "unknown"),
          serverIssue:
            regionData.server_issue != null
              ? Number.parseFloat(String(regionData.server_issue)) || 0
              : 0,
          strictness: Boolean(regionData.strict),
          version: String(regionData.version || "-"),
          roles: Array.isArray(regionData.roles) ? regionData.roles : [],
          serversCount:
            Number(regionData?.results?.stats?.servers_count ?? 0) || 0,
          online: Number(regionData?.results?.stats?.online ?? 0) || 0,
          session: Number(regionData?.results?.stats?.session ?? 0) || 0,
          cpuLoad:
            Number(regionData?.results?.stats?.server?.cpu_load ?? 0) || 0,
          waitTime:
            Number(regionData?.results?.stats?.server?.wait_time ?? 0) || 0,
          timers: Number(regionData?.results?.stats?.server?.timers ?? 0) || 0,
          cpus: Number(regionData?.results?.stats?.server?.cpus ?? 0) || 0,
          activeConnections:
            Number(
              regionData?.results?.stats?.server?.active_connections ?? 0
            ) || 0,
          services: {
            redis: Boolean(regionData?.results?.services?.redis),
            database: Boolean(regionData?.results?.services?.database),
          },
          workers: workersEntries,
          results: { version: regionData?.version },
        };

        const health = getServerHealthStatus(data.serverStatus);

        setRegion({
          name: regionKey,
          displayName: formatRegionName(regionKey),
          data,
          health,
        });
      }
    }
  }, [metrics, params.region]);

  // Configure shared header for region page
  useEffect(() => {
    setHeader({
      title: `${region?.displayName || "Region"} Details`,
      connected: isConnected,
      autoRefreshEnabled: mode === "latest",
      onToggleRefresh: () =>
        setMode((m) => (m === "latest" ? "history" : "latest")),
      onLatestClick: () => setMode("latest"),
      onHistoryClick: () => setMode("history"),
      showHistory: true,
      activeTab: mode,
      lastUpdated,
    });
  }, [region?.displayName, isConnected, mode, lastUpdated]);

  // History mode wiring
  useEffect(() => {
    if (!isConnected) return;
    if (mode === "history") {
      disableLive();
      const to = new Date();
      const from = new Date(to.getTime() - windowMsForRange(range));
      getHistory({
        source: params.region as string,
        from: from.toISOString(),
        to: to.toISOString(),
      });
    } else {
      enableLive();
      getInitialData(params.region as string);
    }
  }, [mode, isConnected, params.region, range]);

  // windowMsForRange and bucketMsForRange imported from utils for reuse

  const regionHistory = (history as HistoryItem[]).filter(
    (h) => h.source === (params.region as string)
  );
  const bucketMs = bucketMsForRange(range);
  const waitSeries =
    compressPerSourceByTime(regionHistory, (d) => extractWaitTime(d), bucketMs)[
      params.region as string
    ] || [];
  const timersSeries =
    compressPerSourceByTime(regionHistory, (d) => extractTimers(d), bucketMs)[
      params.region as string
    ] || [];
  const onlineSeries =
    compressPerSourceByTime(regionHistory, (d) => extractOnline(d), bucketMs)[
      params.region as string
    ] || [];
  const activeConnectionsSeries =
    compressPerSourceByTime(
      regionHistory,
      (d) => extractActiveConnections(d),
      bucketMs
    )[params.region as string] || [];

  if (!region) {
    return <RegionDetailSkeleton />;
  }

  const timepicker = [
    { label: "1w", value: "1w" },
    { label: "1d", value: "1d" },
    { label: "5h", value: "5h" },
    { label: "1h", value: "1h" },
    { label: "5m", value: "5m" },
    { label: "1m", value: "1m" },
  ];

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          {mode === "history" && (
            <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
              <TabsList className="gap-1">
                {timepicker.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* Current status + right-side card (history: connections history, latest: services) */}
        <div className="flex flex-col gap-4 md:flex-row">
          <RegionStatusCard
            className={`mb-6 ${
              mode === "history"
                ? "bg-indigo-50 dark:bg-indigo-900/20 md:w-1/2"
                : "dark:bg-gray-800/50 md:w-2/3"
            } border-0 shadow backdrop-blur hover-lift`}
            health={region.health}
            serverStatus={region.data.serverStatus}
            sessionCount={
              Number(formatCompactNumber(region.data.session)) as any
            }
            version={region.data.version as string}
          />

          {mode === "history" ? (
            <CompactHistoryCard
              className="mb-6 border-0 shadow dark:bg-gray-800/50 backdrop-blur hover-lift md:w-1/2"
              title="Active Connections"
              color="rgb(14, 165, 233)"
              range={range}
              height={140}
              series={activeConnectionsSeries}
            />
          ) : (
            <ServicesCard
              className="mb-6 border-0 shadow dark:bg-gray-800/50 backdrop-blur hover-lift md:w-1/3"
              databaseUp={region.data.services.database}
              redisUp={region.data.services.redis}
            />
          )}
        </div>

        {/* Infrastructure */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {mode === "latest" && (
            <div className="col-span-full flex items-center gap-2 text-gray-900 dark:text-white mb-1">
              <Cpu className="h-5 w-5" />
              <span>Server stats</span>
            </div>
          )}
          {mode === "history" ? (
            <Card className="border-0 shadow dark:bg-gray-800/50 backdrop-blur hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Wait Time
                </CardTitle>
              </CardHeader>
              <CardContent>
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
          ) : (
            <ServerStats
              className="h-full"
              metrics={[
                {
                  key: "active-connections",
                  label: "Active Connections",
                  valuePct:
                    (activeConnectionsSeries.length > 0
                      ? Math.round(
                          ((activeConnectionsSeries.at(-1)!.value || 0) /
                            (Math.max(
                              ...activeConnectionsSeries.map((p) => p.value),
                              1
                            ) || 1)) *
                            100
                        )
                      : 0) || 0,
                  display:
                    activeConnectionsSeries.length > 0
                      ? formatCompactNumber(
                          activeConnectionsSeries.at(-1)!.value
                        )
                      : formatCompactNumber(region.data.activeConnections),
                },
                {
                  key: "cpus",
                  label: "CPUs",
                  valuePct: Math.min(
                    100,
                    Math.round((region.data.cpus / 100) * 100)
                  ),
                  display: region.data.cpus,
                },
                {
                  key: "wait",
                  label: "Wait Time",
                  valuePct:
                    (waitSeries.length > 0
                      ? Math.round(
                          ((waitSeries.at(-1)!.value || 0) /
                            (Math.max(...waitSeries.map((p) => p.value), 1) ||
                              1)) *
                            100
                        )
                      : 0) || 0,
                  display: `${region.data.waitTime} ms`,
                },
              ]}
            />
          )}

          <div className="flex flex-col gap-4 justify-end min-h-[260px]">
            {mode === "latest" ? (
              <ServerStats
                className="h-full"
                metrics={[
                  {
                    key: "cpu-load",
                    label: "CPU Load",
                    valuePct: Math.min(
                      100,
                      Math.round((region.data.cpuLoad || 0) * 100)
                    ),
                    display: region.data.cpuLoad,
                  },
                  {
                    key: "timers",
                    label: "Timers",
                    valuePct: 0,
                    display: formatCompactNumber(region.data.timers),
                  },
                ]}
              />
            ) : null}
            {mode === "history" && (
              <CompactHistoryCard
                className="border-0 shadow dark:bg-gray-800/50 backdrop-blur hover-lift"
                title="Online"
                color="rgb(34, 197, 94)"
                range={range}
                height={110}
                series={onlineSeries}
              />
            )}

            {mode === "history" && (
              <ServicesCard
                className="border-0 shadow dark:bg-gray-800/50 backdrop-blur hover-lift self-end w-full"
                databaseUp={region.data.services.database}
                redisUp={region.data.services.redis}
              />
            )}
          </div>
        </div>

        {/* History charts (time-series) without Card wrappers */}
        {mode === "history" && (
          <div className="mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 rounded-md dark:bg-gray-800/50 backdrop-blur hover-lift">
                <div className="flex items-center gap-2 text-gray-900 dark:text-white mb-2">
                  <ArrowsClockwise className="h-5 w-5" />
                  <span>Timers</span>
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
              </div>
              <div className="p-4 rounded-md dark:bg-gray-800/50 backdrop-blur hover-lift">
                <div className="flex items-center gap-2 text-gray-900 dark:text-white mb-2">
                  <WifiHigh className="h-5 w-5" />
                  <span>Online Users</span>
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
              </div>
            </div>
          </div>
        )}

        {/* Workers */}
        <Card className="mb-6 border-0 shadow dark:bg-gray-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">
              Workers
            </CardTitle>
            <CardDescription>
              Active worker processes and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {region.data.workers.map(([name, data], index) => {
                const totalWorkers = Number(data?.workers) || 0;
                const idle = Number(data?.idle) || 0;
                const waiting = Number(data?.waiting) || 0;
                const busy = Math.max(0, totalWorkers - idle);
                const busyPercent =
                  totalWorkers > 0
                    ? Math.round((busy / totalWorkers) * 100)
                    : 0;
                const queuePercent =
                  totalWorkers > 0
                    ? Math.min(100, Math.round((waiting / totalWorkers) * 100))
                    : waiting > 0
                    ? 100
                    : 0;
                // Optional arrays if present in payload
                const rawBlocked = (data?.recently_blocked_keys ||
                  data?.blocked_keys ||
                  []) as any[];
                const rawTop = (data?.top_keys ||
                  data?.keys_top ||
                  []) as any[];
                const maskKey = (k: string, reveal: boolean) => {
                  if (!k) return "";
                  if (reveal) return k;
                  const start = k.slice(0, 3);
                  const end = k.slice(-2);
                  const stars =
                    k.length > 5 ? "*".repeat(Math.max(2, k.length - 5)) : "**";
                  return `${start}${stars}${end}`;
                };
                const blockedKeys: string[] = Array.isArray(rawBlocked)
                  ? rawBlocked
                      .map((v: any) =>
                        typeof v === "string" ? v : v?.key ?? JSON.stringify(v)
                      )
                      .filter(Boolean)
                      .slice(0, 5)
                  : [];
                const topKeys: Array<{ key: string; count?: number }> =
                  Array.isArray(rawTop)
                    ? rawTop
                        .map((v: any) => {
                          if (Array.isArray(v))
                            return { key: String(v[0]), count: Number(v[1]) };
                          if (typeof v === "string") return { key: v };
                          return {
                            key: String(v?.key ?? ""),
                            count:
                              v?.count != null ? Number(v.count) : undefined,
                          };
                        })
                        .filter((x) => x.key)
                        .slice(0, 5)
                    : [];
                return (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-white/50 dark:bg-gray-900/40 backdrop-blur-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {name}
                        </h3>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Busy {busy}/{totalWorkers} • Idle {idle}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{totalWorkers} workers</Badge>
                        {waiting > 0 && (
                          <Badge
                            className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                            variant="outline"
                          >
                            {waiting} waiting
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Utilization bar */}
                    <div className="mb-3">
                      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${busyPercent}%` }}
                          aria-label={`Busy ${busyPercent}%`}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                        <span>Idle {idle}</span>
                        <span>{busyPercent}% busy</span>
                      </div>
                    </div>

                    {/* Stats and queue */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Wait Time
                        </div>
                        <div className="font-medium">
                          {Number(data?.wait_time) || 0}ms
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Time to Return
                        </div>
                        <div className="font-medium">
                          {Number(data?.time_to_return) || 0}ms
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Waiting
                        </div>
                        <div className="font-medium">{waiting}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400 w-14">
                          Queue
                        </div>
                        <div className="flex-1">
                          <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                            <div
                              className="h-full bg-amber-500 transition-all"
                              style={{ width: `${queuePercent}%` }}
                              aria-label={`Queue ${queuePercent}%`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {(blockedKeys.length > 0 || topKeys.length > 0) && (
                      <Accordion type="multiple" className="mt-4">
                        {blockedKeys.length > 0 && (
                          <AccordionItem value={`blocked-${index}`}>
                            <AccordionTrigger className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="flex items-center gap-2">
                                <Key className="h-4 w-4" /> Recently Blocked
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="flex items-center justify-end mb-1">
                                <button
                                  type="button"
                                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                  onClick={() =>
                                    setShowBlockedKeys((s) => ({
                                      ...s,
                                      [name]: !s[name],
                                    }))
                                  }
                                  aria-label={
                                    showBlockedKeys[name]
                                      ? "Hide keys"
                                      : "Show keys"
                                  }
                                >
                                  {showBlockedKeys[name] ? (
                                    <EyeSlash className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                              <div className="h-24 overflow-y-auto pr-1">
                                <ul className="space-y-2">
                                  {blockedKeys.map((k, i) => {
                                    const revealed = !!showBlockedKeys[name];
                                    const display = maskKey(k, revealed);
                                    return (
                                      <li
                                        key={i}
                                        className="group flex items-center justify-between gap-2"
                                      >
                                        <code
                                          className="font-mono text-xs text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 truncate flex-1"
                                          title={k}
                                        >
                                          {display}
                                        </code>
                                        <button
                                          type="button"
                                          className={`opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${
                                            revealed ? "" : "cursor-not-allowed"
                                          }`}
                                          onClick={() =>
                                            revealed &&
                                            navigator.clipboard?.writeText(k)
                                          }
                                          aria-label="Copy key"
                                        >
                                          <CopySimple className="h-4 w-4" />
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                        {topKeys.length > 0 && (
                          <AccordionItem value={`top-${index}`}>
                            <AccordionTrigger className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="flex items-center gap-2">
                                <Key className="h-4 w-4" /> Top Keys
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="flex items-center justify-end mb-1">
                                <button
                                  type="button"
                                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                  onClick={() =>
                                    setShowTopKeys((s) => ({
                                      ...s,
                                      [name]: !s[name],
                                    }))
                                  }
                                  aria-label={
                                    showTopKeys[name]
                                      ? "Hide keys"
                                      : "Show keys"
                                  }
                                >
                                  {showTopKeys[name] ? (
                                    <EyeSlash className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                              <div className="h-24 overflow-y-auto pr-1">
                                <ul className="space-y-2">
                                  {topKeys.map((item, i) => {
                                    const revealed = !!showTopKeys[name];
                                    const display = maskKey(item.key, revealed);
                                    return (
                                      <li
                                        key={i}
                                        className="group flex items-center justify-between gap-2"
                                      >
                                        <code
                                          className="font-mono text-xs text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 truncate flex-1"
                                          title={item.key}
                                        >
                                          {display}
                                        </code>
                                        <div className="flex items-center gap-2">
                                          {item.count != null && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                                              {item.count}
                                            </span>
                                          )}
                                          <button
                                            type="button"
                                            className={`opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${
                                              revealed
                                                ? ""
                                                : "cursor-not-allowed"
                                            }`}
                                            onClick={() =>
                                              revealed &&
                                              navigator.clipboard?.writeText(
                                                item.key
                                              )
                                            }
                                            aria-label="Copy key"
                                          >
                                            <CopySimple className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* end */}
      </div>
    </div>
  );
}
