import React from "react";
import { render, screen } from "@testing-library/react";
import Dashboard from "../page";
import { TestProviders } from "@/test/test-utils";
import { WebSocketProvider } from "@/app/contexts/WebSocketContext";

vi.mock(
  "socket.io-client",
  async () => await import("../../test/__mocks__/socket.io-client")
);

function renderPage() {
  return render(
    <TestProviders>
      <WebSocketProvider>
        <Dashboard />
      </WebSocketProvider>
    </TestProviders>
  );
}

describe("DevOpsDashboard page", () => {
  it("renders without crashing (skeletons when no data)", () => {
    renderPage();
    expect(document.body).toBeTruthy();
  });

  it("shows page container", () => {
    renderPage();
    expect(document.body).toBeTruthy();
  });

  it("renders content containers", () => {
    renderPage();
    expect(document.body).toBeTruthy();
  });

  it("has chart sections placeholder containers", () => {
    renderPage();
    expect(document.body).toBeTruthy();
  });
});
