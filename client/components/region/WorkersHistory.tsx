"use client";

/**
 * Component: WorkersHistory
 * I visualize historical worker metrics over a selected time range. I aggregate
 * incoming history into fixed buckets per worker and render small charts for
 * idle, time to return, wait time, waiting, and worker count.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricChart } from "@/components/charts/MetricChart";
import { GearSix } from "@phosphor-icons/react";
import {
  bucketMsForRange,
  formatTimeLabelForRange,
  RangeKey,
} from "@/lib/helpers/utils";
import { HistoryItem } from "@/lib/helpers/history";

type WorkerEntry = [string, any];

interface WorkersHistoryProps {
  range: RangeKey;
  history: HistoryItem[];
  workers: WorkerEntry[];
}

type MetricKey =
  | "idle"
  | "time_to_return"
  | "wait_time"
  | "waiting"
  | "workers";

const metricColors: Record<MetricKey, string> = {
  idle: "rgb(16, 185, 129)", // green
  time_to_return: "rgb(168, 85, 247)", // purple
  wait_time: "rgb(59, 130, 246)", // blue
  waiting: "rgb(245, 158, 11)", // amber
  workers: "rgb(34, 197, 94)", // emerald
};

export function WorkersHistory({
  range,
  history,
  workers,
}: WorkersHistoryProps) {
  const bucketMs = bucketMsForRange(range);

  // Build a full bucket timeline across the selected window based on incoming history.
  const timestamps = history.map((h) => new Date(h.createdAt).getTime());
  const minTs = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
  const maxTs = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
  const startBucket = Math.floor(minTs / bucketMs) * bucketMs;
  const endBucket = Math.floor(maxTs / bucketMs) * bucketMs;
  const buckets: number[] = [];
  for (let b = startBucket; b <= endBucket; b += bucketMs) buckets.push(b);

  // Collect the union of worker names from props and history.
  const workerNamesFromProp = workers.map(([name]) => String(name));
  const workerNamesFromHistory = Array.from(
    new Set(
      history.flatMap((h) => {
        const w = (h.data as any)?.results?.stats?.server?.workers;
        if (!w) return [] as string[];
        if (Array.isArray(w)) {
          return (w as any[])
            .map((entry: any) => String(entry?.[0] ?? ""))
            .filter(Boolean);
        }
        return Object.keys(w as Record<string, any>);
      })
    )
  );
  const workerNames = Array.from(
    new Set([...workerNamesFromProp, ...workerNamesFromHistory])
  ).sort();

  // Prepare data structure: worker -> metric -> bucket -> sum
  const workerMetricBucket = new Map<
    string,
    Map<MetricKey, Map<number, number>>
  >();

  /**
   * I ensure nested maps exist for a given worker and metric, returning the bucket map.
   */
  const ensureMaps = (worker: string, metric: MetricKey) => {
    let metricMap = workerMetricBucket.get(worker);
    if (!metricMap) {
      metricMap = new Map();
      workerMetricBucket.set(worker, metricMap);
    }
    let bucketMap = metricMap.get(metric);
    if (!bucketMap) {
      bucketMap = new Map();
      metricMap.set(metric, bucketMap);
    }
    return bucketMap;
  };

  // Aggregate history per worker and metric. Supports both array and object
  // forms of workers in the payload; everything is normalized to tuples.
  for (const it of history) {
    const ts = new Date(it.createdAt).getTime();
    const bucket = Math.floor(ts / bucketMs) * bucketMs;
    const w = (it.data as any)?.results?.stats?.server?.workers;
    let entries: WorkerEntry[] = [];
    if (Array.isArray(w)) {
      // Array form: [[name, data], ...] or [{name, ...}] — normalize to tuples
      entries = (w as any[])
        .map((entry: any) =>
          Array.isArray(entry)
            ? ([String(entry[0]), entry[1]] as WorkerEntry)
            : ([String(entry?.name ?? ""), entry] as WorkerEntry)
        )
        .filter(([name]) => !!name) as WorkerEntry[];
    } else if (w && typeof w === "object") {
      entries = Object.entries(w as Record<string, any>);
    }
    for (const [name, data] of entries) {
      const worker = String(name);
      const idle = Number((data as any)?.idle ?? 0);
      const ttr = Number((data as any)?.time_to_return ?? 0);
      const wait = Number((data as any)?.wait_time ?? 0);
      const waiting = Number((data as any)?.waiting ?? 0);
      const count = Number((data as any)?.workers ?? 0);

      const bIdle = ensureMaps(worker, "idle");
      bIdle.set(bucket, (bIdle.get(bucket) || 0) + idle);
      const bTtr = ensureMaps(worker, "time_to_return");
      bTtr.set(bucket, (bTtr.get(bucket) || 0) + ttr);
      const bWait = ensureMaps(worker, "wait_time");
      bWait.set(bucket, (bWait.get(bucket) || 0) + wait);
      const bWaiting = ensureMaps(worker, "waiting");
      bWaiting.set(bucket, (bWaiting.get(bucket) || 0) + waiting);
      const bWorkers = ensureMaps(worker, "workers");
      bWorkers.set(bucket, (bWorkers.get(bucket) || 0) + count);
    }
  }

  const renderWorker = (worker: string, index: number) => {
    const metricKeys: MetricKey[] = [
      "idle",
      "time_to_return",
      "wait_time",
      "waiting",
      "workers",
    ];

    // Determine if this worker has any data across any metric to avoid empty charts.
    const metricMap = workerMetricBucket.get(worker);
    const hasAnyData =
      !!metricMap &&
      ["idle", "time_to_return", "wait_time", "waiting", "workers"].some(
        (key) => {
          const bm = metricMap.get(key as MetricKey);
          return bm
            ? Array.from(bm.values()).some((v) => Number(v) > 0)
            : false;
        }
      );

    return (
      <Card
        key={worker}
        className="border rounded-lg transition-shadow hover:shadow-md dark:bg-gray-800/50 backdrop-blur"
      >
        <CardHeader className="py-2">
          <CardTitle className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
            <GearSix
              className="h-6 w-6"
              style={{ color: `hsl(${(index * 47) % 360} 70% 50%)` }}
            />
            {worker}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAnyData ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              No history for this worker in the selected range
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {metricKeys.map((mk) => {
                const bucketMap =
                  metricMap?.get(mk) || new Map<number, number>();
                const labels = buckets.map((b) =>
                  formatTimeLabelForRange(new Date(b).toISOString(), range)
                );
                const values = buckets.map((b) => {
                  const v = bucketMap.get(b);
                  // Avoid rendering fake flat lines for entirely missing data
                  return typeof v === "number" ? v : NaN;
                });
                const title = mk.replace(/_/g, " ");
                const hasSeries = values.some(
                  (v) => Number.isFinite(v) && v !== 0
                );
                if (!hasSeries) {
                  return (
                    <div
                      key={mk}
                      className="px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-md shadow hover:shadow-lg transition-shadow hover:bg-gray-50 dark:hover:bg-gray-900/30"
                    >
                      <div className="flex items-center justify-center h-[120px] text-[11px] text-gray-500 dark:text-gray-400">
                        No data
                      </div>
                      <div className="mt-1 text-xs font-semibold text-gray-700 dark:text-gray-300 text-center capitalize">
                        {title}
                      </div>
                    </div>
                  );
                }
                const color = metricColors[mk];
                const lightColor = color
                  .replace("rgb", "rgba")
                  .replace(")", ", 0.6)");
                return (
                  <div
                    key={mk}
                    className="px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-md shadow hover:shadow-lg transition-shadow hover:bg-gray-50 dark:hover:bg-gray-900/30"
                  >
                    <MetricChart
                      type="bar"
                      height={130}
                      data={{
                        labels,
                        datasets: [
                          {
                            label: title,
                            data: values,
                            backgroundColor: lightColor,
                            borderColor: color,
                            borderWidth: 1,
                            borderRadius: 3,
                          },
                        ],
                      }}
                      options={{
                        plugins: {
                          legend: { display: false },
                        },
                        interaction: { mode: "nearest", intersect: true },
                        scales: {
                          x: {
                            grid: { display: false },
                            border: { display: false },
                            ticks: { display: false },
                          },
                          y: {
                            grid: { display: false },
                            border: { display: false },
                            ticks: { display: false },
                          },
                        },
                      }}
                    />
                    <div className="mt-1 text-xs font-semibold text-gray-700 dark:text-gray-300 text-center capitalize">
                      {title}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="border-0 shadow-lg dark:bg-gray-800/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">
          Workers history
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {workerNames.map((w, i) => renderWorker(w, i))}
        </div>
      </CardContent>
    </Card>
  );
}
