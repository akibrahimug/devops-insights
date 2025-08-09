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
import { MetricChart } from "@/components/charts/MetricChart";
import {
  ArrowLeft,
  Database,
  Cpu,
  Memory,
  HardDrive,
  Users,
  Clock,
  Warning,
} from "@phosphor-icons/react";
import { useWebSocket } from "@/app/contexts/WebSocketContext";
import { useEffect, useState } from "react";
import {
  formatRegionName,
  formatNumber,
  formatPercentage,
  formatRelativeTime,
  getServerHealthStatus,
  getMetricColor,
  parseErrorRate,
} from "@/lib/helpers/utils";
import { InteractiveLoader } from "@/components/loading/InteractiveLoader";
import { Skeleton } from "@/components/ui/skeleton";

interface RegionData {
  latency: number;
  throughput: number;
  errorRate: string | number;
  activeSessions: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  requestsPerSecond: number;
  activeConnections: number;
  timestamp: string;
  source: string;
  serverStatus: string;
  region: string;
  serversCount: number;
  online: number;
  session: number;
  cpuLoad: number;
  waitTime: number;
  timers: number;
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
  const { metrics } = useWebSocket();
  const [region, setRegion] = useState<Region | null>(null);

  useEffect(() => {
    if (Object.keys(metrics).length > 0) {
      const regionKey = params.region as string;
      const regionData = metrics[regionKey] as any;

      if (regionData) {
        const data: RegionData = {
          latency: regionData.latency || 0,
          throughput: regionData.throughput || 0,
          errorRate: regionData.errorRate || 0,
          activeSessions: regionData.activeSessions || 0,
          cpuUsage: regionData.cpuUsage || 0,
          memoryUsage: regionData.memoryUsage || 0,
          diskUsage: regionData.diskUsage || 0,
          requestsPerSecond: regionData.requestsPerSecond || 0,
          activeConnections: regionData.activeConnections || 0,
          timestamp: regionData.timestamp || new Date().toISOString(),
          source: regionData.source || regionKey,
          serverStatus: regionData.status || "unknown",
          region: regionData.region || regionKey,
          serversCount: regionData.results?.stats?.servers_count || 0,
          online: regionData.results?.stats?.online || 0,
          session: regionData.results?.stats?.session || 0,
          cpuLoad: regionData.results?.stats?.server?.cpu_load || 0,
          waitTime: regionData.results?.stats?.server?.wait_time || 0,
          timers: regionData.results?.stats?.server?.timers || 0,
          services: {
            redis: regionData.results?.services?.redis || false,
            database: regionData.results?.services?.database || false,
          },
          workers: regionData.results?.stats?.server?.workers || [],
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

  if (!region) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="flex items-center justify-center">
            <InteractiveLoader label="Fetching region data…" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {region.displayName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Detailed region information and metrics
          </p>
        </div>
      </div>

      {/* Health Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${region.health.bgColor} animate-pulse`}
            />
            Health Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${region.health.textColor}`}>
                {region.data.serverStatus.toUpperCase()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Server Status
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(region.data.online)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Online Users
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(region.data.session)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Active Sessions
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infrastructure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Infrastructure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Servers
                </div>
                <div className="text-xl font-semibold">
                  {region.data.serversCount}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  CPU Load
                </div>
                <div className="text-xl font-semibold">
                  {region.data.cpuLoad.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Wait Time
                </div>
                <div className="text-xl font-semibold">
                  {region.data.waitTime}ms
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Timers
                </div>
                <div className="text-xl font-semibold">
                  {region.data.timers}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Redis
                </span>
                <Badge
                  variant={
                    region.data.services.redis ? "default" : "destructive"
                  }
                >
                  {region.data.services.redis ? "Online" : "Offline"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Database
                </span>
                <Badge
                  variant={
                    region.data.services.database ? "default" : "destructive"
                  }
                >
                  {region.data.services.database ? "Online" : "Offline"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Workers</CardTitle>
          <CardDescription>
            Active worker processes and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {region.data.workers.map(([name, data], index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {name}
                  </h3>
                  <Badge variant="outline">{data.workers} workers</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Wait Time:
                    </span>
                    <div className="font-medium">{data.wait_time}ms</div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Waiting:
                    </span>
                    <div className="font-medium">{data.waiting}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Idle:
                    </span>
                    <div className="font-medium">{data.idle}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Time to Return:
                    </span>
                    <div className="font-medium">{data.time_to_return}ms</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricChart
              type="bar"
              data={{
                labels: ["Latency", "Error Rate", "CPU Usage", "Memory Usage"],
                datasets: [
                  {
                    label: "Current Values",
                    data: [
                      region.data.latency,
                      parseErrorRate(region.data.errorRate),
                      region.data.cpuUsage,
                      region.data.memoryUsage,
                    ],
                    backgroundColor: [
                      "rgba(59, 130, 246, 0.6)",
                      "rgba(239, 68, 68, 0.6)",
                      "rgba(168, 85, 247, 0.6)",
                      "rgba(236, 72, 153, 0.6)",
                    ],
                    borderColor: [
                      "rgb(59, 130, 246)",
                      "rgb(239, 68, 68)",
                      "rgb(168, 85, 247)",
                      "rgb(236, 72, 153)",
                    ],
                    borderWidth: 2,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Active Connections
                </span>
                <span className="font-semibold">
                  {formatNumber(region.data.activeConnections)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Requests/Second
                </span>
                <span className="font-semibold">
                  {region.data.requestsPerSecond}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Throughput
                </span>
                <span className="font-semibold">
                  {formatNumber(region.data.throughput)}/min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Last Updated
                </span>
                <span className="font-semibold">
                  {formatRelativeTime(region.data.timestamp)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
