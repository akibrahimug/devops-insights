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
import { getServerHealthStatus } from "@/lib/helpers/utils";

interface Region {
  name: string;
  displayName: string;
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
  health: ReturnType<typeof getServerHealthStatus>;
}

interface RegionsCardProps {
  regions: Region[];
}

export function RegionsCard({ regions }: RegionsCardProps) {
  const ordered = [...regions].sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );
  return (
    <Card className="animate-scale-in border-0 shadow dark:bg-gray-800/50 backdrop-blur pb-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          Region statistics
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Click on a region to see detailed metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ordered.map((region, index) => (
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
                {/* Left: dot + name + version */}
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
                    <div className="text-sm text-gray-400 dark:text-gray-400">
                      Version: {region.version}
                    </div>
                  </div>
                </div>

                {/* Right: roles + server status */}
                <div className="text-right space-y-1">
                  <div className="flex flex-col gap-1 items-end">
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400 font-light">
                        Roles:
                      </span>{" "}
                      <span className="text-gray-900 dark:text-gray-100 font-semibold">
                        {(region.roles || []).join(", ") || "-"}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400 font-light">
                        Strict:
                      </span>{" "}
                      <span className="text-gray-900 dark:text-gray-100 font-semibold">
                        {region.strictness ? "true" : "false"}
                      </span>
                    </div>
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
