import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard";

vi.mock("../components/DashboardLayout", () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

vi.mock("../services/api", () => ({
  default: { get: vi.fn() },
}));

import api from "../services/api";

const today = new Date();
const pad = (n) => String(n).padStart(2, "0");
const todayStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;

const mockOrder = (overrides = {}) => ({
  id: "1",
  order_number: "001",
  customer_name: "John",
  order_type: "Dine In",
  payment_method: "Cash",
  final_amount: 20.0,
  total_amount: 20.0,
  discount_amount: 0,
  items: [{ name: "Burger", qty: 2 }],
  date: todayStr,
  ...overrides,
});

const mockEmployee = (overrides = {}) => ({
  id: "e1",
  first_name: "Ali",
  last_name: "Khan",
  attendance_status: "Clocked In",
  ...overrides,
});

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

describe("Dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── Loading state ────────────────────────────────────────────────────
  it("shows loading spinner initially", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderDashboard();
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  // ── Empty state (positive render, no data) ───────────────────────────
  it("shows 'No orders today yet' when no orders exist", async () => {
    api.get.mockResolvedValue({ data: [] });
    renderDashboard();
    expect(await screen.findByText(/no orders today yet/i)).toBeInTheDocument();
  });

  it("shows 'No employees found' when employees list is empty", async () => {
    api.get.mockResolvedValue({ data: [] });
    renderDashboard();
    expect(await screen.findByText(/no employees found/i)).toBeInTheDocument();
  });

  it("shows 'No held orders' when held orders list is empty", async () => {
    api.get.mockResolvedValue({ data: [] });
    renderDashboard();
    expect(await screen.findByText(/no held orders/i)).toBeInTheDocument();
  });

  // ── Stats with data (positive) ───────────────────────────────────────
  it("displays today's revenue correctly in stat card", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/orders/all") return Promise.resolve({ data: [mockOrder({ final_amount: 45.5 })] });
      if (url === "/attendance/dashboard") return Promise.resolve({ data: [] });
      if (url === "/orders/held") return Promise.resolve({ data: [] });
    });
    renderDashboard();
    await waitFor(() => {
      const revenueEl = document.getElementById("dash-stat-revenue-value");
      expect(revenueEl).not.toBeNull();
      expect(revenueEl.textContent).toContain("45.50");
    });
  });

  it("shows correct order count", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/orders/all")
        return Promise.resolve({
          data: [mockOrder({ id: "1" }), mockOrder({ id: "2", order_number: "002" })],
        });
      return Promise.resolve({ data: [] });
    });
    renderDashboard();
    await waitFor(() => {
      const ordersEl = document.getElementById("dash-stat-orders-value");
      expect(ordersEl?.textContent).toContain("2");
    });
  });

  it("shows clocked-in staff count", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/attendance/dashboard")
        return Promise.resolve({
          data: [
            mockEmployee({ attendance_status: "Clocked In" }),
            mockEmployee({ id: "e2", attendance_status: "Clocked Out" }),
          ],
        });
      return Promise.resolve({ data: [] });
    });
    renderDashboard();
    await waitFor(() => {
      const staffEl = document.getElementById("dash-stat-staff-value");
      expect(staffEl?.textContent).toContain("1");
    });
  });

  it("shows employee name in staff section", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/attendance/dashboard")
        return Promise.resolve({ data: [mockEmployee()] });
      return Promise.resolve({ data: [] });
    });
    renderDashboard();
    // Name is split across spans — check for first name at minimum
    await waitFor(() => {
      expect(screen.getByText(/Ali.*Khan|Ali Khan/)).toBeInTheDocument();
    });
  });

  it("shows recent order in recent orders section", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/orders/all")
        return Promise.resolve({ data: [mockOrder({ customer_name: "Jane Doe" })] });
      return Promise.resolve({ data: [] });
    });
    renderDashboard();
    expect(await screen.findByText(/Jane Doe/)).toBeInTheDocument();
  });

  // ── Till status (positive) ────────────────────────────────────────────
  it("shows till as open when localStorage flag is set", async () => {
    localStorage.setItem("isTillOpen", "true");
    localStorage.setItem("tillOpenedBy", "Manager1");
    api.get.mockResolvedValue({ data: [] });
    renderDashboard();
    await waitFor(() => {
      const tillCard = document.getElementById("dash-till-summary");
      expect(tillCard?.textContent).toContain("Open");
    });
  });

  it("shows till as closed when localStorage flag is false", async () => {
    localStorage.setItem("isTillOpen", "false");
    api.get.mockResolvedValue({ data: [] });
    renderDashboard();
    await waitFor(() => {
      const tillCard = document.getElementById("dash-till-summary");
      expect(tillCard?.textContent).toContain("Closed");
    });
  });

  // ── Top items (positive) ──────────────────────────────────────────────
  it("shows top selling items", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/orders/all")
        return Promise.resolve({
          data: [mockOrder({ items: [{ name: "Spicy Wings", qty: 5 }] })],
        });
      return Promise.resolve({ data: [] });
    });
    renderDashboard();
    expect(await screen.findByText("Spicy Wings")).toBeInTheDocument();
  });

  // ── API failure (negative) ────────────────────────────────────────────
  it("still renders dashboard when all APIs fail (Promise.allSettled)", async () => {
    api.get.mockRejectedValue(new Error("Network error"));
    renderDashboard();
    await waitFor(() => {
      expect(screen.queryByText(/loading dashboard/i)).not.toBeInTheDocument();
    });
  });

  it("shows £0.00 revenue when no orders", async () => {
    api.get.mockResolvedValue({ data: [] });
    renderDashboard();
    await waitFor(() => {
      const revenueEl = document.getElementById("dash-stat-revenue-value");
      expect(revenueEl?.textContent).toContain("0.00");
    });
  });
});
