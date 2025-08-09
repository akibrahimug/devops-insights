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
import { ArrowLeft, Database, Cpu } from "@phosphor-icons/react";
import { useWebSocket } from "@/app/contexts/WebSocketContext";
import { useEffect, useState } from "react";
import {
  formatRegionName,
  formatNumber,
  getServerHealthStatus,
} from "@/lib/helpers/utils";
import { RegionDetailSkeleton } from "@/components/dashboard/Skeletons";

interface RegionData {
  serverStatus: string;
  serverIssue?: number;
  strictness: boolean;
  version: string;
  roles: string[];
  serversCount: number;
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
  const { metrics } = useWebSocket();
  const [region, setRegion] = useState<Region | null>(null);

  useEffect(() => {
    if (Object.keys(metrics).length > 0) {
      const regionKey = params.region as string;
      const raw: any = (metrics as any)[regionKey] || {};

      if (raw && raw.status) {
        const workersEntries: Array<[string, any]> = Array.isArray(
          raw?.results?.stats?.server?.workers
        )
          ? (raw.results.stats.server.workers as Array<[string, any]>)
          : Object.entries(raw?.results?.stats?.server?.workers || {});

        const data: RegionData = {
          serverStatus: String(raw.status || "unknown"),
          serverIssue:
            raw.server_issue != null
              ? Number.parseFloat(String(raw.server_issue)) || 0
              : 0,
          strictness: Boolean(raw.strict),
          version: String(raw.version || "-"),
          roles: Array.isArray(raw.roles) ? raw.roles : [],
          serversCount: Number(raw?.results?.stats?.servers_count ?? 0) || 0,
          online: Number(raw?.results?.stats?.online ?? 0) || 0,
          session: Number(raw?.results?.stats?.session ?? 0) || 0,
          cpuLoad: Number(raw?.results?.stats?.server?.cpu_load ?? 0) || 0,
          waitTime: Number(raw?.results?.stats?.server?.wait_time ?? 0) || 0,
          timers: Number(raw?.results?.stats?.server?.timers ?? 0) || 0,
          cpus: Number(raw?.results?.stats?.server?.cpus ?? 0) || 0,
          activeConnections:
            Number(raw?.results?.stats?.server?.active_connections ?? 0) || 0,
          services: {
            redis: Boolean(raw?.results?.services?.redis),
            database: Boolean(raw?.results?.services?.database),
          },

          workers: workersEntries,
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
    return <RegionDetailSkeleton />;
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
    </div>
  );
}
