"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ChartCardSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card className="border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-5 w-40" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full rounded-md`} style={{ height }} />
      </CardContent>
    </Card>
  );
}

export function RegionsCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Card className="border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur pb-3">
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-56" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 border rounded-xl dark:border-gray-700 dark:bg-gray-900/40"
            >
              <div className="flex items-center gap-4 w-full">
                <Skeleton className="h-3 w-3 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-5 w-16 ml-auto" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsGridSkeleton({
  items = 4,
  cols = "grid-cols-2 md:grid-cols-4 lg:grid-cols-4",
}: {
  items?: number;
  cols?: string;
}) {
  return (
    <div className={`grid ${cols} gap-4 mb-6`}>
      {Array.from({ length: items }).map((_, i) => (
        <Card key={i} className="border-0 shadow-lg dark:bg-gray-800/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            <Skeleton className="h-6 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-8 w-36" />
          </div>
        </header>

        <RegionsCardSkeleton />

        <StatsGridSkeleton items={4} />

        <StatsGridSkeleton
          items={6}
          cols="grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ChartCardSkeleton height={300} />
          <ChartCardSkeleton height={300} />
        </div>

        <ChartCardSkeleton height={260} />
      </div>
    </div>
  );
}

export function RegionDetailSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-5 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCardSkeleton height={260} />
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-5 w-32" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-5 w-24" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCardSkeleton height={260} />
        <ChartCardSkeleton height={260} />
      </div>
    </div>
  );
}
