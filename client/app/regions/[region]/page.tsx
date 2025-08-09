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
} from "@phosphor-icons/react";
import { useWebSocket } from "@/app/contexts/WebSocketContext";
import { useEffect, useState } from "react";
import {
  formatRegionName,
  formatNumber,
  getServerHealthStatus,
} from "@/lib/helpers/utils";

interface RegionResults {
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
}

interface RegionData {
  serverStatus: string;
  serverIssue?: string | null;
  strictness: number;
  version: string;
  roles: string[];
  results: RegionResults;
}

interface Region extends RegionData {
  name: string;
  displayName: string;
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
      const value = metrics[regionKey] as any;

      if (value && typeof value === "object" && value.status) {
        const data: RegionData = {
          serverStatus: String(value.status),
          serverIssue: value.server_issue ?? null,
          strictness: Number(value.strict ?? 0),
          version: String(value.version ?? ""),
          roles: Array.isArray(value.roles) ? value.roles : [],
          results: (value.results || {
            stats: {
              online: 0,
              server: {
                cpus: 0,
                active_connections: 0,
                wait_time: 0,
                workers: [],
                cpu_load: 0,
              },
              servers_count: 0,
              session: 0,
            },
            services: { redis: false, database: false },
          }) as RegionResults,
        };

        const health = getServerHealthStatus(data.serverStatus);

        setRegion({
          name: regionKey,
          displayName: formatRegionName(regionKey),
          ...data,
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
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-48 rounded"></div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const stats = region.results.stats;
  const server = stats.server;
  const services = region.results.services;
  const workers = Array.isArray(server.workers) ? server.workers : [];

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
                {region.serverStatus.toUpperCase()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Server Status
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(stats.online)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Online Users
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(stats.session)}
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
                  {stats.servers_count}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  CPU Load
                </div>
                <div className="text-xl font-semibold">
                  {server.cpu_load.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Wait Time
                </div>
                <div className="text-xl font-semibold">{server.wait_time}ms</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  CPUs
                </div>
                <div className="text-xl font-semibold">{server.cpus}</div>
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
                <Badge variant={services.redis ? "default" : "destructive"}>
                  {services.redis ? "Online" : "Offline"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Database
                </span>
                <Badge variant={services.database ? "default" : "destructive"}>
                  {services.database ? "Online" : "Offline"}
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
          <CardDescription>Active worker processes and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workers.length === 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                No worker data
              </div>
            )}
            {workers.map((item: any, index: number) => {
              const name = item?.name || `Worker ${index + 1}`;
              const data = item || {};
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {name}
                    </h3>
                    {typeof data.workers === "number" && (
                      <Badge variant="outline">{data.workers} workers</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {data.wait_time !== undefined && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Wait Time:
                        </span>
                        <div className="font-medium">{data.wait_time}ms</div>
                      </div>
                    )}
                    {data.waiting !== undefined && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Waiting:
                        </span>
                        <div className="font-medium">{data.waiting}</div>
                      </div>
                    )}
                    {data.idle !== undefined && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Idle:
                        </span>
                        <div className="font-medium">{data.idle}</div>
                      </div>
                    )}
                    {data.time_to_return !== undefined && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Time to Return:
                        </span>
                        <div className="font-medium">{data.time_to_return}ms</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricChart
              type="bar"
              data={{
                labels: [
                  "Wait Time (ms)",
                  "CPU Load",
                  "Active Connections",
                  "CPUs",
                ],
                datasets: [
                  {
                    label: "Current Values",
                    data: [
                      server.wait_time,
                      server.cpu_load,
                      server.active_connections,
                      server.cpus,
                    ],
                    backgroundColor: [
                      "rgba(59, 130, 246, 0.6)",
                      "rgba(168, 85, 247, 0.6)",
                      "rgba(20, 184, 166, 0.6)",
                      "rgba(236, 72, 153, 0.6)",
                    ],
                    borderColor: [
                      "rgb(59, 130, 246)",
                      "rgb(168, 85, 247)",
                      "rgb(20, 184, 166)",
                      "rgb(236, 72, 153)",
                    ],
                    borderWidth: 2,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
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
                  {formatNumber(server.active_connections)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Servers Count
                </span>
                <span className="font-semibold">{stats.servers_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Online Users
                </span>
                <span className="font-semibold">{formatNumber(stats.online)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
