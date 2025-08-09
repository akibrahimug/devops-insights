"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CircleIcon } from "@phosphor-icons/react";
import {
  formatNumber,
  getServerHealthStatus,
  getPerformanceRating,
} from "@/lib/helpers/utils";

interface Region {
  name: string;
  displayName: string;
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
  health: ReturnType<typeof getServerHealthStatus>;
  performance: ReturnType<typeof getPerformanceRating>;
}

interface RegionsCardProps {
  regions: Region[];
}

export function RegionsCard({ regions }: RegionsCardProps) {
  return (
    <Card className="animate-scale-in border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur pb-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          Regional Health Status
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Click on a region to see detailed metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regions.map((region, index) => (
            <Link href={`/regions/${region.name}`} key={region.name}>
              <div
                className={`flex items-center justify-between p-4 border rounded-xl transition-all duration-300 hover:scale-[1.01] hover-lift bg-white dark:border-gray-700 dark:bg-gray-900/40 animate-fade-in ${
                  region.health.borderColor
                } ${
                  region.serverIssue
                    ? "bg-red-50/40 dark:bg-red-900/10 border-red-300 dark:border-red-700"
                    : ""
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Left: dot + name + sessions */}
                <div className="flex items-center gap-4">
                  <CircleIcon
                    size={12}
                    weight="fill"
                    className={`${region.health.textColor} animate-pulse`}
                  />
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {region.displayName}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-400">
                      {formatNumber(region.results.stats.session)} sessions
                    </div>
                  </div>
                </div>

                {/* Right: latency + server status */}
                <div className="text-right">
                  <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {Number(region.results.stats.server.wait_time).toFixed(1)}ms
                  </div>
                  <div
                    className={`text-sm font-semibold ${region.health.textColor}`}
                  >
                    {region.serverStatus.toUpperCase()}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
