"use client";

import { Card, CardContent } from "@/components/ui/card";

export function MetricMiniCard({
  title,
  value,
  icon: Icon,
  color,
  formatter,
}: {
  title: string;
  value: number;
  icon: any;
  color?: string;
  formatter?: (v: number) => string | number;
}) {
  const formatted = typeof formatter === "function" ? formatter(value) : value;
  return (
    <Card className="transition-all duration-300 animate-fade-in border-0 shadow dark:bg-gray-800/50 backdrop-blur hover:shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <Icon className={`h-4 w-4 ${color || "text-gray-600"}`} />
        </div>
        <p
          className={`text-xl font-bold ${
            color || "text-gray-900 dark:text-white"
          }`}
        >
          {formatted}
        </p>
      </CardContent>
    </Card>
  );
}
