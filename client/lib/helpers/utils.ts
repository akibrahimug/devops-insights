// Utilities for formatting, thresholds, and chart helpers across the app.

/**
 * Capitalize first letter of each word
 */
export function capitalizeWords(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Format region name (e.g., "us-east-1" -> "US East 1")
 */
export function formatRegionName(region: string): string {
  return region
    .split("-")
    .map((part, index) => {
      if (index === 0) return part.toUpperCase();
      if (!isNaN(Number(part))) return part;
      return capitalizeWords(part);
    })
    .join(" ");
}

/**
 * Remove hyphens and format string
 */
export function removeHyphens(str: string): string {
  return str.replace(/-/g, " ");
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return num?.toLocaleString() || "0";
}

/**
 * Format number in compact form (e.g., 12k, 3.4m)
 */
/** Compact number format (e.g., 12k, 3.4m). */
export function formatCompactNumber(
  num: number,
  maximumFractionDigits: number = 1
): string {
  if (num == null || isNaN(num as any)) return "0";
  const formatted = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits,
  }).format(num);
  return formatted.toLowerCase();
}

/**
 * Format percentage with specified decimals
 */
/** Format a percentage with fixed decimals. */
export function formatPercentage(
  value: number | string,
  decimals: number = 2
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num?.toFixed(decimals) || "0"}%`;
}

/**
 * Format bytes to human readable format
 */
/** Human readable bytes formatter. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format timestamp to relative time
 */
/** Relative time formatter (e.g., 5m ago). */
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Get health status based on multiple metrics
 */
/** Health status mapping used by region status components. */
export interface HealthStatus {
  codename: string;
  status: "healthy" | "warning" | "critical" | "amber";
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

/**
 * Get health status based on server status from API
 */
/** Map server status to a health status object. */
export function getServerHealthStatus(serverStatus: string): HealthStatus {
  // If server status is "ok", check error rate for amber status
  if (serverStatus === "ok") {
    if (serverStatus !== "ok" && serverStatus !== "critical") {
      return {
        codename: serverStatus,
        status: "amber",
        color: "amber",
        bgColor: "bg-amber-500 dark:bg-amber-600",
        textColor: "text-amber-600 dark:text-amber-400",
        borderColor: "border-amber-500",
      };
    }
    return {
      codename: serverStatus,
      status: "healthy",
      color: "green",
      bgColor: "bg-green-500 dark:bg-green-600",
      textColor: "text-green-600 dark:text-green-400",
      borderColor: "border-green-500",
    };
  }

  // If server status is not "ok", it's critical
  return {
    codename: serverStatus,
    status: "critical",
    color: "red",
    bgColor: "bg-red-500 dark:bg-red-600",
    textColor: "text-red-600 dark:text-red-400",
    borderColor: "border-red-500",
  };
}

/**
 * Get color based on metric value and thresholds
 */
/** Return a Tailwind text color based on thresholds. */
export function getMetricColor(
  value: number,
  thresholds: { good: number; warning: number; critical: number },
  inverse: boolean = false
): string {
  if (inverse) {
    if (value <= thresholds.good) return "text-green-600 dark:text-green-400";
    if (value <= thresholds.warning)
      return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  } else {
    if (value >= thresholds.critical) return "text-red-600 dark:text-red-400";
    if (value >= thresholds.warning)
      return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  }
}

/**
 * Get gradient color for charts based on metric type
 */
/** Chart color presets for common metric types. */
export function getChartColor(metricType: string): {
  border: string;
  background: string;
} {
  const colors = {
    latency: {
      border: "rgb(59, 130, 246)",
      background: "rgba(59, 130, 246, 0.1)",
    },
    throughput: {
      border: "rgb(34, 197, 94)",
      background: "rgba(34, 197, 94, 0.1)",
    },
    errorRate: {
      border: "rgb(239, 68, 68)",
      background: "rgba(239, 68, 68, 0.1)",
    },
    cpu: { border: "rgb(168, 85, 247)", background: "rgba(168, 85, 247, 0.1)" },
    memory: {
      border: "rgb(236, 72, 153)",
      background: "rgba(236, 72, 153, 0.1)",
    },
    disk: {
      border: "rgb(251, 146, 60)",
      background: "rgba(251, 146, 60, 0.1)",
    },
    connections: {
      border: "rgb(20, 184, 166)",
      background: "rgba(20, 184, 166, 0.1)",
    },
    sessions: {
      border: "rgb(147, 51, 234)",
      background: "rgba(147, 51, 234, 0.1)",
    },
  };

  return colors[metricType as keyof typeof colors] || colors.throughput;
}

/**
 * Parse error rate string to number
 */
/** Parse error rate from string or number to number. */
export function parseErrorRate(errorRate: string | number): number {
  return typeof errorRate === "string" ? parseFloat(errorRate) : errorRate;
}

/**
 * Get performance rating
 */
/** Heuristic performance rating from latency and throughput. */
export function getPerformanceRating(
  latency: number,
  throughput: number
): { rating: string; color: string } {
  const score = throughput / 100 - latency / 50;

  if (score > 8) return { rating: "Excellent", color: "text-green-600" };
  if (score > 5) return { rating: "Good", color: "text-blue-600" };
  if (score > 2) return { rating: "Fair", color: "text-yellow-600" };
  return { rating: "Poor", color: "text-red-600" };
}

/**
 * Format uptime from timestamp
 */
/** Format an uptime duration from a start timestamp. */
export function formatUptime(timestamp: string): string {
  const startTime = new Date(timestamp);
  const now = new Date();
  const uptimeMs = now.getTime() - startTime.getTime();

  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Format a time label for charts based on selected history range
 */
// Common time-range keys used across history and charts
export type RangeKey = "1m" | "5m" | "1h" | "5h" | "1d" | "1w";

// Centralized map for window and bucket sizes per range
export const RANGE_MS = {
  "1m": { windowMs: 60_000, bucketMs: 5_000 },
  "5m": { windowMs: 5 * 60_000, bucketMs: 30_000 },
  "1h": { windowMs: 60 * 60_000, bucketMs: 60_000 },
  "5h": { windowMs: 5 * 60 * 60_000, bucketMs: 5 * 60_000 },
  "1d": { windowMs: 24 * 60 * 60_000, bucketMs: 15 * 60_000 },
  "1w": { windowMs: 7 * 24 * 60 * 60_000, bucketMs: 60 * 60_000 },
} as const satisfies Record<RangeKey, { windowMs: number; bucketMs: number }>;

/** Milliseconds for a full history window for a given range. */
export const windowMsForRange = (key: RangeKey) => RANGE_MS[key].windowMs;
/** Milliseconds for a single aggregation bucket for a given range. */
export const bucketMsForRange = (key: RangeKey) => RANGE_MS[key].bucketMs;

/** Time label formatting aligned with the chosen history range. */
export function formatTimeLabelForRange(
  dateLike: string | number | Date,
  range: RangeKey
): string {
  const d = new Date(dateLike);
  const base: Intl.DateTimeFormatOptions = {
    hour12: false,
  };
  let opts: Intl.DateTimeFormatOptions = {};
  switch (range) {
    case "1m":
    case "5m":
      opts = { ...base, hour: "2-digit", minute: "2-digit", second: "2-digit" };
      break;
    case "1h":
    case "5h":
      opts = { ...base, hour: "2-digit", minute: "2-digit" };
      break;
    case "1d":
      opts = { ...base, weekday: "short", hour: "2-digit", minute: "2-digit" };
      break;
    case "1w":
      opts = {
        ...base,
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      break;
  }
  return new Intl.DateTimeFormat(undefined, opts).format(d);
}

/**
 * Calculate trend based on current and previous values
 */
/** Percentage trend and direction between two values. */
export function calculateTrend(
  current: number,
  previous: number
): { value: number; direction: "up" | "down" | "stable" } {
  if (!previous || previous === 0) return { value: 0, direction: "stable" };

  const change = ((current - previous) / previous) * 100;
  const direction = change > 0.5 ? "up" : change < -0.5 ? "down" : "stable";

  return { value: Math.abs(change), direction };
}

// Re-export history helpers so consumers can import from a single module
export * from "./history";
