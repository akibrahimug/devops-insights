"use client";

/**
 * Component: OnboardingHelpTour
 * I guide first-time users through key controls in the UI by highlighting elements
 * and showing a small tooltip. I compute safe tooltip positions, track which step
 * is active, and keep positions aligned on scroll and resize without jank.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Placement options for the help tooltip relative to the highlighted element.
// Combined with viewport clamping to prevent overflow.
type Placement = "top" | "bottom" | "left" | "right";

// A single step in the onboarding tour.
// - selector: CSS selector used to find the target element in the DOM
// - title/description: concise explanatory copy
// - preferredPlacement: side of the target used for tooltip placement
// - nudgeX/nudgeY: optional fine-grained offsets applied after placement
interface TourStep {
  id: string;
  selector: string;
  title: string;
  description: string;
  preferredPlacement?: Placement;
  nudgeX?: number;
  nudgeY?: number;
}

// Minimal geometry used to compute placement relative to the target.
interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Read the bounding rect of an element safely.
 * @param el - The DOM element to measure
 * @returns A simplified rect or null when the element is missing
 */
function getElementRect(el: Element | null): Rect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * Compute a tooltip position relative to a target rect. Honors a preferred
 * placement, applies optional pixel nudges, and clamps the final position to
 * keep the tooltip fully visible in the viewport.
 * @param rect - Target rectangle
 * @param placement - Preferred side for the tooltip
 * @param nudgeX - Optional horizontal offset
 * @param nudgeY - Optional vertical offset
 * @returns Coordinates for CSS top/left
 */
function computeTooltipPosition(
  rect: Rect,
  placement: Placement,
  nudgeX: number = 0,
  nudgeY: number = 0
): { top: number; left: number } {
  const margin = 10; // gap from target
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const tooltipWidth = Math.max(220, Math.min(320, vw - 16));
  const tooltipHeight = 160; // estimated; we clamp regardless

  const clamp = (val: number, min: number, max: number) =>
    Math.min(max, Math.max(min, val));

  let top = 0;
  let left = 0;

  switch (placement) {
    case "top":
      top = rect.top - tooltipHeight - margin;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case "bottom":
      top = rect.top + rect.height + margin;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case "left":
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - margin;
      break;
    case "right":
    default:
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left + rect.width + margin;
      break;
  }

  // Apply nudges then clamp into the viewport
  top += nudgeY;
  left += nudgeX;
  top = clamp(top, 8, Math.max(8, vh - tooltipHeight - 8));
  left = clamp(left, 8, Math.max(8, vw - tooltipWidth - 8));

  return { top, left };
}

// Per-page suppression: remember if the user closed the tour on a given route
const PAGE_CLOSED_KEY_PREFIX = "devops-insights:tour:closed:";
function isTourClosedForPath(pathname: string): boolean {
  try {
    return (
      window.localStorage.getItem(`${PAGE_CLOSED_KEY_PREFIX}${pathname}`) ===
      "1"
    );
  } catch {
    return false;
  }
}
function markTourClosedForPath(pathname: string) {
  try {
    window.localStorage.setItem(`${PAGE_CLOSED_KEY_PREFIX}${pathname}`, "1");
  } catch {}
}

// OnboardingHelpTour: a lightweight, non-blocking, in-product tour to help
// first-time users discover useful controls:
// - Auto refresh (live updates)
// - Regions grid (navigate to a region)
// - History tab (time ranges and trends)
//
// The tour triggers a few seconds after mounting and on client-side route
// changes, so it appears when navigating without a full reload.
/**
 * I render the onboarding spotlight overlay and step-by-step tooltip. I scan for
 * present DOM targets, advance steps, and handle layout changes gracefully.
 */
