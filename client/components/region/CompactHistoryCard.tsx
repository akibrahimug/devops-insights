"use client";

/**
 * Component: CompactHistoryCard
 * A small line chart card with a title and optional icon for a single metric.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricChart } from "@/components/charts/MetricChart";
import { RangeKey, formatTimeLabelForRange } from "@/lib/helpers/utils";

interface Point {
  bucketStart: string;
  value: number;
}

interface CompactHistoryCardProps {
  title: string;
  color: string;
  series: Point[];
  range: RangeKey;
  height?: number;
  className?: string;
  icon?: (props: { className?: string }) => React.ReactNode;
  isLoading?: boolean;
}

export function CompactHistoryCard({
  title,
  color,
  series,
  range,
  height = 110,
  className = "",
  icon,
  isLoading = false,
}: CompactHistoryCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">
          <span className="inline-flex items-center gap-2">
            {icon ? icon({}) : null}
            {title}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MetricChart
          type="line"
          height={height}
          data={{
            labels: series.map((p) =>
              formatTimeLabelForRange(p.bucketStart, range)
            ),
            datasets: [
              {
                label: title,
                data: series.map((p) => p.value),
                borderColor: color,
                borderWidth: 2,
                backgroundColor: "rgba(0,0,0,0)",
                fill: false,
                tension: 0.4,
                pointRadius: (ctx: any) => (ctx.dataIndex % 4 === 0 ? 3 : 0),
                pointHoverRadius: (ctx: any) =>
                  ctx.dataIndex % 4 === 0 ? 4 : 0,
                pointBackgroundColor: color,
                pointBorderColor: "#ffffff",
                pointBorderWidth: 1,
              },
            ],
          }}
          options={{
            plugins: { legend: { display: false } },
            scales: {
              x: {
                display: false,
                grid: { display: false },
                border: { display: false },
                ticks: { display: false },
              },
              y: {
                display: false,
                grid: { display: false },
                border: { display: false },
                ticks: { display: false },
              },
            },
          }}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
