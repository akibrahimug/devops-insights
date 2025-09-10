"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrives, HardDrive, WifiHigh, Lightning, ShieldCheck, Rocket, Bell } from "@phosphor-icons/react";
import { RangeKey } from "@/lib/helpers/utils";
import { MetricChart } from "@/components/charts/MetricChart";

interface HistoricalDevOpsSectionProps {
  mode: "latest" | "history";
  range: RangeKey;
  regionName: string;
}

export function HistoricalDevOpsSection({ mode, range, regionName }: HistoricalDevOpsSectionProps) {
  if (mode !== "history") return null;

  // Generate mock historical data points
  const generateHistoricalPoints = (baseValue: number, variation: number = 0.2) => {
    const points = [];
    const totalPoints = range === "1m" ? 60 : range === "1h" ? 60 : range === "6h" ? 72 : 168;
    
    for (let i = 0; i < totalPoints; i++) {
      const timestamp = new Date(Date.now() - (totalPoints - i) * (range === "1m" ? 60000 : range === "1h" ? 60000 : range === "6h" ? 300000 : 3600000));
      const value = Math.max(0, Math.min(100, baseValue + (Math.sin(i * 0.1) + Math.random() - 0.5) * variation * 100));
      points.push({ timestamp, value });
    }
    return points;
  };

  const memoryData = generateHistoricalPoints(65, 0.15);
  const diskData = generateHistoricalPoints(45, 0.12);
  const networkLatency = generateHistoricalPoints(42, 0.08);
  const performanceUptime = generateHistoricalPoints(99.8, 0.002);
  const securityThreats = generateHistoricalPoints(15, 0.3);
  const deploymentSuccess = generateHistoricalPoints(96, 0.05);
  const alertsCount = generateHistoricalPoints(8, 0.4);

  const renderMiniChart = (data: { timestamp: Date; value: number }[], color: string, unit: string = "%", title: string = "") => {
    return (
      <div className="h-40 relative">
        <MetricChart
          type="line"
          height={160}
          data={{
            labels: data.map(d => d.timestamp.toLocaleTimeString()),
            datasets: [
              {
                label: title,
                data: data.map(d => d.value),
                borderColor: color,
                backgroundColor: color + "20",
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                cornerRadius: 6,
                displayColors: false,
                callbacks: {
                  title: function(context: any) {
                    return title;
                  },
                  label: function(context: any) {
                    return `${context.parsed.y.toFixed(1)}${unit}`;
                  },
                },
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
              mode: 'index' as const,
            },
          }}
        />
        
        {/* Current Value */}
        <div className="absolute top-3 right-3 text-sm font-bold bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded-md shadow-sm" style={{ color }}>
          {data[data.length - 1]?.value.toFixed(1)}{unit}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Historical DevOps Metrics - {regionName}
      </h3>

      {/* Memory & Performance Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
              <HardDrives className="h-4 w-4" />
              Memory Usage History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderMiniChart(memoryData, "#8b5cf6", "%", "Memory Usage")}
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Peak: {Math.max(...memoryData.map(d => d.value)).toFixed(1)}% • 
              Avg: {(memoryData.reduce((s, d) => s + d.value, 0) / memoryData.length).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <Lightning className="h-4 w-4" />
              Performance Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderMiniChart(performanceUptime, "#10b981", "%", "Performance Uptime")}
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Min: {Math.min(...performanceUptime.map(d => d.value)).toFixed(2)}% • 
              Current: {performanceUptime[performanceUptime.length - 1]?.value.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage & Network Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300">
              <HardDrive className="h-4 w-4" />
              Disk Usage History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderMiniChart(diskData, "#6366f1", "%", "Disk Usage")}
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Peak: {Math.max(...diskData.map(d => d.value)).toFixed(1)}% • 
              Trend: {diskData[diskData.length - 1]?.value > diskData[0]?.value ? "↗" : "↘"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-cyan-50/50 dark:bg-cyan-900/10 border border-cyan-200 dark:border-cyan-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-cyan-700 dark:text-cyan-300">
              <WifiHigh className="h-4 w-4" />
              Network Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderMiniChart(networkLatency, "#06b6d4", "ms", "Network Latency")}
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Avg: {(networkLatency.reduce((s, d) => s + d.value, 0) / networkLatency.length).toFixed(0)}ms • 
              P95: {networkLatency.map(d => d.value).sort((a, b) => b - a)[Math.floor(networkLatency.length * 0.05)].toFixed(0)}ms
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security & Operations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
              <ShieldCheck className="h-4 w-4" />
              Security Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderMiniChart(securityThreats, "#ef4444", "/100", "Security Score")}
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Lower is better • Current: {securityThreats[securityThreats.length - 1]?.value.toFixed(0)}/100
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Rocket className="h-4 w-4" />
              Deployment Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderMiniChart(deploymentSuccess, "#3b82f6", "%", "Deployment Success")}
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Success Rate • Last 7 days: {deploymentSuccess[deploymentSuccess.length - 1]?.value.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
              <Bell className="h-4 w-4" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderMiniChart(alertsCount, "#f97316", " alerts", "Active Alerts")}
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Current: {Math.round(alertsCount[alertsCount.length - 1]?.value || 0)} active alerts
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}