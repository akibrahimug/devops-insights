import React from "react";
import { render, screen } from "@testing-library/react";
import { RegionsCard } from "../RegionsCard";
import { getServerHealthStatus } from "../../../lib/helpers/utils";

const regions = [
  {
    name: "us-east-1",
    displayName: "US East 1",
    serverStatus: "ok",
    strictness: false,
    version: "1.0.0",
    roles: ["api"],
    results: {
      stats: {
        online: 1,
        server: {
          cpus: 2,
          active_connections: 1,
          wait_time: 10,
          workers: [],
          cpu_load: 10,
        },
        servers_count: 1,
        session: 1,
      },
      services: { redis: true, database: true },
    },
    health: getServerHealthStatus("ok"),
  },
];

describe("RegionsCard", () => {
  it("renders heading and items", () => {
    render(<RegionsCard regions={regions as any} />);
    expect(screen.getByText(/Region statistics/i)).toBeInTheDocument();
    expect(screen.getByText("US East 1")).toBeInTheDocument();
  });
  it("shows version number", () => {
    render(<RegionsCard regions={regions as any} />);
    expect(screen.getByText(/Version:/i)).toBeInTheDocument();
  });
  it("lists roles and strictness", () => {
    render(<RegionsCard regions={regions as any} />);
    expect(screen.getByText(/Roles:/)).toBeInTheDocument();
    expect(screen.getByText(/Strict:/)).toBeInTheDocument();
  });
  it("links to region page", () => {
    render(<RegionsCard regions={regions as any} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href");
  });
});
