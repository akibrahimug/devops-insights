"use client";

/**
 * Component: SecurityMonitoringCard
 * Displays comprehensive security metrics including failed logins,
 * blocked IPs, SSL certificate status, and vulnerability scores.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatPercentage } from "@/lib/helpers/utils";
import { ShieldCheck, Warning, Lock, Bug, Eye } from "@phosphor-icons/react";
import { DetailedMetricsModal } from "@/components/modals/DetailedMetricsModal";

interface SecurityData {
  failed_logins: number;
  blocked_ips: number;
  ssl_cert_days: number;
  vulnerability_score: number; // 0-100 (lower is better)
}

interface RegionSecurityData {
  name: string;
  displayName: string;
  security: SecurityData;
  status: string;
}

interface SecurityMonitoringCardProps {
  regions: RegionSecurityData[];
  className?: string;
}

export function SecurityMonitoringCard({
  regions,
  className = "",
}: SecurityMonitoringCardProps) {
  const [showModal, setShowModal] = useState(false);
  const totalFailedLogins = regions.reduce(
    (sum, region) => sum + region.security.failed_logins,
    0
  );
  const totalBlockedIPs = regions.reduce(
    (sum, region) => sum + region.security.blocked_ips,
    0
  );
  const minSSLCertDays =
    regions.length > 0
      ? Math.min(...regions.map((r) => r.security.ssl_cert_days))
      : 0;
  const averageVulnerabilityScore =
    regions.length > 0
      ? regions.reduce(
          (sum, region) => sum + region.security.vulnerability_score,
          0
        ) / regions.length
      : 0;

  const getSecurityThreatLevel = (score: number) => {
    if (score >= 70)
      return { level: "High", color: "text-red-600 dark:text-red-400" };
    if (score >= 40)
      return {
        level: "Medium",
        color: "text-amber-600 dark:text-amber-400",
      };
    return { level: "Low", color: "text-green-600 dark:text-green-400" };
  };

  const globalThreat = getSecurityThreatLevel(averageVulnerabilityScore);
  const currentData = {
    threatLevel: globalThreat.level,
    totalFailedLogins: totalFailedLogins.toString(),
    totalBlockedIPs: totalBlockedIPs.toString(),
    sslStatus: `${
      regions.filter((r) => r.security.ssl_cert_days > 30).length
    } Valid`,
    vulnScore: `${averageVulnerabilityScore.toFixed(0)}/100`,
  };

  const getSSLStatusColor = (days: number) => {
    if (days <= 7) return "text-red-600 dark:text-red-400";
    if (days <= 30) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const getFailedLoginsColor = (count: number) => {
    if (count >= 100) return "text-red-600 dark:text-red-400";
    if (count >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const getBlockedIPsColor = (count: number) => {
    if (count >= 20) return "text-red-600 dark:text-red-400";
    if (count >= 10) return "text-amber-600 dark:text-amber-400";
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
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40">
                <ShieldCheck className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              Security Monitoring Overview
            </div>
            <Eye className="h-5 w-5 text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simplified Global Summary */}
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/60">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {totalFailedLogins}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Logins
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {totalBlockedIPs}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Blocked
                </div>
              </div>
              <div>
                <div
                  className={`text-lg font-bold ${getSSLStatusColor(
                    minSSLCertDays
                  )}`}
                >
                  {minSSLCertDays}d
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  SSL Min
                </div>
              </div>
              <div>
                <div className={`text-lg font-bold ${globalThreat.color}`}>
                  {globalThreat.level}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Threat
                </div>
              </div>
            </div>
          </div>

          {/* Simplified Regional Status */}
          <div className="space-y-2">
            {regions.slice(0, 3).map((region) => {
              const threatLevel = getSecurityThreatLevel(
                region.security.vulnerability_score
              );
              return (
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
                      className={`text-xs font-semibold ${threatLevel.color}`}
                    >
                      {threatLevel.level}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {region.security.ssl_cert_days}d SSL
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

          {/* Security Alerts */}
          {(regions.some((r) => r.security.ssl_cert_days <= 30) ||
            regions.some((r) => r.security.failed_logins >= 100) ||
            regions.some((r) => r.security.vulnerability_score >= 70)) && (
            <div className="mt-4 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Warning className="h-3 w-3" />
                <span className="text-xs font-medium">
                  Security issues detected in{" "}
                  {
                    regions.filter(
                      (r) =>
                        r.security.ssl_cert_days <= 30 ||
                        r.security.failed_logins >= 100 ||
                        r.security.vulnerability_score >= 70
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
        title="Security Monitoring"
        icon={
          <ShieldCheck className="h-6 w-6 text-red-600 dark:text-red-400" />
        }
        metricType="security"
        regions={regions}
        currentData={currentData}
      />
    </>
  );
}
