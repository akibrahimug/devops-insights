import "@testing-library/jest-dom/vitest";
import { expect, vi } from "vitest";
import React from "react";

// Mock next/navigation hooks used by pages
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<any>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useParams: () => ({ region: "us-east-1" }),
  };
});

// Mock next/link as a simple anchor for tests
vi.mock("next/link", () => {
  return {
    __esModule: true,
    default: ({ href, children }: any) => (
      <a href={typeof href === "string" ? href : "#"}>{children}</a>
    ),
  };
});

// Mock react-chartjs-2 to a lightweight component to avoid Chart.js internals in tests
vi.mock("react-chartjs-2", () => {
  return {
    __esModule: true,
    Chart: ({ type, data, height }: any) => (
      <div data-testid="mock-chart" data-type={type} style={{ height }}>
        {JSON.stringify({
          labels: data?.labels,
          datasets: data?.datasets?.length,
        })}
      </div>
    ),
  };
});

// Mock next-themes to force a stable theme
vi.mock("next-themes", async () => {
  const actual = await vi.importActual<any>("next-themes");
  return {
    ...actual,
    useTheme: () => ({ theme: "light", setTheme: () => {} }),
    ThemeProvider: ({ children }: any) => <>{children}</>,
  };
});

// Chart.js canvas mocking to avoid layout/measurement issues
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
  }),
});
