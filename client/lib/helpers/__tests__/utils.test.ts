import {
  capitalizeWords,
  formatRegionName,
  removeHyphens,
  formatNumber,
  formatCompactNumber,
  formatPercentage,
  formatBytes,
  formatRelativeTime,
  getServerHealthStatus,
  getMetricColor,
  getChartColor,
  parseErrorRate,
  getPerformanceRating,
  formatUptime,
  windowMsForRange,
  bucketMsForRange,
  formatTimeLabelForRange,
  calculateTrend,
} from "@/lib/helpers/utils";

describe("utils formatting", () => {
  it("capitalizeWords", () => {
    expect(capitalizeWords("hello world")).toBe("Hello World");
  });
  it("formatRegionName", () => {
    expect(formatRegionName("us-east-1")).toBe("US East 1");
  });
  it("removeHyphens", () => {
    expect(removeHyphens("a-b-c")).toBe("a b c");
  });
  it("formatNumber", () => {
    expect(formatNumber(123456)).toMatch("123,456");
  });
  it("formatCompactNumber", () => {
    expect(formatCompactNumber(1234)).toMatch(/1(\.|,)2k|1k/);
  });
  it("formatPercentage", () => {
    expect(formatPercentage(1)).toBe("1.00%");
  });
  it("formatBytes", () => {
    expect(formatBytes(1024)).toMatch("KB");
  });
  it("formatRelativeTime", () => {
    const ts = new Date(Date.now() - 30_000).toISOString();
    expect(formatRelativeTime(ts)).toMatch("s ago");
  });
});

describe("utils semantics", () => {
  it("getServerHealthStatus ok -> healthy", () => {
    expect(getServerHealthStatus("ok").status).toBe("healthy");
  });
  it("getServerHealthStatus not ok -> critical", () => {
    expect(getServerHealthStatus("down").status).toBe("critical");
  });
  it("getMetricColor thresholds", () => {
    const t = { good: 1, warning: 2, critical: 3 };
    expect(getMetricColor(0.5, t)).toMatch("green");
    expect(getMetricColor(2.5, t)).toMatch("yellow");
    expect(getMetricColor(3.5, t)).toMatch("red");
  });
  it("getChartColor known and default", () => {
    expect(getChartColor("cpu").border).toBeTruthy();
    expect(getChartColor("unknown").border).toBeTruthy();
  });
  it("parseErrorRate", () => {
    expect(parseErrorRate("1.23")).toBeCloseTo(1.23);
  });
  it("getPerformanceRating trend", () => {
    const r = getPerformanceRating(1, 200);
    expect(["Excellent", "Good", "Fair", "Poor"]).toContain(r.rating);
  });
  it("formatUptime", () => {
    const ts = new Date(Date.now() - 3600_000).toISOString();
    expect(formatUptime(ts)).toMatch(/\d+h/);
  });
});

describe("range helpers", () => {
  it("windowMsForRange and bucketMsForRange exist", () => {
    expect(windowMsForRange("1m")).toBeGreaterThan(0);
    expect(bucketMsForRange("1m")).toBeGreaterThan(0);
  });
  it("formatTimeLabelForRange", () => {
    const label = formatTimeLabelForRange(new Date(), "1h");
    expect(typeof label).toBe("string");
  });
  it("calculateTrend", () => {
    const t = calculateTrend(110, 100);
    expect(t.direction).toBe("up");
  });
});
