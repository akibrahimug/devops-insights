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
        <RegionHeader
          onBack={handleBack}
          mode={mode}
          range={range}
          onRangeChange={setRange}
        />

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
      </div>
    </div>
  );
}
