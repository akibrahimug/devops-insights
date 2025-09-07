"use client";

/**
 * Component: DeploymentStatusCard
 * Displays comprehensive deployment status including build status,
 * version tracking, deployment history, and rollback readiness.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercentage } from "@/lib/helpers/utils";
import { Rocket, GitBranch, Clock, ArrowClockwise, Eye } from "@phosphor-icons/react";
import { DetailedMetricsModal } from "@/components/modals/DetailedMetricsModal";

interface DeploymentData {
  last_deployment: string;
  build_status: 'success' | 'failed' | 'pending';
  version_number: string;
  rollback_ready: boolean;
}

interface RegionDeploymentData {
  name: string;
  displayName: string;
  deployment: DeploymentData;
  status: string;
}

interface DeploymentStatusCardProps {
  regions: RegionDeploymentData[];
  className?: string;
}

export function DeploymentStatusCard({ regions, className = "" }: DeploymentStatusCardProps) {
  const [showModal, setShowModal] = useState(false);
  const successfulBuilds = regions.filter(r => r.deployment.build_status === 'success').length;
  const failedBuilds = regions.filter(r => r.deployment.build_status === 'failed').length;
  const pendingBuilds = regions.filter(r => r.deployment.build_status === 'pending').length;
  const rollbackReady = regions.filter(r => r.deployment.rollback_ready).length;
  const successRate = regions.length > 0 ? (successfulBuilds / regions.length) * 100 : 0;

  const currentData = {
    successRate: formatPercentage(successRate),
    successfulBuilds: successfulBuilds.toString(),
    failedBuilds: failedBuilds.toString(),
    pendingBuilds: pendingBuilds.toString(),
    rollbackReady: `${rollbackReady} regions`
  };

  const getBuildStatusColor = (status: string) => {
    switch (status) {
      case 'success': return "text-green-600 dark:text-green-400";
      case 'failed': return "text-red-600 dark:text-red-400";
      case 'pending': return "text-amber-600 dark:text-amber-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const getBuildStatusBg = (status: string) => {
    switch (status) {
      case 'success': return "bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800/60";
      case 'failed': return "bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800/60";
      case 'pending': return "bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800/60";
      default: return "bg-gray-100 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800/60";
    }
  };

  const formatDeploymentTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return "< 1h ago";
      if (diffInHours < 24) return `${diffInHours}h ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    } catch {
      return "Unknown";
    }
  };

  const getBuildStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <GitBranch className="h-3 w-3 text-green-500" />;
      case 'failed': return <GitBranch className="h-3 w-3 text-red-500" />;
      case 'pending': return <Clock className="h-3 w-3 text-amber-500 animate-pulse" />;
      default: return <GitBranch className="h-3 w-3 text-gray-500" />;
    }
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
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Deployment Status Overview
            </div>
            <Eye className="h-5 w-5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simplified Global Summary */}
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/60">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {successfulBuilds}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Success</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {failedBuilds}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {pendingBuilds}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Pending</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatPercentage(successRate)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Rate</div>
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
                  <div className={`text-xs font-semibold ${getBuildStatusColor(region.deployment.build_status)}`}>
                    {region.deployment.build_status}
                  </div>
                  {region.deployment.rollback_ready && (
                    <ArrowClockwise className="h-3 w-3 text-blue-500" />
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

          {/* Deployment Alerts */}
          {(failedBuilds > 0 || pendingBuilds > 0) && (
            <div className="mt-4 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Rocket className="h-3 w-3" />
                <span className="text-xs font-medium">
                  {failedBuilds > 0 ? `${failedBuilds} failed` : ''} {failedBuilds > 0 && pendingBuilds > 0 ? '• ' : ''} {pendingBuilds > 0 ? `${pendingBuilds} pending` : ''} deployment(s)
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DetailedMetricsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Deployment Status"
        icon={<Rocket className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
        metricType="deployment"
        regions={regions}
        currentData={currentData}
      />
    </>
  );
}