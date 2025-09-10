"use client";

/**
 * Component: DiskUsageCard
 * Displays comprehensive disk usage and I/O metrics across regions with 
 * storage analytics for DevOps monitoring.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatPercentage } from "@/lib/helpers/utils";
import { HardDrive, Database, TrendUp, TrendDown, Eye } from "@phosphor-icons/react";
import { DetailedMetricsModal } from "@/components/modals/DetailedMetricsModal";

interface DiskData {
  total: number; // GB
  used: number; // GB
  available: number; // GB
  usage_percent: number; // 0-100
  io_read: number; // MB/s
  io_write: number; // MB/s
}

interface RegionDiskData {
  name: string;
  displayName: string;
  disk: DiskData;
  status: string;
}

interface DiskUsageCardProps {
  regions: RegionDiskData[];
  className?: string;
}

export function DiskUsageCard({ regions, className = "" }: DiskUsageCardProps) {
  const [showModal, setShowModal] = useState(false);
  const totalDiskSpace = regions.reduce((sum, region) => sum + region.disk.total, 0);
  const totalUsedSpace = regions.reduce((sum, region) => sum + region.disk.used, 0);
  const averageUsagePercent = regions.length > 0 
    ? regions.reduce((sum, region) => sum + region.disk.usage_percent, 0) / regions.length 
    : 0;
  const totalReadIOPS = regions.reduce((sum, region) => sum + region.disk.io_read, 0);
  const totalWriteIOPS = regions.reduce((sum, region) => sum + region.disk.io_write, 0);

  const currentData = {
    averageUsage: formatPercentage(averageUsagePercent),
    totalStorage: formatBytes(totalDiskSpace * 1024 * 1024 * 1024),
    usedStorage: formatBytes(totalUsedSpace * 1024 * 1024 * 1024),
    readIO: `${totalReadIOPS.toFixed(1)} MB/s`,
    writeIO: `${totalWriteIOPS.toFixed(1)} MB/s`
  };

  const getDiskStatusColor = (usagePercent: number) => {
    if (usagePercent >= 85) return "text-red-600 dark:text-red-400";
    if (usagePercent >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const getDiskProgressColor = (usagePercent: number) => {
    if (usagePercent >= 85) return "bg-red-500";
    if (usagePercent >= 70) return "bg-amber-500";
    return "bg-green-500";
  };

  const getIOStatusColor = (ioValue: number) => {
    if (ioValue >= 100) return "text-red-600 dark:text-red-400";
    if (ioValue >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
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
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                <HardDrive className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Storage & I/O Overview
            </div>
            <Eye className="h-5 w-5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simplified Global Summary */}
          <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800/60">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatBytes(totalDiskSpace * 1024 * 1024 * 1024)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${getDiskStatusColor(averageUsagePercent)}`}>
                  {formatPercentage(averageUsagePercent)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Usage</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${getIOStatusColor(totalReadIOPS)}`}>
                  {totalReadIOPS.toFixed(0)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Read MB/s</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${getIOStatusColor(totalWriteIOPS)}`}>
                  {totalWriteIOPS.toFixed(0)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Write MB/s</div>
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
                <div className="flex items-center gap-3">
                  <div className={`text-xs font-semibold ${getDiskStatusColor(region.disk.usage_percent)}`}>
                    {formatPercentage(region.disk.usage_percent)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {region.disk.available.toFixed(0)}GB free
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

          {/* Storage Alerts */}
          {(regions.some(r => r.disk.usage_percent >= 85) || regions.some(r => r.disk.io_read >= 80 || r.disk.io_write >= 80)) && (
            <div className="mt-4 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Database className="h-3 w-3" />
                <span className="text-xs font-medium">
                  Storage issues detected in {regions.filter(r => r.disk.usage_percent >= 85 || r.disk.io_read >= 80 || r.disk.io_write >= 80).length} region(s)
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DetailedMetricsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Storage & I/O"
        icon={<HardDrive className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />}
        metricType="disk"
        regions={regions}
        currentData={currentData}
      />
    </>
  );
}