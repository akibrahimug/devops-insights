"use client";

/**
 * Component: ServicesCard
 * Shows operational status for Database and Redis services.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Database as DatabaseIcon } from "@phosphor-icons/react";

interface ServicesCardProps {
  databaseUp: boolean;
  redisUp: boolean;
  className?: string;
}

export function ServicesCard({
  databaseUp,
  redisUp,
  className = "",
}: ServicesCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
          <DatabaseIcon className="h-8 w-8 md:h-9 md:w-9 text-indigo-500" />
          Services
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between ">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Database
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  databaseUp ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span
                className={`text-sm font-semibold ${
                  databaseUp ? "text-green-600" : "text-red-600"
                }`}
              >
                {databaseUp ? "Operational" : "Down"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Redis
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  redisUp ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span
                className={`text-sm font-semibold ${
                  redisUp ? "text-green-600" : "text-red-600"
                }`}
              >
                {redisUp ? "Operational" : "Down"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
