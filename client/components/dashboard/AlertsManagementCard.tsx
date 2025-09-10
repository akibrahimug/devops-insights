"use client";

/**
 * Component: AlertsManagementCard
 * Displays comprehensive alert metrics including active alerts,
 * critical alerts, escalated alerts, and response times.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bell, Warning, WarningCircle, Clock, Eye } from "@phosphor-icons/react";
import { DetailedMetricsModal } from "@/components/modals/DetailedMetricsModal";

interface AlertsData {
  active_alerts: number;
  critical_alerts: number;
  escalated_alerts: number;
  alert_response_time: number; // minutes
}

interface RegionAlertsData {
  name: string;
  displayName: string;
  alerts: AlertsData;
  status: string;
}

interface AlertsManagementCardProps {
  regions: RegionAlertsData[];
  className?: string;
}

export function AlertsManagementCard({ regions, className = "" }: AlertsManagementCardProps) {
  const [showModal, setShowModal] = useState(false);
  const totalActiveAlerts = regions.reduce((sum, region) => sum + region.alerts.active_alerts, 0);
  const totalCriticalAlerts = regions.reduce((sum, region) => sum + region.alerts.critical_alerts, 0);
  const totalEscalatedAlerts = regions.reduce((sum, region) => sum + region.alerts.escalated_alerts, 0);
  const averageResponseTime = regions.length > 0 
    ? regions.reduce((sum, region) => sum + region.alerts.alert_response_time, 0) / regions.length 
    : 0;

  const currentData = {
    totalAlerts: totalActiveAlerts.toString(),
    criticalAlerts: totalCriticalAlerts.toString(),
    warningAlerts: (totalActiveAlerts - totalCriticalAlerts - totalEscalatedAlerts).toString(),
    infoAlerts: totalEscalatedAlerts.toString(),
    avgResponseTime: `${averageResponseTime.toFixed(1)} min`
  };

  const getAlertSeverityColor = (count: number, threshold: { high: number; medium: number }) => {
    if (count >= threshold.high) return "text-red-600 dark:text-red-400";
    if (count >= threshold.medium) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const getResponseTimeColor = (minutes: number) => {
    if (minutes >= 30) return "text-red-600 dark:text-red-400";
    if (minutes >= 15) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const formatResponseTime = (minutes: number) => {
    if (minutes < 1) return "< 1m";
    if (minutes < 60) return `${minutes.toFixed(0)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.floor(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const getAlertPriorityLevel = (critical: number, total: number) => {
    if (critical === 0 && total === 0) return { level: "Normal", color: "text-green-600 dark:text-green-400" };
    const criticalRatio = total > 0 ? (critical / total) * 100 : 0;
    if (criticalRatio >= 50) return { level: "High", color: "text-red-600 dark:text-red-400" };
    if (criticalRatio >= 20 || total >= 10) return { level: "Medium", color: "text-amber-600 dark:text-amber-400" };
    return { level: "Low", color: "text-green-600 dark:text-green-400" };
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
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/40">
                <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              Alerts Management Overview
            </div>
            <Eye className="h-5 w-5 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simplified Global Summary */}
          <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800/60">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className={`text-lg font-bold ${getAlertSeverityColor(totalActiveAlerts, { high: 20, medium: 10 })}`}>
                  {totalActiveAlerts}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Active</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${getAlertSeverityColor(totalCriticalAlerts, { high: 5, medium: 2 })}`}>
                  {totalCriticalAlerts}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Critical</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${getAlertSeverityColor(totalEscalatedAlerts, { high: 3, medium: 1 })}`}>
                  {totalEscalatedAlerts}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Escalated</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${getResponseTimeColor(averageResponseTime)}`}>
                  {formatResponseTime(averageResponseTime)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Response</div>
              </div>
            </div>
          </div>

          {/* Simplified Regional Status */}
          <div className="space-y-2">
            {regions.slice(0, 3).map((region) => {
              const priorityLevel = getAlertPriorityLevel(region.alerts.critical_alerts, region.alerts.active_alerts);
              return (
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
                    <div className={`text-xs font-semibold ${getAlertSeverityColor(region.alerts.active_alerts, { high: 10, medium: 5 })}`}>
                      {region.alerts.active_alerts} alerts
                    </div>
                    <div className={`text-xs font-semibold ${priorityLevel.color}`}>
                      {priorityLevel.level}
                    </div>
                  </div>
                </div>
              );
            })}
            {regions.length > 3 && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
                +{regions.length - 3} more regions
              </div>
            )}
          </div>

          {/* Alert Notifications */}
          {totalCriticalAlerts > 0 && (
            <div className="mt-4 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/60 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <Warning className="h-3 w-3" />
                <span className="text-xs font-medium">
                  {totalCriticalAlerts} critical alerts need immediate attention
                </span>
              </div>
            </div>
          )}

          {totalActiveAlerts === 0 && (
            <div className="mt-4 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/60 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <Bell className="h-3 w-3" />
                <span className="text-xs font-medium">
                  All clear - no active alerts
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DetailedMetricsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Alerts Management"
        icon={<Bell className="h-6 w-6 text-orange-600 dark:text-orange-400" />}
        metricType="alerts"
        regions={regions}
        currentData={currentData}
      />
    </>
  );
}