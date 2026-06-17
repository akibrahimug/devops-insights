import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppHeader } from "../AppHeader";

describe("AppHeader cached badge", () => {
  it("shows a cached badge with snapshot age when data is stale", () => {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    render(
      <AppHeader connected dataStale snapshotSavedAt={twoMinAgo} />
    );
    // Badge is present and surfaces the snapshot age.
    expect(screen.getAllByText(/Cached/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/2m ago/)).toBeInTheDocument();
    expect(screen.getByText(/updating/i)).toBeInTheDocument();
  });

  it("omits the age for the bundled seed (no timestamp)", () => {
    render(<AppHeader connected dataStale snapshotSavedAt={null} />);
    expect(screen.getAllByText(/Cached/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
  });

  it("hides the badge once data is live", () => {
    render(<AppHeader connected dataStale={false} />);
    expect(screen.queryByText(/Cached/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/updating/i)).not.toBeInTheDocument();
  });
});
