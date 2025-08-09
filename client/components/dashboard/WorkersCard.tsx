"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Eye, EyeSlash, Key, CopySimple } from "@phosphor-icons/react";
import { useState } from "react";

interface WorkersCardProps {
  workers: Array<[string, any]>;
}

export function WorkersCard({ workers }: WorkersCardProps) {
  const [showBlockedKeys, setShowBlockedKeys] = useState<
    Record<string, boolean>
  >({});
  const [showTopKeys, setShowTopKeys] = useState<Record<string, boolean>>({});

  const maskKey = (k: string, reveal: boolean) => {
    if (!k) return "";
    if (reveal) return k;
    const start = k.slice(0, 3);
    const end = k.slice(-2);
    const stars = k.length > 5 ? "*".repeat(Math.max(2, k.length - 5)) : "**";
    return `${start}${stars}${end}`;
  };

  return (
    <Card className="mb-6 border-0 shadow dark:bg-gray-800/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">Workers</CardTitle>
        <CardDescription>Active worker processes and their status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {workers.map(([name, data], index) => {
            const totalWorkers = Number(data?.workers) || 0;
            const idle = Number(data?.idle) || 0;
            const waiting = Number(data?.waiting) || 0;
            const busy = Math.max(0, totalWorkers - idle);
            const busyPercent =
              totalWorkers > 0 ? Math.round((busy / totalWorkers) * 100) : 0;
            const queuePercent =
              totalWorkers > 0
                ? Math.min(100, Math.round((waiting / totalWorkers) * 100))
                : waiting > 0
                ? 100
                : 0;

            const rawBlocked = (data?.recently_blocked_keys || data?.blocked_keys || []) as any[];
            const rawTop = (data?.top_keys || data?.keys_top || []) as any[];

            const blockedKeys: string[] = Array.isArray(rawBlocked)
              ? rawBlocked
                  .map((v: any) => (typeof v === "string" ? v : v?.key ?? JSON.stringify(v)))
                  .filter(Boolean)
                  .slice(0, 5)
              : [];

            const topKeys: Array<{ key: string; count?: number }> = Array.isArray(rawTop)
              ? rawTop
                  .map((v: any) => {
                    if (Array.isArray(v)) return { key: String(v[0]), count: Number(v[1]) };
                    if (typeof v === "string") return { key: v };
                    return {
                      key: String(v?.key ?? ""),
                      count: v?.count != null ? Number(v.count) : undefined,
                    };
                  })
                  .filter((x) => x.key)
                  .slice(0, 5)
              : [];

            return (
              <div
                key={index}
                className="border rounded-lg p-4 bg-white/50 dark:bg-gray-900/40 backdrop-blur-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Busy {busy}/{totalWorkers} • Idle {idle}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{totalWorkers} workers</Badge>
                    {waiting > 0 && (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" variant="outline">
                        {waiting} waiting
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Utilization bar */}
                <div className="mb-3">
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full bg-purple-500 transition-all" style={{ width: `${busyPercent}%` }} aria-label={`Busy ${busyPercent}%`} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    <span>Idle {idle}</span>
                    <span>{busyPercent}% busy</span>
                  </div>
                </div>

                {/* Stats and queue */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Wait Time</div>
                    <div className="font-medium">{Number(data?.wait_time) || 0}ms</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Time to Return</div>
                    <div className="font-medium">{Number(data?.time_to_return) || 0}ms</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Waiting</div>
                    <div className="font-medium">{waiting}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 w-14">Queue</div>
                    <div className="flex-1">
                      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full bg-amber-500 transition-all" style={{ width: `${queuePercent}%` }} aria-label={`Queue ${queuePercent}%`} />
                      </div>
                    </div>
                  </div>
                </div>

                {(blockedKeys.length > 0 || topKeys.length > 0) && (
                  <Accordion type="multiple" className="mt-4">
                    {blockedKeys.length > 0 && (
                      <AccordionItem value={`blocked-${index}`}>
                        <AccordionTrigger className="text-sm text-gray-800 dark:text-gray-200">
                          <span className="flex items-center gap-2">
                            <Key className="h-4 w-4" /> Recently Blocked
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="flex items-center justify-end mb-1">
                            <button
                              type="button"
                              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              onClick={() =>
                                setShowBlockedKeys((s) => ({ ...s, [name]: !s[name] }))
                              }
                              aria-label={showBlockedKeys[name] ? "Hide keys" : "Show keys"}
                            >
                              {showBlockedKeys[name] ? (
                                <EyeSlash className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <div className="h-24 overflow-y-auto pr-1">
                            <ul className="space-y-2">
                              {blockedKeys.map((k, i) => {
                                const revealed = !!showBlockedKeys[name];
                                const display = maskKey(k, revealed);
                                return (
                                  <li key={i} className="group flex items-center justify-between gap-2">
                                    <code className="font-mono text-xs text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 truncate flex-1" title={k}>
                                      {display}
                                    </code>
                                    <button
                                      type="button"
                                      className={`opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${revealed ? "" : "cursor-not-allowed"}`}
                                      onClick={() => revealed && navigator.clipboard?.writeText(k)}
                                      aria-label="Copy key"
                                    >
                                      <CopySimple className="h-4 w-4" />
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {topKeys.length > 0 && (
                      <AccordionItem value={`top-${index}`}>
                        <AccordionTrigger className="text-sm text-gray-800 dark:text-gray-200">
                          <span className="flex items-center gap-2">
                            <Key className="h-4 w-4" /> Top Keys
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="flex items-center justify-end mb-1">
                            <button
                              type="button"
                              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              onClick={() => setShowTopKeys((s) => ({ ...s, [name]: !s[name] }))}
                              aria-label={showTopKeys[name] ? "Hide keys" : "Show keys"}
                            >
                              {showTopKeys[name] ? (
                                <EyeSlash className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <div className="h-24 overflow-y-auto pr-1">
                            <ul className="space-y-2">
                              {topKeys.map((item, i) => {
                                const revealed = !!showTopKeys[name];
                                const display = maskKey(item.key, revealed);
                                return (
                                  <li key={i} className="group flex items-center justify-between gap-2">
                                    <code className="font-mono text-xs text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 truncate flex-1" title={item.key}>
                                      {display}
                                    </code>
                                    <div className="flex items-center gap-2">
                                      {item.count != null && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                                          {item.count}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        className={`opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${revealed ? "" : "cursor-not-allowed"}`}
                                        onClick={() => revealed && navigator.clipboard?.writeText(item.key)}
                                        aria-label="Copy key"
                                      >
                                        <CopySimple className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


