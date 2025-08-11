"use client";

/**
 * Component: HeaderMount
 * I read header config from context and render the `AppHeader` and the
 * onboarding tour in the page layout.
 */

import { AppHeader } from "@/components/layout/AppHeader";
import OnboardingHelpTour from "@/components/layout/OnboardingHelpTour";
import { useHeader } from "@/app/contexts/HeaderContext";
import { usePathname } from "next/navigation";

export default function HeaderMount() {
  const pathname = usePathname();
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
    onBack,
  } = useHeader();

  return (
    <div className="max-w-7xl mx-auto pl-2 py-6">
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
        onBack={pathname === "/" ? undefined : onBack}
      />
      <OnboardingHelpTour />
    </div>
  );
}
