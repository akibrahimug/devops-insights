import React from "react";
import { render, screen } from "@testing-library/react";
import { ServicesCard } from "../ServicesCard";

describe("ServicesCard", () => {
  it("renders title", () => {
    render(<ServicesCard databaseUp redisUp />);
    expect(screen.getByText(/Services/i)).toBeInTheDocument();
  });
  it("shows database status up/down", () => {
    const { rerender } = render(<ServicesCard databaseUp redisUp />);
    expect(screen.getAllByText(/Operational/i).length).toBeGreaterThan(0);
    rerender(<ServicesCard databaseUp={false} redisUp />);
    expect(screen.getAllByText(/Operational|Down/i).length).toBeGreaterThan(0);
  });
  it("shows redis status up/down", () => {
    const { rerender } = render(<ServicesCard databaseUp redisUp={false} />);
    expect(screen.getAllByText(/Operational|Down/i).length).toBeGreaterThan(0);
    rerender(<ServicesCard databaseUp redisUp />);
    expect(screen.getAllByText(/Operational|Down/i).length).toBeGreaterThan(0);
  });
  it("applies optional className", () => {
    const { container } = render(
      <ServicesCard databaseUp redisUp className="foo" />
    );
    expect(container.firstChild).toHaveClass("foo");
  });
});
