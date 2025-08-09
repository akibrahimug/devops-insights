"use client";

import React from "react";

export function InteractiveLoader({ label = "Loading dashboard…" }: { label?: string }) {
  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <div className="relative w-28 h-28 sm:w-36 sm:h-36">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 rounded-full border-4 border-purple-300/60 border-t-transparent animate-spin [animation-duration:1.8s]" />
        {/* Middle rotating ring (reverse) */}
        <div className="absolute inset-2 rounded-full border-4 border-fuchsia-300/50 border-b-transparent animate-spin [animation-duration:2.6s]" style={{ animationDirection: "reverse" }} />
        {/* Inner pulse */}
        <div className="absolute inset-6 rounded-full bg-purple-500/20">
          <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-purple-500/40" />
        </div>
        {/* Orbiting dots (spin group) */}
        <div className="absolute inset-0 animate-spin [animation-duration:3.2s]">
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 360) / 8;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2"
                style={{
                  transform: `rotate(${angle}deg) translateY(-70%) translateX(-50%)`,
                }}
              >
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-purple-500/80 shadow-[0_0_10px_rgba(124,58,237,0.6)]" />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 text-sm sm:text-base text-gray-700 dark:text-gray-300">
        {label}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}