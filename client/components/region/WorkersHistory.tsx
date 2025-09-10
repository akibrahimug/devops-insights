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

const getWorkerColors = (workerIndex: number): Record<MetricKey, string> => {
  const colorPalettes = [
    // Palette 1 - Green/Blue theme
    {
      idle: "#10b981",
      time_to_return: "#06b6d4",
      wait_time: "#3b82f6",
      waiting: "#8b5cf6",
      workers: "#22c55e",
    },
    // Palette 2 - Purple/Pink theme
    {
      idle: "#a855f7",
      time_to_return: "#ec4899",
      wait_time: "#f97316",
      waiting: "#eab308",
      workers: "#84cc16",
    },
    // Palette 3 - Orange/Red theme
    {
      idle: "#f97316",
      time_to_return: "#ef4444",
      wait_time: "#dc2626",
      waiting: "#991b1b",
      workers: "#f59e0b",
    },
    // Palette 4 - Teal/Indigo theme
    {
      idle: "#0d9488",
      time_to_return: "#6366f1",
      wait_time: "#4f46e5",
      waiting: "#7c3aed",
      workers: "#059669",
    },
    // Palette 5 - Rose/Emerald theme
    {
      idle: "#f43f5e",
      time_to_return: "#e11d48",
      wait_time: "#be123c",
      waiting: "#9f1239",
      workers: "#10b981",
    },
  ];
  
  return colorPalettes[workerIndex % colorPalettes.length];
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

  // Only use worker names that have actual meaningful data
  const workersWithData = new Set<string>();
  
  history.forEach((h) => {
    const w = (h.data as any)?.results?.stats?.server?.workers;
    if (!w) return;
    
    let entries: WorkerEntry[] = [];
    if (Array.isArray(w)) {
      entries = (w as any[])
        .map((entry: any) =>
          Array.isArray(entry)
            ? ([String(entry[0]), entry[1]] as WorkerEntry)
            : ([String(entry?.name ?? ""), entry] as WorkerEntry)
        )
        .filter(([name]) => !!name);
    } else if (typeof w === "object") {
      entries = Object.entries(w as Record<string, any>);
    }
    
    entries.forEach(([name, data]) => {
      // Only include workers that have non-zero metrics
      const idle = Number((data as any)?.idle ?? 0);
      const ttr = Number((data as any)?.time_to_return ?? 0);
      const wait = Number((data as any)?.wait_time ?? 0);
      const waiting = Number((data as any)?.waiting ?? 0);
      const count = Number((data as any)?.workers ?? 0);
      
      if (idle > 0 || ttr > 0 || wait > 0 || waiting > 0 || count > 0) {
        workersWithData.add(String(name));
      }
    });
  });
  
  const workerNames = Array.from(workersWithData).sort();

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

    const workerColors = getWorkerColors(index);

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
        className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800"
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
            <div className="flex justify-center">
              <div className="relative">
                <MetricChart
                  type="doughnut"
                  height={200}
                  width={200}
                  data={{
                    labels: metricKeys.map((mk) => mk.replace(/_/g, " ")),
                    datasets: [
                      {
                        data: metricKeys.map((mk) => {
                          const bucketMap = metricMap?.get(mk) || new Map<number, number>();
                          const totalValue = Array.from(bucketMap.values()).reduce((sum, v) => sum + v, 0);
                          return totalValue || 0;
                        }),
                        backgroundColor: metricKeys.map((mk) => workerColors[mk] + "80"),
                        borderWidth: 0,
                      },
                    ],
                  }}
                  options={{
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: true,
                        callbacks: {
                          title: function(context) {
                            return context[0].label;
                          },
                          label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                            return `${context.label}: ${value} (${percentage}%)`;
                          },
                        },
                      },
                    },
                    maintainAspectRatio: false,
                    cutout: "60%",
                    elements: {
                      arc: {
                        borderWidth: 0,
                        hoverBorderWidth: 2,
                        hoverBorderColor: 'white',
                      },
                    },
                    scales: {
                      x: {
                        display: false,
                      },
                      y: {
                        display: false,
                      },
                    },
                    interaction: {
                      intersect: false,
                      mode: 'nearest',
                    },
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                      {metricKeys.reduce((sum, mk) => {
                        const bucketMap = metricMap?.get(mk) || new Map<number, number>();
                        const totalValue = Array.from(bucketMap.values()).reduce((s, v) => s + v, 0);
                        return sum + totalValue;
                      }, 0).toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                  </div>
                </div>
              </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {workerNames.map((w, i) => renderWorker(w, i))}
        </div>
      </CardContent>
    </Card>
  );
}
