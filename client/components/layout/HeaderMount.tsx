"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { useHeader } from "@/app/contexts/HeaderContext";

export default function HeaderMount() {
  const {
    title,
    connected,
    autoRefreshEnabled,
    onToggleRefresh,
    onLatestClick,
    onHistoryClick,
    showHistory,
    activeTab,
    lastUpdated,
  } = useHeader();

  return (
    <div className="max-w-7xl mx-auto px-6 pt-6">
      <AppHeader
        title={title}
        connected={!!connected}
        autoRefreshEnabled={!!autoRefreshEnabled}
        onToggleRefresh={onToggleRefresh}
        onLatestClick={onLatestClick}
        onHistoryClick={onHistoryClick}
        showHistoryTab={!!showHistory}
        activeTab={activeTab || "latest"}
        lastUpdated={lastUpdated || null}
      />
    </div>
  );
}
