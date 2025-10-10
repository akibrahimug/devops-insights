"use client";

/**
 * Page: DevOpsDashboard
 * I render the global dashboard, wiring live data via WebSocket, processing
 * the latest snapshot into per-region cards and summary KPIs, and composing
 * mini charts and comparisons. I also configure the shared header state.
 */

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
import { MemoryUsageCard } from "@/components/dashboard/MemoryUsageCard";
import { DiskUsageCard } from "@/components/dashboard/DiskUsageCard";
import { NetworkPerformanceCard } from "@/components/dashboard/NetworkPerformanceCard";
import { PerformanceAnalyticsCard } from "@/components/dashboard/PerformanceAnalyticsCard";
import { SecurityMonitoringCard } from "@/components/dashboard/SecurityMonitoringCard";
import { DeploymentStatusCard } from "@/components/dashboard/DeploymentStatusCard";
import { AlertsManagementCard } from "@/components/dashboard/AlertsManagementCard";

import {
  RegionsCardSkeleton,
  StatsGridSkeleton,
  ChartCardSkeleton,
} from "@/components/dashboard/Skeletons";
import { ThemeToggle } from "@/components/Theme/theme-toggle";
import { useHeader } from "@/app/contexts/HeaderContext";
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
  const { setHeader } = useHeader();
  const [regions, setRegions] = useState<Region[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  useEffect(() => {
    setHeader({
      title: "DevOps Dashboard",
      connected: isConnected,
      autoRefreshEnabled,
      onToggleRefresh: toggleAutoRefresh,
      onLatestClick: () => {
        enableLive?.();
        getInitialData();
      },
      showHistory: false,
      activeTab: "latest",
      lastUpdated,
    });
  }, [isConnected, autoRefreshEnabled, lastUpdated]);

  // Process live snapshot into region models (latest mode only). Filters out
  // invalid entries and normalizes the shape for downstream components.
  useEffect(() => {
    if (Object.keys(metrics).length === 0) return;

    console.log("📊 [Dashboard] Metrics changed, reprocessing regions...", {
      metricsCount: Object.keys(metrics).length,
      sources: Object.keys(metrics)
    });

    const allowedSources = ["us-east", "eu-west", "eu-central", "us-west", "sa-east", "ap-southeast"];
    const processed = Object.entries(metrics)
      .filter(
        ([key, value]: [string, any]) => {
          const isAllowed = allowedSources.includes(key);
          const hasValue = value && typeof value === "object";
          const hasStatus = value?.status;

          return isAllowed && hasValue && hasStatus;
        }
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

    console.log("✅ [Dashboard] Processed regions:", {
      count: processed.length,
      regions: processed.map(r => ({ name: r.name, status: r.serverStatus, memoryUsage: (r as any)?.results?.memory?.usage_percent }))
    });

    setRegions(processed);
    setLastUpdated(new Date());
  }, [metrics]);


  // Initialize / control data flow based on live toggle and connection.
  useEffect(() => {
    if (!isConnected) return;
    getInitialData();
    if (autoRefreshEnabled) enableLive?.();
    else disableLive?.();
  }, [isConnected, autoRefreshEnabled]);

  // Toggle the live stream and ensure an initial snapshot is loaded when
  // enabling. Disabling pauses future live updates.
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

  const connectionsColor = useMemo(() => {
    if (totalConnections < 3000) return "text-red-600"; // Low - concerning
    if (totalConnections < 8000) return "text-amber-600"; // Medium
    if (totalConnections < 15000) return "text-green-600"; // Good
    return "text-blue-600"; // High - excellent
  }, [totalConnections]);

  const totalCpus = useMemo(() => {
    return regions.reduce((sum, region) => {
      const v = (region as any)?.results?.stats?.server?.cpus || 0;
      return sum + (typeof v === "number" ? v : 0);
    }, 0);
  }, [regions]);

  const cpusColor = useMemo(() => {
    const avgLoad = regions.length > 0 ? regions.reduce((sum, region) => {
      const load = (region as any)?.results?.stats?.server?.cpu_load || 0;
      return sum + load;
    }, 0) / regions.length : 0;
    
    if (totalCpus < 20) return "text-red-600"; // Low CPU count
    if (avgLoad > 80) return "text-red-600"; // High load
    if (avgLoad > 60) return "text-amber-600"; // Medium load
    if (totalCpus > 60) return "text-blue-600"; // High CPU count
    return "text-green-600"; // Good balance
  }, [totalCpus, regions]);

  // Derived chart data from current snapshot (latest mode only).
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

  // Per-region server issue metric (string/number -> number) for cards.
  const regionErrorRates = useMemo(() => {
    if (!regions || regions.length === 0) return [];
    
    const ordered = [...regions].sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );
    return ordered.map((r) => {
      const regionData = r as any;
      
      // Check if this is an error state
      const isError = regionData.serverStatus === "error";
      const serverIssue = regionData.serverIssue;
      
      if (isError) {
        // Parse detailed error information
        let errorDetails = null;
        try {
          errorDetails = typeof serverIssue === "string" ? JSON.parse(serverIssue) : null;
        } catch {
          errorDetails = null;
        }
        
        return { 
          title: r.displayName, 
          value: 100, 
          isError: true,
          errorMessage: errorDetails?.message || (typeof serverIssue === "string" ? serverIssue : "Service unavailable"),
          errorCode: errorDetails?.code || null,
          errorType: errorDetails?.type || "Unknown",
          affectedServices: errorDetails?.affectedServices || [],
          timestamp: errorDetails?.timestamp || new Date().toISOString(),
          httpStatus: regionData.httpStatus,
        };
      }
      
      // For non-error states, check if there's a server_issue field
      const raw = serverIssue ?? 0;
      const num = typeof raw === "number" ? raw : parseFloat(String(raw));
      const value = Number.isFinite(num) ? num : 0;
      
      return { 
        title: r.displayName, 
        value,
        isError: false,
        errorMessage: null,
        httpStatus: null,
      };
    });
  }, [regions]);

  // Extract real memory data from WebSocket (updates when regions change)
  const memoryRegions = useMemo(() => {
    console.log("💾 [Dashboard] Recalculating memory regions from:", regions.length, "regions");
    const data = regions.map(region => {
      const regionData = region as any;
      const memoryData = regionData?.results?.memory;

      return {
        name: region.name,
        displayName: region.displayName,
        memory: {
          total: memoryData?.total || 8,
          used: memoryData?.used || 0,
          available: memoryData?.available || 8,
          usage_percent: memoryData?.usage_percent || 0
        },
        status: region.serverStatus
      };
    });
    console.log("💾 [Dashboard] Memory data:", data.map(d => ({ region: d.name, usage: d.memory.usage_percent })));
    return data;
  }, [regions]);

  // Extract real disk data from WebSocket (updates when regions change)
  const diskRegions = useMemo(() => {
    return regions.map(region => {
      const regionData = region as any;
      const storageData = regionData?.results?.storage;

      return {
        name: region.name,
        displayName: region.displayName,
        disk: {
          total: 500,
          used: storageData?.disk_usage_percent ? Math.round(500 * (storageData.disk_usage_percent / 100)) : 0,
          available: storageData?.disk_usage_percent ? Math.round(500 * (1 - storageData.disk_usage_percent / 100)) : 500,
          usage_percent: storageData?.disk_usage_percent || 0,
          io_read: storageData?.read_ops_per_sec || 0,
          io_write: storageData?.write_ops_per_sec || 0
        },
        status: region.serverStatus
      };
    });
  }, [regions]);

  // Extract real network data from WebSocket (updates when regions change)
  const networkRegions = useMemo(() => {
    return regions.map(region => {
      const regionData = region as any;
      const networkData = regionData?.results?.network;

      return {
        name: region.name,
        displayName: region.displayName,
        network: {
          bandwidth_in: networkData?.bytes_in_per_sec ? Math.round(networkData.bytes_in_per_sec / 1000) : 0, // Convert to KB/s
          bandwidth_out: networkData?.bytes_out_per_sec ? Math.round(networkData.bytes_out_per_sec / 1000) : 0, // Convert to KB/s
          latency: networkData?.latency_ms || 0,
          packet_loss: networkData?.packets_dropped || 0
        },
        status: region.serverStatus
      };
    });
  }, [regions]);

  // Extract real performance data from WebSocket (updates when regions change)
  const performanceRegions = useMemo(() => {
    return regions.map(region => {
      const regionData = region as any;
      const performanceData = regionData?.results?.performance;

      return {
        name: region.name,
        displayName: region.displayName,
        performance: {
          response_times: {
            p50: performanceData?.response_times?.p50 || 0,
            p95: performanceData?.response_times?.p95 || 0,
            p99: performanceData?.response_times?.p99 || 0
          },
          error_rate: performanceData?.error_rate || 0,
          requests_per_second: performanceData?.requests_per_second || 0,
          uptime_percent: performanceData?.uptime_percent || 0
        },
        status: region.serverStatus
      };
    });
  }, [regions]);

  // Extract real security data from WebSocket (updates when regions change)
  const securityRegions = useMemo(() => {
    return regions.map(region => {
      const regionData = region as any;
      const securityData = regionData?.results?.security;

      return {
        name: region.name,
        displayName: region.displayName,
        security: {
          failed_logins: securityData?.failed_logins || 0,
          blocked_ips: securityData?.blocked_ips || 0,
          ssl_cert_days: securityData?.ssl_cert_days || 0,
          vulnerability_score: securityData?.vulnerability_score || 0
        },
        status: region.serverStatus
      };
    });
  }, [regions]);

  // Extract real deployment data from WebSocket (updates when regions change)
  const deploymentRegions = useMemo(() => {
    return regions.map(region => {
      const regionData = region as any;
      const deploymentData = regionData?.results?.deployment;

      return {
        name: region.name,
        displayName: region.displayName,
        deployment: {
          last_deployment: deploymentData?.last_deployment || new Date().toISOString(),
          build_status: deploymentData?.build_status || 'success',
          version_number: deploymentData?.version_number || regionData?.version || 'v1.0.0',
          rollback_ready: deploymentData?.rollback_ready !== undefined ? deploymentData.rollback_ready : true
        },
        status: region.serverStatus
      };
    });
  }, [regions]);

  // Extract real alerts data from WebSocket (updates when regions change)
  const alertsRegions = useMemo(() => {
    return regions.map(region => {
      const regionData = region as any;
      const alertsData = regionData?.results?.alerts;

      return {
        name: region.name,
        displayName: region.displayName,
        alerts: {
          active_alerts: alertsData?.active_alerts || 0,
          critical_alerts: alertsData?.critical_alerts || 0,
          escalated_alerts: alertsData?.escalated_alerts || 0,
          alert_response_time: alertsData?.alert_response_time || 0
        },
        status: region.serverStatus
      };
    });
  }, [regions]);

  return (
    <div className="min-h-screen bg-transparent p-0 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 px-0 sm:px-0">
        {/* header configured in effect */}

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

        {/* Server Issues section */}
        {regionErrorRates.length > 0 ? (
          <Card className="animate-scale-in border-0 shadow dark:bg-gray-800/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">
                Server Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {regionErrorRates.map((item, index) => {
                  const isError = (item as any).isError;
                  const errorMessage = (item as any).errorMessage;
                  const errorCode = (item as any).errorCode;
                  const errorType = (item as any).errorType;
                  const affectedServices = (item as any).affectedServices || [];
                  const timestamp = (item as any).timestamp;
                  const httpStatus = (item as any).httpStatus;
                  
                  // Dynamic styling based on error state
                  const cardBgClass = isError 
                    ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/60" 
                    : item.value > 1 
                      ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60"
                      : "dark:bg-gray-800/50";
                      
                  const iconBgClass = isError 
                    ? "bg-red-100 dark:bg-red-900/40" 
                    : item.value > 1
                      ? "bg-amber-100 dark:bg-amber-900/40"
                      : "bg-green-100 dark:bg-green-900/40";
                      
                  const valueTextClass = isError 
                    ? "text-red-600 dark:text-red-400" 
                    : item.value > 1
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-green-600 dark:text-green-400";

                  return (
                    <Card
                      key={item.title}
                      className={`transition-all duration-300 animate-fade-in shadow backdrop-blur hover:shadow-md hover:scale-[1.02] ${cardBgClass} ${isError ? 'min-h-[140px]' : ''}`}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate pr-2">
                          {item.title}
                        </div>
                        <div className={`p-2 rounded-lg ${iconBgClass} flex-shrink-0`}>
                          <WarningIcon
                            className={`h-4 w-4 ${getMetricColor(item.value, {
                              good: 0.5,
                              warning: 1,
                              critical: 2,
                            })}`}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="overflow-hidden">
                        <div className={`text-2xl font-bold ${valueTextClass} mb-2`}>
                          {isError ? "FAILED" : formatPercentage(item.value)}
                        </div>
                        {isError && errorMessage && (
                          <div className="mt-2 space-y-1 max-h-[80px] overflow-y-auto pr-1 custom-scrollbar">
                            <div className="text-xs text-red-700 dark:text-red-300 font-medium truncate" title={`${errorType}: ${errorCode}`}>
                              <span className="font-semibold">{errorType}:</span> {errorCode}
                            </div>
                            <div className="text-xs text-red-600 dark:text-red-400 line-clamp-2" title={errorMessage}>
                              {errorMessage}
                            </div>
                            {affectedServices.length > 0 && (
                              <div className="text-xs text-red-500 dark:text-red-400 truncate" title={`Services: ${affectedServices.join(', ')}`}>
                                Services: {affectedServices.join(', ')}
                              </div>
                            )}
                            {timestamp && (
                              <div className="text-xs text-red-400 dark:text-red-500 font-mono">
                                {new Date(timestamp).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
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
                color={cpusColor}
                formatter={formatNumber}
              />
              <MetricMiniCard
                title="Total Active Connections"
                value={totalConnections}
                icon={PlugsIcon}
                color={connectionsColor}
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

        {/* Mixed Infrastructure & Performance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {regions.length > 0 ? (
            <MemoryUsageCard regions={memoryRegions} />
          ) : (
            <ChartCardSkeleton height={400} />
          )}
          {regions.length > 0 ? (
            <PerformanceAnalyticsCard regions={performanceRegions} />
          ) : (
            <ChartCardSkeleton height={450} />
          )}
        </div>

        {/* Network Performance - Full Width */}
        <div className="mb-6">
          {regions.length > 0 ? (
            <NetworkPerformanceCard regions={networkRegions} />
          ) : (
            <ChartCardSkeleton height={450} />
          )}
        </div>

        {/* Storage & Security Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {regions.length > 0 ? (
            <DiskUsageCard regions={diskRegions} />
          ) : (
            <ChartCardSkeleton height={400} />
          )}
          {regions.length > 0 ? (
            <SecurityMonitoringCard regions={securityRegions} />
          ) : (
            <ChartCardSkeleton height={450} />
          )}
        </div>

        {/* Operations Management Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {regions.length > 0 ? (
            <DeploymentStatusCard regions={deploymentRegions} />
          ) : (
            <ChartCardSkeleton height={400} />
          )}
          {regions.length > 0 ? (
            <AlertsManagementCard regions={alertsRegions} />
          ) : (
            <ChartCardSkeleton height={400} />
          )}
        </div>
      </div>
    </div>
  );
}
