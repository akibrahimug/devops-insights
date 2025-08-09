"use client";

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
}

export function CompactHistoryCard({
  title,
  color,
  series,
  range,
  height = 110,
  className = "",
}: CompactHistoryCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="py-2">
        <CardTitle className="text-sm text-gray-900 dark:text-white">
          {title}
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
                backgroundColor: "rgba(0,0,0,0)",
                fill: false,
                tension: 0.4,
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
        />
      </CardContent>
    </Card>
  );
}
