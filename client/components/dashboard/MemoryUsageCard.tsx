"use client";

/**
 * Component: MemoryUsageCard
 * Displays comprehensive memory usage metrics across regions with visual indicators
 * and comparative analysis for DevOps monitoring.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatPercentage } from "@/lib/helpers/utils";
import { HardDrives, Cpu, ChartLineUp, Eye } from "@phosphor-icons/react";
import { DetailedMetricsModal } from "@/components/modals/DetailedMetricsModal";

interface MemoryData {
  total: number; // GB
  used: number; // GB
  available: number; // GB
  usage_percent: number; // 0-100
}

interface RegionMemoryData {
  name: string;
  displayName: string;
  memory: MemoryData;
  status: string;
}

interface MemoryUsageCardProps {
  regions: RegionMemoryData[];
  className?: string;
}

export function MemoryUsageCard({ regions, className = "" }: MemoryUsageCardProps) {
  const [showModal, setShowModal] = useState(false);
  const totalMemoryAcrossRegions = regions.reduce((sum, region) => sum + region.memory.total, 0);
  const totalUsedMemory = regions.reduce((sum, region) => sum + region.memory.used, 0);
  const averageUsagePercent = regions.length > 0 
    ? regions.reduce((sum, region) => sum + region.memory.usage_percent, 0) / regions.length 
    : 0;

  const getMemoryStatusColor = (usagePercent: number) => {
    if (usagePercent >= 90) return "text-red-600 dark:text-red-400";
    if (usagePercent >= 75) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const getMemoryProgressColor = (usagePercent: number) => {
    if (usagePercent >= 90) return "bg-red-500";
    if (usagePercent >= 75) return "bg-amber-500";
    return "bg-green-500";
  };

  const currentData = {
    averageUsage: formatPercentage(averageUsagePercent),
    totalMemory: formatBytes(totalMemoryAcrossRegions * 1024 * 1024 * 1024),
    usedMemory: formatBytes(totalUsedMemory * 1024 * 1024 * 1024),
    availableMemory: formatBytes((totalMemoryAcrossRegions - totalUsedMemory) * 1024 * 1024 * 1024),
    cachedMemory: formatBytes(totalMemoryAcrossRegions * 0.08 * 1024 * 1024 * 1024), // Estimate 8% cached
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
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <HardDrives className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              Memory Usage Overview
            </div>
            <Eye className="h-5 w-5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simplified Global Summary */}
          <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800/60">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatBytes(totalMemoryAcrossRegions * 1024 * 1024 * 1024)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${getMemoryStatusColor(averageUsagePercent)}`}>
                  {formatPercentage(averageUsagePercent)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Usage</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {regions.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Regions</div>
              </div>
            </div>
          </div>

          {/* Simplified Regional Status */}
          <div className="space-y-2">
            {regions.slice(0, 3).map((region) => (
              <div key={region.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    region.status === 'ok' ? 'bg-green-500' : 
                    region.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {region.displayName}
                  </span>
                </div>
                <div className={`text-sm font-semibold ${getMemoryStatusColor(region.memory.usage_percent)}`}>
                  {formatPercentage(region.memory.usage_percent)}
                </div>
              </div>
            ))}
            {regions.length > 3 && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
                +{regions.length - 3} more regions
              </div>
            )}
          </div>

          {/* Memory Alert */}
          {regions.some(r => r.memory.usage_percent >= 90) && (
            <div className="mt-4 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/60 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <ChartLineUp className="h-3 w-3" />
                <span className="text-xs font-medium">
                  {regions.filter(r => r.memory.usage_percent >= 90).length} region(s) above 90%
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DetailedMetricsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Memory Usage"
        icon={<HardDrives className="h-6 w-6 text-purple-600 dark:text-purple-400" />}
        metricType="memory"
        regions={regions}
        currentData={currentData}
      />
    </>
  );
}