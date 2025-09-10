"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, Clock } from "@phosphor-icons/react";
import { useWebSocket } from "@/app/contexts/WebSocketContext";

interface TimeFrame {
  key: string;
  label: string;
  hours: number;
}

interface DetailedMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  metricType: 'memory' | 'disk' | 'network' | 'performance' | 'security' | 'deployment' | 'alerts';
  regions: any[];
  currentData?: any;
}

const timeFrames: TimeFrame[] = [
  { key: '1h', label: '1 Hour', hours: 1 },
  { key: '6h', label: '6 Hours', hours: 6 },
  { key: '24h', label: '24 Hours', hours: 24 },
  { key: '7d', label: '7 Days', hours: 168 },
];

export function DetailedMetricsModal({ 
  isOpen, 
  onClose, 
  title, 
  icon, 
  metricType, 
  regions,
  currentData 
}: DetailedMetricsModalProps) {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>(timeFrames[1]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { getHistory, history } = useWebSocket();

  // Generate historical data points for the chart
  const generateHistoricalData = () => {
    const points = [];
    const now = new Date();
    const intervals = selectedTimeFrame.hours <= 6 ? 30 : selectedTimeFrame.hours <= 24 ? 60 : 120;
    const totalPoints = selectedTimeFrame.hours <= 6 ? 12 : selectedTimeFrame.hours <= 24 ? 24 : 84;
    
    for (let i = totalPoints; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * intervals * 60 * 1000));
      const variation = Math.sin(i * 0.1) * 0.2 + Math.random() * 0.1;
      
      let value = 50;
      if (metricType === 'memory') {
        value = Math.max(20, Math.min(95, 60 + variation * 30));
      } else if (metricType === 'disk') {
        value = Math.max(10, Math.min(90, 45 + variation * 25));
      } else if (metricType === 'network') {
        value = Math.max(5, Math.min(100, 75 + variation * 20));
      } else if (metricType === 'performance') {
        value = Math.max(80, Math.min(100, 98 + variation * 2));
      }
      
      points.push({ timestamp, value });
    }
    return points;
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Generate mock historical data
      setTimeout(() => {
        setHistoricalData(generateHistoricalData());
        setLoading(false);
      }, 500);
    }
  }, [isOpen, selectedTimeFrame, metricType]);

  const getMetricDetails = () => {
    switch (metricType) {
      case 'memory':
        return {
          primaryMetric: 'Memory Usage',
          primaryValue: currentData?.averageUsage || '65%',
          primaryColor: 'text-purple-600 dark:text-purple-400',
          sections: [
            { label: 'Total Memory', value: currentData?.totalMemory || '128 GB' },
            { label: 'Used Memory', value: currentData?.usedMemory || '83 GB' },
            { label: 'Available Memory', value: currentData?.availableMemory || '45 GB' },
            { label: 'Cached Memory', value: currentData?.cachedMemory || '12 GB' },
          ]
        };
      case 'disk':
        return {
          primaryMetric: 'Disk Usage',
          primaryValue: currentData?.averageUsage || '58%',
          primaryColor: 'text-indigo-600 dark:text-indigo-400',
          sections: [
            { label: 'Total Storage', value: currentData?.totalStorage || '2.5 TB' },
            { label: 'Used Storage', value: currentData?.usedStorage || '1.45 TB' },
            { label: 'Read I/O', value: currentData?.readIO || '156 MB/s' },
            { label: 'Write I/O', value: currentData?.writeIO || '89 MB/s' },
          ]
        };
      case 'network':
        return {
          primaryMetric: 'Network Performance',
          primaryValue: currentData?.avgLatency || '42ms',
          primaryColor: 'text-cyan-600 dark:text-cyan-400',
          sections: [
            { label: 'Total Bandwidth In', value: currentData?.totalBandwidthIn || '4.2 Gbps' },
            { label: 'Total Bandwidth Out', value: currentData?.totalBandwidthOut || '2.8 Gbps' },
            { label: 'Packet Loss', value: currentData?.packetLoss || '0.12%' },
            { label: 'Jitter', value: currentData?.jitter || '2.1ms' },
          ]
        };
      case 'performance':
        return {
          primaryMetric: 'Application Performance',
          primaryValue: currentData?.uptime || '99.8%',
          primaryColor: 'text-emerald-600 dark:text-emerald-400',
          sections: [
            { label: 'Response Time P95', value: currentData?.p95ResponseTime || '385ms' },
            { label: 'Total RPS', value: currentData?.totalRPS || '4,250' },
            { label: 'Error Rate', value: currentData?.errorRate || '0.3%' },
            { label: 'Apdex Score', value: currentData?.apdex || '0.94' },
          ]
        };
      case 'security':
        return {
          primaryMetric: 'Security Status',
          primaryValue: currentData?.threatLevel || 'Low',
          primaryColor: 'text-red-600 dark:text-red-400',
          sections: [
            { label: 'Failed Logins', value: currentData?.totalFailedLogins || '87' },
            { label: 'Blocked IPs', value: currentData?.totalBlockedIPs || '23' },
            { label: 'SSL Certificates', value: currentData?.sslStatus || '6 Valid' },
            { label: 'Vulnerability Score', value: currentData?.vulnScore || '18/100' },
          ]
        };
      case 'deployment':
        return {
          primaryMetric: 'Deployment Status',
          primaryValue: currentData?.successRate || '96%',
          primaryColor: 'text-blue-600 dark:text-blue-400',
          sections: [
            { label: 'Successful Builds', value: currentData?.successfulBuilds || '5' },
            { label: 'Failed Builds', value: currentData?.failedBuilds || '1' },
            { label: 'Pending Builds', value: currentData?.pendingBuilds || '0' },
            { label: 'Rollback Ready', value: currentData?.rollbackReady || '4 regions' },
          ]
        };
      case 'alerts':
        return {
          primaryMetric: 'Active Alerts',
          primaryValue: currentData?.totalAlerts || '12',
          primaryColor: 'text-orange-600 dark:text-orange-400',
          sections: [
            { label: 'Critical Alerts', value: currentData?.criticalAlerts || '2' },
            { label: 'Warning Alerts', value: currentData?.warningAlerts || '7' },
            { label: 'Info Alerts', value: currentData?.infoAlerts || '3' },
            { label: 'Avg Response Time', value: currentData?.avgResponseTime || '6.2 min' },
          ]
        };
      default:
        return {
          primaryMetric: 'Metric',
          primaryValue: '0%',
          primaryColor: 'text-gray-600 dark:text-gray-400',
          sections: []
        };
    }
  };

  const details = getMetricDetails();

  const renderChart = () => {
    if (loading) {
      return (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      );
    }

    const maxValue = Math.max(...historicalData.map(d => d.value));
    const minValue = Math.min(...historicalData.map(d => d.value));
    const range = maxValue - minValue || 1;

    return (
      <div className="h-64 relative bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <div className="absolute inset-4">
          <svg className="w-full h-full">
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            
            {/* Chart Line */}
            <polyline
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
              points={historicalData.map((point, index) => {
                const x = (index / (historicalData.length - 1)) * 100;
                const y = ((maxValue - point.value) / range) * 80 + 10;
                return `${x},${y}`;
              }).join(' ')}
              vectorEffect="non-scaling-stroke"
            />
            
            {/* Chart Area */}
            <polygon
              fill="url(#chartGradient)"
              points={[
                ...historicalData.map((point, index) => {
                  const x = (index / (historicalData.length - 1)) * 100;
                  const y = ((maxValue - point.value) / range) * 80 + 10;
                  return `${x},${y}`;
                }),
                '100,90',
                '0,90'
              ].join(' ')}
            />
            
            {/* Data Points */}
            {historicalData.map((point, index) => {
              const x = (index / (historicalData.length - 1)) * 100;
              const y = ((maxValue - point.value) / range) * 80 + 10;
              return (
                <circle
                  key={index}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="3"
                  fill="rgb(59, 130, 246)"
                  className="hover:r-4 transition-all cursor-pointer"
                >
                  <title>{`${point.timestamp.toLocaleTimeString()}: ${point.value.toFixed(1)}%`}</title>
                </circle>
              );
            })}
          </svg>
        </div>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 py-4">
          <span>{maxValue.toFixed(0)}</span>
          <span>{((maxValue + minValue) / 2).toFixed(0)}</span>
          <span>{minValue.toFixed(0)}</span>
        </div>
        
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-4 right-4 flex justify-between text-xs text-gray-500">
          <span>{selectedTimeFrame.hours}h ago</span>
          <span>Now</span>
        </div>
      </div>
    );
  };

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-xl font-semibold text-gray-900 dark:text-white">
            {icon}
            <span>{title} - Detailed View</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">

        <div className="space-y-6">
          {/* Current Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-1 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 text-center">
                <div className={`text-3xl font-bold ${details.primaryColor} mb-1`}>
                  {details.primaryValue}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {details.primaryMetric}
                </div>
              </CardContent>
            </Card>
            
            <div className="md:col-span-3 grid grid-cols-2 gap-4">
              {details.sections.map((section, index) => (
                <Card key={index} className="bg-white/50 dark:bg-gray-800/50">
                  <CardContent className="p-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {section.label}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {section.value}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Time Frame Selection */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Historical View:
            </span>
            <div className="flex gap-2">
              {timeFrames.map((timeFrame) => (
                <Button
                  key={timeFrame.key}
                  variant={selectedTimeFrame.key === timeFrame.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTimeFrame(timeFrame)}
                  className="text-xs"
                >
                  {timeFrame.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Historical Chart */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {details.primaryMetric} Trend
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Last {selectedTimeFrame.label}</span>
                </div>
              </div>
              {renderChart()}
            </CardContent>
          </Card>

          {/* Regional Breakdown */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Regional Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regions.map((region, index) => (
                  <div key={region.name} className="p-3 bg-gray-50 dark:bg-gray-800/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {region.displayName}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${
                        region.status === 'ok' ? 'bg-green-500' : 
                        region.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
                      }`} />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {/* Dynamic regional data based on metric type */}
                      {metricType === 'memory' && (
                        <div>Memory: {region.memory?.usage_percent?.toFixed(1) || '0'}%</div>
                      )}
                      {metricType === 'disk' && (
                        <div>Disk: {region.disk?.usage_percent?.toFixed(1) || '0'}%</div>
                      )}
                      {metricType === 'network' && (
                        <div>Latency: {region.network?.latency?.toFixed(0) || '0'}ms</div>
                      )}
                      {metricType === 'performance' && (
                        <div>Uptime: {region.performance?.uptime_percent?.toFixed(1) || '0'}%</div>
                      )}
                      {metricType === 'security' && (
                        <div>Threat: {region.security?.vulnerability_score || '0'}/100</div>
                      )}
                      {metricType === 'deployment' && (
                        <div>Status: {region.deployment?.build_status || 'unknown'}</div>
                      )}
                      {metricType === 'alerts' && (
                        <div>Active: {region.alerts?.active_alerts || '0'}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
}