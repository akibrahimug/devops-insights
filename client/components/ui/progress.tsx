"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, className, ...props }, ref) => {
    const clamped = Math.max(0, Math.min(100, Number(value) || 0));
    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800",
          className
        )}
        {...props}
      >
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";
