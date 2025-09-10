"use client";

/**
 * Component: PerformanceAnalyticsCard
 * Displays comprehensive performance analytics including response times,
 * error rates, throughput, and uptime metrics for DevOps monitoring.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatPercentage } from "@/lib/helpers/utils";
import {
  Lightning,
  TrendUp,
  ChartLineUp,
  CheckCircle,
  Eye,
} from "@phosphor-icons/react";
import { DetailedMetricsModal } from "@/components/modals/DetailedMetricsModal";

interface PerformanceData {
  response_times: {
    p50: number; // ms
    p95: number; // ms
    p99: number; // ms
  };
  error_rate: number; // 0-100
  requests_per_second: number;
  uptime_percent: number; // 0-100
}

interface RegionPerformanceData {
  name: string;
  displayName: string;
  performance: PerformanceData;
  status: string;
}

interface PerformanceAnalyticsCardProps {
  regions: RegionPerformanceData[];
  className?: string;
}

export function PerformanceAnalyticsCard({
  regions,
  className = "",
}: PerformanceAnalyticsCardProps) {
  const [showModal, setShowModal] = useState(false);
  const averageP95ResponseTime =
    regions.length > 0
      ? regions.reduce(
          (sum, region) => sum + region.performance.response_times.p95,
          0
        ) / regions.length
      : 0;
  const averageErrorRate =
    regions.length > 0
      ? regions.reduce(
          (sum, region) => sum + region.performance.error_rate,
          0
        ) / regions.length
      : 0;
  const totalRequestsPerSecond = regions.reduce(
    (sum, region) => sum + region.performance.requests_per_second,
    0
  );
  const averageUptime =
    regions.length > 0
      ? regions.reduce(
          (sum, region) => sum + region.performance.uptime_percent,
          0
        ) / regions.length
      : 0;

  const getResponseTimeColor = (p95: number) => {
    if (p95 >= 1000) return "text-red-600 dark:text-red-400";
    if (p95 >= 500) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const getErrorRateColor = (errorRate: number) => {
    if (errorRate >= 5) return "text-red-600 dark:text-red-400";
    if (errorRate >= 1) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime < 99) return "text-red-600 dark:text-red-400";
    if (uptime < 99.9) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const formatResponseTime = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${ms.toFixed(0)}ms`;
  };

  const currentData = {
    uptime: formatPercentage(averageUptime),
    p95ResponseTime: formatResponseTime(averageP95ResponseTime),
    totalRPS: totalRequestsPerSecond.toFixed(0),
    errorRate: formatPercentage(averageErrorRate),
    apdex: "0.94", // Mock Apdex score
  };

  return (
    <>
      <Card
        className={`animate-scale-in border-0 shadow dark:bg-gray-800/50 backdrop-blur cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] ${className}`}
        onClick={() => setShowModal(true)}
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <Lightning className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              Performance Analytics Overview
            </div>
            <Eye className="h-5 w-5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simplified Global Summary */}
          <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div
                  className={`text-lg font-bold ${getResponseTimeColor(
                    averageP95ResponseTime
                  )}`}
                >
                  {formatResponseTime(averageP95ResponseTime)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Response
                </div>
              </div>
              <div>
                <div
                  className={`text-lg font-bold ${getErrorRateColor(
                    averageErrorRate
                  )}`}
                >
                  {formatPercentage(averageErrorRate)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Errors
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {totalRequestsPerSecond.toFixed(0)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  RPS
                </div>
              </div>
              <div>
                <div
                  className={`text-lg font-bold ${getUptimeColor(
                    averageUptime
                  )}`}
                >
                  {formatPercentage(averageUptime)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Uptime
                </div>
              </div>
            </div>
          </div>

          {/* Simplified Regional Status */}
          <div className="space-y-2">
            {regions.slice(0, 3).map((region) => (
              <div
                key={region.name}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      region.status === "ok"
                        ? "bg-green-500"
                        : region.status === "error"
                        ? "bg-red-500"
                        : "bg-amber-500"
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {region.displayName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`text-xs font-semibold ${getResponseTimeColor(
                      region.performance.response_times.p95
                    )}`}
                  >
                    {formatResponseTime(region.performance.response_times.p95)}
                  </div>
                  <div
                    className={`text-xs font-semibold ${getUptimeColor(
                      region.performance.uptime_percent
                    )}`}
                  >
                    {formatPercentage(region.performance.uptime_percent)}
                  </div>
                </div>
              </div>
            ))}
            {regions.length > 3 && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
                +{regions.length - 3} more regions
              </div>
            )}
          </div>

          {/* Performance Alerts */}
          {(regions.some((r) => r.performance.response_times.p95 >= 1000) ||
            regions.some((r) => r.performance.error_rate >= 5)) && (
            <div className="mt-4 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Lightning className="h-3 w-3" />
                <span className="text-xs font-medium">
                  Performance issues detected in{" "}
                  {
                    regions.filter(
                      (r) =>
                        r.performance.response_times.p95 >= 1000 ||
                        r.performance.error_rate >= 5
                    ).length
                  }{" "}
                  region(s)
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DetailedMetricsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Performance Analytics"
        icon={
          <Lightning className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        }
        metricType="performance"
        regions={regions}
        currentData={currentData}
      />
    </>
  );
}
