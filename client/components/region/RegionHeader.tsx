"use client";

/**
 * Component: RegionHeader
 * Renders the region page header with a back button and, in history mode,
 * a time-range selector.
 */

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "@phosphor-icons/react";
import { RangeKey } from "@/lib/helpers/utils";

interface RegionHeaderProps {
  onBack: () => void;
  mode: "latest" | "history";
  range: RangeKey;
  onRangeChange: (range: RangeKey) => void;
}

const timepicker = [
  { label: "1w", value: "1w" },
  { label: "1d", value: "1d" },
  { label: "5h", value: "5h" },
  { label: "1h", value: "1h" },
  { label: "5m", value: "5m" },
  { label: "1m", value: "1m" },
];

export function RegionHeader({
  onBack,
  mode,
  range,
  onRangeChange,
}: RegionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      {mode === "history" && (
        <Tabs value={range} onValueChange={(v) => onRangeChange(v as RangeKey)}>
          <TabsList className="gap-1">
            {timepicker.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}