export default function OnboardingHelpTour() {
  // Overlay visibility and step index
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Geometry for highlight and tooltip
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Throttle for resize/scroll reflow, and delayed open timer
  const rafPendingRef = useRef(false);
  const openTimeoutRef = useRef<number | null>(null);
  const pathname = usePathname();

  // Steps used by the tour. If a step's target isn't present (e.g. no history
  // tab on the dashboard), the step is skipped automatically.
  const steps: TourStep[] = useMemo(
    () => [
      {
        id: "auto-refresh",
        selector: "[data-tour='auto-refresh']",
        title: "Auto refresh",
        description:
          "Toggle live updates. When on, data streams in automatically without manual refresh.",
        preferredPlacement: "left",
      },
      {
        id: "regions-grid",
        selector: "[data-tour='regions-grid']",
        title: "Regions",
        description:
          "Click any region to open its detailed page with live and historical metrics.",
        preferredPlacement: "top",
      },
      {
        id: "history-tab",
        selector: "[data-tour='history-tab']",
        title: "History",
        description:
          "Switch to the History tab to explore time ranges, trends and past performance for each region.",
        preferredPlacement: "bottom",
        nudgeX: -48, // slight left nudge so the tooltip stays comfortably in view
      },
    ],
    []
  );

  // Advance to the first step from startAt that has a visible DOM target
  const tryAdvanceToExistingStep = (startAt = 0) => {
    for (let i = startAt; i < steps.length; i += 1) {
      const step = steps[i];
      const el = document.querySelector(step.selector);
      if (el) {
        setActiveIndex(i);
        updateForElement(el as HTMLElement, step);
        return true;
      }
    }
    return false;
  };

  // Recompute the target rect and tooltip position for the current step
  const updateForElement = (el: HTMLElement, step: TourStep) => {
    const rect = getElementRect(el);
    if (!rect) return;
    setTargetRect(rect);
    const pos = computeTooltipPosition(
      rect,
      step.preferredPlacement || "right",
      step.nudgeX ?? 0,
      step.nudgeY ?? 0
    );
    setPosition(pos);
  };

  // Open the tour a few seconds after mount and on every route change.
  // We reset the state then schedule the tour so targets are present and laid out.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Do not reopen if the user has closed the tour on this path before
    if (pathname && isTourClosedForPath(pathname)) {
      setIsOpen(false);
      return;
    }
    if (openTimeoutRef.current != null) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }

    setIsOpen(false);
    setActiveIndex(0);

    openTimeoutRef.current = window.setTimeout(() => {
      const hasStep = tryAdvanceToExistingStep(0);
      setIsOpen(!!hasStep);
    }, 3000);

    return () => {
      if (openTimeoutRef.current != null) {
        clearTimeout(openTimeoutRef.current);
        openTimeoutRef.current = null;
      }
    };
  }, [pathname]);

  // Keep the tooltip aligned on scroll/resize without janking the UI thread
  useEffect(() => {
    if (!isOpen) return;
    const step = steps[activeIndex];
    const el = document.querySelector(step.selector) as HTMLElement | null;
    const handler = () => {
      if (rafPendingRef.current) return;
      rafPendingRef.current = true;
      requestAnimationFrame(() => {
        rafPendingRef.current = false;
        if (el) updateForElement(el, step);
      });
    };
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    handler();
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [isOpen, activeIndex, steps]);

  // Controls
  const finish = () => {
    if (pathname) markTourClosedForPath(pathname);
    setIsOpen(false);
  };
  const goNext = () => {
    const advanced = tryAdvanceToExistingStep(activeIndex + 1);
    if (!advanced) {
      if (pathname) markTourClosedForPath(pathname);
      setIsOpen(false);
    }
  };
  const skipAll = () => {
    if (pathname) markTourClosedForPath(pathname);
    setIsOpen(false);
  };

  if (!isOpen || !targetRect || !position) return null;

  // Overlay with spotlight and small tooltip card
  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* subtle backdrop */}
      <div className="absolute inset-0 bg-black/20" />

      {/* spotlight highlight around the target element */}
      <div
        className="absolute border-2 border-blue-500/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.2)]"
        style={{
          top: `${Math.max(4, targetRect.top - 6)}px`,
          left: `${Math.max(4, targetRect.left - 6)}px`,
          width: `${targetRect.width + 12}px`,
          height: `${targetRect.height + 12}px`,
          pointerEvents: "none",
        }}
      />

      {/* help tooltip */}
      <div
        className="absolute w-[320px] max-w-[90vw] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 pointer-events-auto"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {steps[activeIndex].title}
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
          {steps[activeIndex].description}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={skipAll}
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              {activeIndex + 1} / {steps.length}
            </div>
            <button
              className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
              onClick={goNext}
            >
              {activeIndex + 1 === steps.length ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
