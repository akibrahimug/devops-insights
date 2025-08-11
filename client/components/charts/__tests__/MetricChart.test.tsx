import React from "react";
import { render, screen } from "@testing-library/react";
import { MetricChart } from "../MetricChart";

describe("MetricChart", () => {
  it("renders skeleton when no data", () => {
    const { queryByTestId } = render(
      <MetricChart type="line" data={{ datasets: [] }} isLoading={false} />
    );
    expect(queryByTestId("mock-chart")).toBeNull();
  });
  it("renders mock chart when datasets available", () => {
    render(
      <MetricChart
        type="line"
        data={{ labels: ["a"], datasets: [{ data: [1] }] }}
        isLoading={false}
        height={100}
      />
    );
    expect(screen.getByTestId("mock-chart")).toBeInTheDocument();
  });
  it("respects height prop", () => {
    render(
      <MetricChart
        type="bar"
        data={{ labels: ["a"], datasets: [{ data: [1] }] }}
        height={123}
      />
    );
    expect(screen.getByTestId("mock-chart")).toHaveStyle({ height: 123 });
  });
  it("applies theme-aware options without crash", () => {
    render(
      <MetricChart
        type="bar"
        data={{ labels: ["a"], datasets: [{ data: [1] }] }}
      />
    );
    expect(screen.getByTestId("mock-chart")).toBeTruthy();
  });
});
