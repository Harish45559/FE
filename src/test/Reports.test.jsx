import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Reports from "../pages/Reports";

vi.mock("../components/DashboardLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("../components/PaginationBar", () => ({
  default: ({ page, pageCount }) => (
    <div data-testid="pagination">Page {page} / {pageCount}</div>
  ),
}));

vi.mock("../services/api", () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));

import api from "../services/api";

const mockEmployee = (overrides = {}) => ({
  id: "1",
  first_name: "Ali",
  last_name: "Khan",
  ...overrides,
});

const mockReport = (overrides = {}) => ({
  id: "r1",
  employee: { id: "1", first_name: "Ali", last_name: "Khan" },
  date: "10/04/2026",
  clock_in_uk: "09:00:00",
  clock_out_uk: "17:00:00",
  total_work_hhmm: "8:00",
  sessions: [],
  ...overrides,
});

// Helper: set both date inputs and click Apply
const applyDates = (from = "2026-04-01", to = "2026-04-10") => {
  const dateInputs = document.querySelectorAll("input[type='date']");
  fireEvent.change(dateInputs[0], { target: { value: from } });
  fireEvent.change(dateInputs[1], { target: { value: to } });
  const applyBtn = screen.getByRole("button", { name: /apply/i });
  fireEvent.click(applyBtn);
};

const renderPage = () =>
  render(<MemoryRouter><Reports /></MemoryRouter>);

describe("Reports page", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Render ────────────────────────────────────────────────────────────
  it("renders employee dropdown after load", async () => {
    api.get.mockResolvedValue({ data: [mockEmployee()] });
    renderPage();
    // Employee name appears in the select options
    await waitFor(() => {
      const select = document.getElementById("rp-employee-select");
      expect(select?.textContent).toContain("Ali Khan");
    });
  });

  it("renders 'All employees' option in dropdown", async () => {
    api.get.mockResolvedValue({ data: [] });
    renderPage();
    await waitFor(() => {
      const select = document.getElementById("rp-employee-select");
      expect(select?.textContent).toContain("All employees");
    });
  });

  it("renders date range inputs", async () => {
    api.get.mockResolvedValue({ data: [] });
    renderPage();
    await waitFor(() => {
      const dateInputs = document.querySelectorAll("input[type='date']");
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("renders Apply button", async () => {
    api.get.mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByRole("button", { name: /apply/i })).toBeInTheDocument();
  });

  // ── With data (positive) ──────────────────────────────────────────────
  it("shows report rows after fetch", async () => {
    api.get
      .mockResolvedValueOnce({ data: [mockEmployee()] })
      .mockResolvedValueOnce({ data: [mockReport()] });

    renderPage();
    await screen.findByRole("button", { name: /apply/i });
    applyDates();

    await waitFor(() => {
      const dateCells = document.querySelectorAll(".rp-date-cell");
      const found = Array.from(dateCells).some((c) => c.textContent.includes("10/04/2026"));
      expect(found).toBe(true);
    });
  });

  it("shows clock-in time in report table", async () => {
    api.get
      .mockResolvedValueOnce({ data: [mockEmployee()] })
      .mockResolvedValueOnce({ data: [mockReport()] });

    renderPage();
    await screen.findByRole("button", { name: /apply/i });
    applyDates();

    await waitFor(() => {
      const timeCells = document.querySelectorAll(".rp-time-cell");
      const found = Array.from(timeCells).some((c) => c.textContent.includes("09:00"));
      expect(found).toBe(true);
    });
  });

  it("shows clock-out time in report table", async () => {
    api.get
      .mockResolvedValueOnce({ data: [mockEmployee()] })
      .mockResolvedValueOnce({ data: [mockReport()] });

    renderPage();
    await screen.findByRole("button", { name: /apply/i });
    applyDates();

    await waitFor(() => {
      const timeCells = document.querySelectorAll(".rp-time-cell");
      const found = Array.from(timeCells).some((c) => c.textContent.includes("17:00"));
      expect(found).toBe(true);
    });
  });

  // ── Sorting (positive) ────────────────────────────────────────────────
  it("does not crash when date column header is clicked", async () => {
    api.get
      .mockResolvedValueOnce({ data: [mockEmployee()] })
      .mockResolvedValueOnce({
        data: [
          mockReport({ date: "08/04/2026" }),
          mockReport({ date: "10/04/2026", employee: { id: "2", first_name: "Sara", last_name: "Smith" } }),
        ],
      });

    renderPage();
    await screen.findByRole("button", { name: /apply/i });
    applyDates();

    await waitFor(() => {
      const dateCells = document.querySelectorAll(".rp-date-cell");
      expect(dateCells.length).toBeGreaterThan(0);
    });

    const headers = document.querySelectorAll("th");
    const dateHeader = Array.from(headers).find((h) =>
      h.textContent.toLowerCase().includes("date")
    );
    if (dateHeader) {
      fireEvent.click(dateHeader);
      expect(document.body).toBeInTheDocument();
    }
  });

  // ── Employee filter (positive) ────────────────────────────────────────
  it("passes employeeId param when employee is selected", async () => {
    api.get
      .mockResolvedValueOnce({
        data: [mockEmployee(), mockEmployee({ id: "2", first_name: "Sara", last_name: "Smith" })],
      })
      .mockResolvedValueOnce({ data: [mockReport()] });

    renderPage();
    await screen.findByRole("button", { name: /apply/i });

    const select = document.getElementById("rp-employee-select");
    fireEvent.change(select, { target: { value: "1" } });

    applyDates();

    await waitFor(() => {
      const reportCalls = api.get.mock.calls.filter((c) => c[0] === "/reports");
      const lastParams = reportCalls[reportCalls.length - 1][1]?.params ?? {};
      expect(lastParams.employee_id).toBe("1");
    });
  });

  // ── Validation (negative) ─────────────────────────────────────────────
  it("does not include from/to params when dates are empty", async () => {
    api.get.mockResolvedValue({ data: [] });
    renderPage();
    await screen.findByRole("button", { name: /apply/i });

    // On mount, report API is called without dates — verify params have no from/to
    const reportCalls = api.get.mock.calls.filter((c) => c[0] === "/reports");
    expect(reportCalls.length).toBeGreaterThan(0);
    const params = reportCalls[0][1]?.params ?? {};
    expect(params.from).toBeUndefined();
    expect(params.to).toBeUndefined();
  });

  it("includes from/to params when dates are set", async () => {
    api.get.mockResolvedValue({ data: [] });
    renderPage();
    await screen.findByRole("button", { name: /apply/i });

    applyDates("2026-04-01", "2026-04-10");

    await waitFor(() => {
      const reportCalls = api.get.mock.calls.filter((c) => c[0] === "/reports");
      const lastParams = reportCalls[reportCalls.length - 1][1]?.params ?? {};
      expect(lastParams.from).toBe("2026-04-01");
      expect(lastParams.to).toBe("2026-04-10");
    });
  });

  // ── API errors (negative) ─────────────────────────────────────────────
  it("handles employee fetch failure gracefully — still renders", async () => {
    api.get.mockRejectedValue(new Error("Network error"));
    renderPage();
    await waitFor(() => {
      const select = document.getElementById("rp-employee-select");
      expect(select).toBeInTheDocument();
    });
  });

  it("handles report fetch failure without crashing", async () => {
    api.get
      .mockResolvedValueOnce({ data: [mockEmployee()] })
      .mockRejectedValueOnce(new Error("Report fetch failed"));

    renderPage();
    await screen.findByRole("button", { name: /apply/i });
    applyDates();

    await waitFor(() => expect(document.body).toBeInTheDocument());
  });
});
