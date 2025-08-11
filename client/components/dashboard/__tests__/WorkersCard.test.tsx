import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkersCard } from "../WorkersCard";

const workers: Array<[string, any]> = [
  [
    "email-sender",
    {
      workers: 10,
      idle: 4,
      waiting: 2,
      recently_blocked_keys: ["abc12345"],
      top_keys: [["k1", 3]],
    },
  ],
];

describe("WorkersCard", () => {
  it("renders title", () => {
    render(<WorkersCard workers={workers} />);
    expect(screen.getAllByText(/Workers/i).length).toBeGreaterThan(0);
  });
  it("renders worker display name", () => {
    render(<WorkersCard workers={workers} />);
    expect(screen.getByText(/Email Sender/)).toBeInTheDocument();
  });
  it("masks keys by default and can reveal", () => {
    render(<WorkersCard workers={workers} />);
    fireEvent.click(screen.getByText(/Recently Blocked/i));
    const toggle = screen.getAllByRole("button", {
      name: /Show keys|Hide keys/i,
    })[0];
    fireEvent.click(toggle);
    expect(screen.getByText(/abc12345/)).toBeInTheDocument();
  });
  it("shows queue percentage", () => {
    render(<WorkersCard workers={workers} />);
    // progress bar is present with aria-label
    expect(screen.getByLabelText(/Queue/)).toBeInTheDocument();
  });
});
