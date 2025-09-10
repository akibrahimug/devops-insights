"use client";

/**
 * Component: NetworkPerformanceCard
 * Displays comprehensive network performance metrics including bandwidth,
 * latency, and packet loss across regions for DevOps monitoring.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatPercentage } from "@/lib/helpers/utils";
import { WifiHigh, Lightning, Warning, Globe, Eye } from "@phosphor-icons/react";
import { DetailedMetricsModal } from "@/components/modals/DetailedMetricsModal";

interface NetworkData {
  bandwidth_in?: number; // Mbps
  bandwidth_out?: number; // Mbps
  latency?: number; // ms
  packet_loss?: number; // %
}

interface RegionNetworkData {
  name: string;
  displayName: string;
  network?: NetworkData;
  status: string;
}

interface NetworkPerformanceCardProps {
  regions: RegionNetworkData[];
  className?: string;
}

export function NetworkPerformanceCard({ regions, className = "" }: NetworkPerformanceCardProps) {
  const [showModal, setShowModal] = useState(false);
  const totalBandwidthIn = regions.reduce((sum, region) => sum + (region.network?.bandwidth_in || 0), 0);
  const totalBandwidthOut = regions.reduce((sum, region) => sum + (region.network?.bandwidth_out || 0), 0);
  const averageLatency = regions.length > 0 
    ? regions.reduce((sum, region) => sum + (region.network?.latency || 0), 0) / regions.length 
    : 0;
  const averagePacketLoss = regions.length > 0 
    ? regions.reduce((sum, region) => sum + (region.network?.packet_loss || 0), 0) / regions.length 
    : 0;

  const getLatencyColor = (latency: number) => {
    if (latency >= 200) return "text-red-600 dark:text-red-400";
    if (latency >= 100) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const getPacketLossColor = (packetLoss: number) => {
    if (packetLoss >= 2) return "text-red-600 dark:text-red-400";
    if (packetLoss >= 0.5) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const getBandwidthColor = (bandwidth: number, maxBandwidth: number = 1500) => {
    const utilization = (bandwidth / maxBandwidth) * 100;
    if (utilization >= 80) return "text-red-600 dark:text-red-400";
    if (utilization >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const formatBandwidth = (mbps: number) => {
    if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} Gbps`;
    return `${mbps.toFixed(0)} Mbps`;
  };

  const currentData = {
    avgLatency: `${averageLatency.toFixed(0)}ms`,
    totalBandwidthIn: formatBandwidth(totalBandwidthIn),
    totalBandwidthOut: formatBandwidth(totalBandwidthOut),
    packetLoss: formatPercentage(averagePacketLoss),
    jitter: "2.1ms" // Mock value
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
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/40">
                <WifiHigh className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              Network Performance Overview
            </div>
            <Eye className="h-5 w-5 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simplified Global Summary */}
          <div className="mb-4 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800/60">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatBandwidth(totalBandwidthIn)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">In</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatBandwidth(totalBandwidthOut)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Out</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${getLatencyColor(averageLatency)}`}>
                  {averageLatency.toFixed(0)}ms
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Latency</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${getPacketLossColor(averagePacketLoss)}`}>
                  {formatPercentage(averagePacketLoss)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Loss</div>
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
                  <div className={`text-xs font-semibold ${getLatencyColor(region.network?.latency || 0)}`}>
                    {(region.network?.latency || 0).toFixed(0)}ms
                  </div>
                  {(region.network?.packet_loss || 0) > 0.5 && (
                    <div className={`text-xs font-semibold ${getPacketLossColor(region.network?.packet_loss || 0)}`}>
                      {formatPercentage(region.network?.packet_loss || 0)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {regions.length > 3 && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
                +{regions.length - 3} more regions
              </div>
            )}
          </div>

          {/* Network Alerts */}
          {(regions.some(r => (r.network?.latency || 0) >= 200) || regions.some(r => (r.network?.packet_loss || 0) >= 1)) && (
            <div className="mt-4 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Warning className="h-3 w-3" />
                <span className="text-xs font-medium">
                  Network issues detected in {regions.filter(r => (r.network?.latency || 0) >= 200 || (r.network?.packet_loss || 0) >= 1).length} region(s)
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DetailedMetricsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Network Performance"
        icon={<WifiHigh className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />}
        metricType="network"
        regions={regions}
        currentData={currentData}
      />
    </>
  );
}