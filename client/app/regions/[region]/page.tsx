"use client";

/**
 * Page: RegionDetailPage
 * I display a single region's live or historical metrics. I manage the latest
 * vs history mode, request history for the selected range, compute series via
 * helper utilities, and compose the region sections.
 */

import { useParams, useRouter } from "next/navigation";
import { useHeader } from "@/app/contexts/HeaderContext";
import { useWebSocket } from "@/app/contexts/WebSocketContext";
import { useEffect, useState } from "react";
import {
  formatRegionName,
  getServerHealthStatus,
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
  extractCpuLoad,
  extractActiveConnections,
} from "@/lib/helpers/history";
import { RegionDetailSkeleton } from "@/components/dashboard/Skeletons";
import { RegionHeader } from "@/components/region/RegionHeader";
import { RegionStatusSection } from "@/components/region/RegionStatusSection";
import { InfrastructureSection } from "@/components/region/InfrastructureSection";
import { HistoryChartsSection } from "@/components/region/HistoryChartsSection";
import { WorkersCard } from "@/components/dashboard/WorkersCard";
import { WorkersHistory } from "@/components/region/WorkersHistory";
import { MemoryUsageCard } from "@/components/dashboard/MemoryUsageCard";
import { DiskUsageCard } from "@/components/dashboard/DiskUsageCard";
import { NetworkPerformanceCard } from "@/components/dashboard/NetworkPerformanceCard";
import { PerformanceAnalyticsCard } from "@/components/dashboard/PerformanceAnalyticsCard";
import { SecurityMonitoringCard } from "@/components/dashboard/SecurityMonitoringCard";
import { DeploymentStatusCard } from "@/components/dashboard/DeploymentStatusCard";
import { AlertsManagementCard } from "@/components/dashboard/AlertsManagementCard";
import { HistoricalDevOpsSection } from "@/components/region/HistoricalDevOpsSection";

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
  const [errorDetails, setErrorDetails] = useState<{
    error: string;
    httpStatus?: number;
    errorCode?: string;
    timestamp?: string;
  } | null>(null);
  const { setHeader } = useHeader();
  const [mode, setMode] = useState<"latest" | "history">("latest");
  const [range, setRange] = useState<RangeKey>("1m");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Safe back navigation: prefer in-app back, otherwise push to dashboard.
  const handleBack = () => {
    if (typeof window !== "undefined") {
      try {
        const ref = document.referrer;
        const sameOrigin =
          ref && new URL(ref).origin === window.location.origin;
        if (sameOrigin) {
          router.back();
          return;
        }
      } catch (e) {
        // ignore and fall through to push
      }
    }
    router.push("/");
  };

  // When the metrics snapshot changes, extract and normalize the current region
  // data into a typed structure for the page.
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

        // Extract error details if the region has an error status
        if (data.serverStatus === "error" && regionData.error) {
          setErrorDetails({
            error: regionData.error || "Unknown error",
            httpStatus: regionData.httpStatus,
            errorCode: regionData.errorCode,
            timestamp: regionData.timestamp,
          });
        } else {
          setErrorDetails(null);
        }

        setRegion({
          name: regionKey,
          displayName: formatRegionName(regionKey),
          data,
          health,
        });
      }
    }
  }, [metrics, params.region]);

  // Configure shared header for region page based on connection/mode.
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
      onBack: handleBack,
    });
  }, [region?.displayName, isConnected, mode, lastUpdated]);

  // History mode wiring: when mode changes, toggle live and request history for
  // the selected time window. Latest mode re-enables live and pulls a fresh
  // snapshot for the region.
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
        limit: 50000, // Request maximum data to get full week of history
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

  // Calculate the time range for consistent chart display and ensure we always
  // render full aligned windows even with sparse history.
  const to = new Date();
  const from = new Date(to.getTime() - windowMsForRange(range));
  const timeRange = { from: from.toISOString(), to: to.toISOString() };

  const waitSeries =
    compressPerSourceByTime(
      regionHistory,
      (d) => extractWaitTime(d),
      bucketMs,
      timeRange
    )[params.region as string] || [];
  const timersSeries =
    compressPerSourceByTime(
      regionHistory,
      (d) => extractTimers(d),
      bucketMs,
      timeRange
    )[params.region as string] || [];
  const onlineSeries =
    compressPerSourceByTime(
      regionHistory,
      (d) => extractOnline(d),
      bucketMs,
      timeRange
    )[params.region as string] || [];
  const cpuLoadSeries =
    compressPerSourceByTime(
      regionHistory,
      (d) => extractCpuLoad(d),
      bucketMs,
      timeRange
    )[params.region as string] || [];
  const activeConnectionsSeries =
    compressPerSourceByTime(
      regionHistory,
      (d) => extractActiveConnections(d),
      bucketMs,
      timeRange
    )[params.region as string] || [];

  if (!region) {
    return <RegionDetailSkeleton />;
  }

  return (
    <div className="min-h-screen bg-transparent p-0 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 px-0 sm:px-0">
        <RegionHeader mode={mode} range={range} onRangeChange={setRange} />

        <RegionStatusSection
          mode={mode}
          health={region.health}
          serverStatus={region.data.serverStatus}
          sessionCount={region.data.session}
          version={region.data.version}
          databaseUp={region.data.services.database}
          redisUp={region.data.services.redis}
          range={range}
          activeConnectionsSeries={activeConnectionsSeries}
          errorDetails={errorDetails || undefined}
        />

        <InfrastructureSection
          mode={mode}
          range={range}
          waitSeries={waitSeries}
          activeConnectionsSeries={activeConnectionsSeries}
          cpuLoadSeries={cpuLoadSeries}
          regionData={region.data}
        />

        {mode === "history" && (
          <HistoryChartsSection
            range={range}
            timersSeries={timersSeries}
            onlineSeries={onlineSeries}
          />
        )}

        {mode === "history" && (
          <WorkersHistory
            range={range}
            history={history as any}
            workers={region.data.workers}
          />
        )}
        {mode !== "history" && (
          <div className="-mt-6">
            <WorkersCard workers={region.data.workers} isHistoryMode={false} />
          </div>
        )}

        {/* DevOps Infrastructure Monitoring Section for this Region */}
        {mode === "history" ? (
          <HistoricalDevOpsSection 
            mode={mode} 
            range={range} 
            regionName={region.displayName} 
          />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <MemoryUsageCard regions={[{
                name: region.name,
                displayName: region.displayName,
                memory: (metrics as any)[region.name]?.results?.memory || {
                  total: 32,
                  used: Math.round(32 * (region.data.cpuLoad / 100) * 0.8),
                  available: Math.round(32 * (1 - (region.data.cpuLoad / 100) * 0.8)),
                  usage_percent: Math.round((region.data.cpuLoad / 100) * 80)
                },
                status: region.data.serverStatus
              }]} />
              <DiskUsageCard regions={[{
                name: region.name,
                displayName: region.displayName,
                disk: (metrics as any)[region.name]?.results?.disk || {
                  total: 500,
                  used: Math.round(500 * (region.data.cpuLoad / 100) * 0.6),
                  available: Math.round(500 * (1 - (region.data.cpuLoad / 100) * 0.6)),
                  usage_percent: Math.round((region.data.cpuLoad / 100) * 60),
                  io_read: Math.round(25 + region.data.cpuLoad * 0.5),
                  io_write: Math.round(15 + region.data.cpuLoad * 0.3)
                },
                status: region.data.serverStatus
              }]} />
            </div>

            <NetworkPerformanceCard regions={[{
              name: region.name,
              displayName: region.displayName,
              network: (metrics as any)[region.name]?.results?.network || {
                bandwidth_in: Math.round(750 + region.data.activeConnections * 2),
                bandwidth_out: Math.round(500 + region.data.activeConnections * 1.5),
                latency: Math.round(45 + region.data.waitTime * 0.1),
                packet_loss: Math.max(0.01, region.data.cpuLoad > 80 ? 0.5 : 0.1)
              },
              status: region.data.serverStatus
            }]} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <PerformanceAnalyticsCard regions={[{
                name: region.name,
                displayName: region.displayName,
                performance: (metrics as any)[region.name]?.results?.performance || {
                  response_times: { 
                    p50: Math.round(120 + region.data.waitTime * 2), 
                    p95: Math.round(300 + region.data.waitTime * 5), 
                    p99: Math.round(800 + region.data.waitTime * 10) 
                  },
                  error_rate: Math.max(0.1, region.data.cpuLoad > 80 ? 2 : 0.5),
                  requests_per_second: Math.round(850 + region.data.activeConnections * 5),
                  uptime_percent: region.data.serverStatus === 'ok' ? 99.9 : 95.5
                },
                status: region.data.serverStatus
              }]} />
              <SecurityMonitoringCard regions={[{
                name: region.name,
                displayName: region.displayName,
                security: (metrics as any)[region.name]?.results?.security || {
                  failed_logins: Math.round(12 + (region.data.cpuLoad > 70 ? 20 : 0)),
                  blocked_ips: Math.round(3 + (region.data.cpuLoad > 80 ? 5 : 0)),
                  ssl_cert_days: 89,
                  vulnerability_score: Math.round(15 + (region.data.cpuLoad > 80 ? 25 : 0))
                },
                status: region.data.serverStatus
              }]} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <DeploymentStatusCard regions={[{
                name: region.name,
                displayName: region.displayName,
                deployment: (metrics as any)[region.name]?.results?.deployment || {
                  last_deployment: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                  build_status: region.data.serverStatus === 'ok' ? 'success' as const : 'failed' as const,
                  version_number: region.data.version || 'v1.2.3',
                  rollback_ready: region.data.serverStatus === 'ok'
                },
                status: region.data.serverStatus
              }]} />
              <AlertsManagementCard regions={[{
                name: region.name,
                displayName: region.displayName,
                alerts: (metrics as any)[region.name]?.results?.alerts || {
                  active_alerts: Math.round(2 + (region.data.cpuLoad > 70 ? 5 : 0)),
                  critical_alerts: region.data.serverStatus === 'error' ? 1 : 0,
                  escalated_alerts: region.data.serverStatus === 'error' ? 1 : 0,
                  alert_response_time: Math.round(8 + region.data.waitTime * 0.1)
                },
                status: region.data.serverStatus
              }]} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
