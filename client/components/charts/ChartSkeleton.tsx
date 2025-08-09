"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ChartSkeleton({ title = "Loading Chart", description = "Preparing data…", height = 300 }: { title?: string; description?: string; height?: number }) {
  return (
    <Card className="border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">
          <Skeleton className="h-5 w-48" />
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          <Skeleton className="h-4 w-64" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ height }}>
          <div className="absolute inset-0 grid grid-rows-6 grid-cols-6">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className="border border-dashed border-gray-200/60 dark:border-gray-700/50" />
            ))}
          </div>
          <div className="absolute inset-4 flex items-end gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="w-6 h-1/2" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}