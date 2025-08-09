"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/Theme/theme-toggle";
import {
  WifiHigh as WifiHighIcon,
  ArrowsClockwise as ArrowsClockwiseIcon,
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
}

export function AppHeader({
  title = "Global DevOps Dashboard",
  connected,
  autoRefreshEnabled = false,
  onToggleRefresh,
  onLatestClick,
  onHistoryClick,
  showHistoryTab = false,
  activeTab = "latest",
  lastUpdated,
}: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between animate-fade-in">
      <div className="animate-slide-in-left">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
          <WifiHighIcon
            size={32}
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
          {autoRefreshEnabled
            ? connected
              ? "Connected to real-time data"
              : "Disconnected"
            : null}
        </p>
      </div>
      <div className="flex items-center gap-3 animate-slide-in-right">
        <ThemeToggle />
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
          >
            <ArrowsClockwiseIcon size={18} weight="bold" />
          </Button>
        </div>
        {lastUpdated && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Latest data • {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
    </header>
  );
}
