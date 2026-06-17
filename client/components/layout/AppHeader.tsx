"use client";

/**
 * Component: AppHeader
 * I display the page title, live connection status, a theme toggle, tabs for
 * latest/history, and a control to toggle auto-refresh.
 */

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/Theme/theme-toggle";
import {
  WifiHighIcon,
  ArrowsClockwiseIcon,
  ArrowLeft,
  CloudArrowDownIcon,
} from "@phosphor-icons/react";

interface AppHeaderProps {
  title?: string;
  connected: boolean;
  autoRefreshEnabled?: boolean;
  onToggleRefresh?: () => void;
  onLatestClick?: () => void;
  onHistoryClick?: () => void;
  showHistoryTab?: boolean;
  activeTab?: "latest" | "history";
  lastUpdated?: Date | null;
  onBack?: () => void;
  dataStale?: boolean;
  snapshotSavedAt?: string | null;
}

// Compact "x ago" for the cached-snapshot age. Returns null for the bundled
// seed (no real timestamp) so we just show a generic "cached" label.
function formatAge(iso?: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then) || then <= 0) return null;
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AppHeader({
  title = "DevOps Dashboard",
  connected,
  autoRefreshEnabled = false,
  onToggleRefresh,
  onLatestClick,
  onHistoryClick,
  showHistoryTab = false,
  activeTab = "latest",
  lastUpdated,
  onBack,
  dataStale = false,
  snapshotSavedAt = null,
}: AppHeaderProps) {
  const cachedAge = formatAge(snapshotSavedAt);
  return (
    <header className="flex items-center justify-between animate-fade-in">
      <div className="flex items-center gap-2 animate-slide-in-left">
        {onBack && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label="Go back"
              title="Back"
            >
              <ArrowLeft className="h-4 w-2" />
            </Button>
            <span
              aria-hidden
              className="h-6 w-px bg-gray-200 dark:bg-gray-700"
            />
          </>
        )}
        <h1 className="hidden lg:block text-3xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
          {title}
        </h1>
        <span
          aria-hidden
          className="hidden lg:block h-6 w-px bg-gray-200 dark:bg-gray-700"
        />
        <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
          <WifiHighIcon
            size={20}
            weight="bold"
            className={
              !connected
                ? "text-red-500"
                : autoRefreshEnabled
                ? "text-green-500"
                : "text-amber-500"
            }
            aria-label={
              !connected
                ? "Disconnected"
                : autoRefreshEnabled
                ? "Live streaming enabled"
                : "Live streaming paused"
            }
          />
          {autoRefreshEnabled ? (
            connected ? (
              <span className="hidden md:inline">
                Connected to real-time data
              </span>
            ) : (
              <span className="hidden md:inline">Disconnected</span>
            )
          ) : null}
        </p>
        {dataStale && (
          <span
            className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
            title={
              cachedAge
                ? `Showing your last cached data (${cachedAge}) — updating…`
                : "Showing cached data — updating…"
            }
            aria-live="polite"
          >
            <CloudArrowDownIcon size={14} weight="bold" />
            <span className="hidden sm:inline">
              Cached{cachedAge ? ` · ${cachedAge}` : ""} · updating…
            </span>
            <span className="sm:hidden">Cached</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 animate-slide-in-right">
        <ThemeToggle />
        <span aria-hidden className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
        <div className="flex items-center gap-2 border rounded-md px-1 py-1 dark:border-gray-700">
          <Tabs value={activeTab}>
            <TabsList className="bg-transparent p-0 gap-1">
              <TabsTrigger
                value="latest"
                className="px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                onClick={onLatestClick}
              >
                Latest
              </TabsTrigger>
              {showHistoryTab && (
                <TabsTrigger
                  value="history"
                  className="px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  onClick={onHistoryClick}
                  data-tour="history-tab"
                >
                  History
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
          <Button
            size="icon"
            variant="ghost"
            aria-pressed={autoRefreshEnabled}
            title={
              autoRefreshEnabled ? "Auto-refresh: on" : "Auto-refresh: off"
            }
            onClick={onToggleRefresh}
            className={
              autoRefreshEnabled
                ? "text-blue-600 hover:text-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }
            data-tour="auto-refresh"
          >
            <ArrowsClockwiseIcon size={18} weight="bold" />
          </Button>
        </div>
        <span
          aria-hidden
          className="h-6 lg:w-px
 bg-gray-200 dark:bg-gray-700"
        />
        {lastUpdated && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Latest data • {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
    </header>
  );
}
