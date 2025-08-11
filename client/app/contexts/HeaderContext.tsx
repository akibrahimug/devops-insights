"use client";

import { createContext, useContext, useState, ReactNode, useMemo } from "react";

type HeaderTab = "latest" | "history";

interface HeaderConfig {
  title?: string;
  connected?: boolean;
  autoRefreshEnabled?: boolean;
  lastUpdated?: Date | null;
  showHistory?: boolean;
  activeTab?: HeaderTab;
  onLatestClick?: () => void;
  onHistoryClick?: () => void;
  onToggleRefresh?: () => void;
  onBack?: () => void;
}

interface HeaderContextValue extends HeaderConfig {
  setHeader: (cfg: HeaderConfig) => void;
}

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<HeaderConfig>({
    title: "DevOps Insights",
    connected: false,
    autoRefreshEnabled: false,
    lastUpdated: null,
    showHistory: false,
    activeTab: "latest",
    onBack: undefined,
  });

  const value = useMemo<HeaderContextValue>(
    () => ({ ...cfg, setHeader: (c) => setCfg((prev) => ({ ...prev, ...c })) }),
    [cfg]
  );

  return (
    <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>
  );
}

export function useHeader() {
  const ctx = useContext(HeaderContext);
  if (!ctx) throw new Error("useHeader must be used within a HeaderProvider");
  return ctx;
}
