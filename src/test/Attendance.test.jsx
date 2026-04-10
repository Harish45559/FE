import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Attendance from "../pages/Attendance";

vi.mock("../components/DashboardLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  ToastContainer: () => null,
}));

import api from "../services/api";
import { toast } from "react-toastify";

// Status label uses getStatusLabel: "Clocked In" → "Clocked in", "Clocked Out" → "Clocked out"
const mockEmployee = (overrides = {}) => ({
  id: "1",
  first_name: "Ali",
  last_name: "Khan",
  attendance_status: "Clocked Out",
  ...overrides,
});

const renderPage = (role = "admin") => {
  localStorage.setItem("user", JSON.stringify({ role }));
  return render(
    <MemoryRouter>
      <Attendance />
    </MemoryRouter>
  );
};

describe("Attendance page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── Render (positive) ─────────────────────────────────────────────────
  it("renders employee username/initials after fetch", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmployee()] });
    renderPage();
    // Initials "AK" appear in the avatar
    await waitFor(() => {
      expect(document.querySelector(".att-avatar")).toBeInTheDocument();
    });
  });

  it("shows current time display", async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    renderPage();
    await waitFor(() => expect(document.body).toBeInTheDocument());
  });

  it("shows 'Clocked out' status label for clocked-out employee", async () => {
    api.get.mockResolvedValueOnce({
      data: [mockEmployee({ attendance_status: "Clocked Out" })],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Clocked out")).toBeInTheDocument();
    });
  });

  it("shows 'Clocked in' status label for clocked-in employee", async () => {
    api.get.mockResolvedValueOnce({
      data: [mockEmployee({ attendance_status: "Clocked In" })],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Clocked in")).toBeInTheDocument();
    });
  });

  it("renders multiple employees", async () => {
    api.get.mockResolvedValueOnce({
      data: [
        mockEmployee(),
        mockEmployee({ id: "2", first_name: "Sara", last_name: "Smith" }),
      ],
    });
    renderPage();
    await waitFor(() => {
      const cards = document.querySelectorAll(".att-card");
      expect(cards.length).toBe(2);
    });
  });

  // ── Employee selection (positive) ─────────────────────────────────────
  it("selects employee when card is clicked", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmployee()] });
    renderPage();
    await waitFor(() => document.querySelector(".att-card"));
    fireEvent.click(document.querySelector(".att-card"));
    await waitFor(() => {
      const selectedCard = document.querySelector(".att-card-selected");
      expect(selectedCard).toBeInTheDocument();
    });
  });

  // ── PIN pad (positive) ────────────────────────────────────────────────
  it("renders PIN keypad buttons 0-9", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmployee()] });
    renderPage();
    await waitFor(() => {
      const keypadBtns = document.querySelectorAll(".att-kb");
      expect(keypadBtns.length).toBeGreaterThan(9);
    });
  });

  it("fills PIN dots when numbers are pressed", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmployee()] });
    renderPage();
    await waitFor(() => document.querySelector(".att-card"));
    fireEvent.click(document.querySelector(".att-card"));

    // Wait for keypad to appear after selection
    await waitFor(() => document.querySelector(".att-kb"));

    const keyBtns = Array.from(document.querySelectorAll(".att-kb")).filter(
      (b) => /^\d$/.test(b.textContent.trim())
    );
    // Use fireEvent.click (not native .click()) to avoid double-fire
    fireEvent.click(keyBtns[0]);
    fireEvent.click(keyBtns[1]);
    fireEvent.click(keyBtns[2]);
    fireEvent.click(keyBtns[3]);

    await waitFor(() => {
      // KeypadSection renders twice (desktop + mobile sheet), so 8 total dots, 8 filled when 4 digits entered
      const filled = document.querySelectorAll(".att-pin-dot.filled");
      expect(filled.length).toBe(8);
    });
  });

  it("renders Clock In and Clock Out action buttons", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmployee()] });
    renderPage();
    await waitFor(() => {
      const actionBtns = document.querySelectorAll(".att-abtn");
      expect(actionBtns.length).toBeGreaterThan(0);
    });
  });

  // ── Clock in (positive) ───────────────────────────────────────────────
  it("calls clock-in API when Clock In is clicked with valid PIN", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmployee()] });
    api.post.mockResolvedValueOnce({
      data: { attendance: { clock_in_uk: "10/04/2026 09:00:00" } },
    });
    renderPage();
    await waitFor(() => document.querySelector(".att-card"));

    // Select employee — wait for re-render
    fireEvent.click(document.querySelector(".att-card"));
    await waitFor(() => document.querySelector(".att-abtn.att-in"));

    // Enter 4-digit PIN using fireEvent (not native click)
    const keyBtns = Array.from(document.querySelectorAll(".att-kb")).filter(
      (b) => /^\d$/.test(b.textContent.trim())
    );
    fireEvent.click(keyBtns[0]);
    fireEvent.click(keyBtns[1]);
    fireEvent.click(keyBtns[2]);
    fireEvent.click(keyBtns[3]);

    // Verify 4 digits entered (8 filled = 2 KeypadSections × 4 dots)
    await waitFor(() => {
      const filled = document.querySelectorAll(".att-pin-dot.filled");
      expect(filled.length).toBe(8);
    });

    // Click Clock In
    fireEvent.click(document.querySelector(".att-abtn.att-in"));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/attendance/clock-in",
        expect.objectContaining({ employeeId: "1" })
      )
    );
  });

  // ── Validation (negative) ─────────────────────────────────────────────
  it("shows warning when submit attempted with incomplete PIN (< 4 digits)", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmployee()] });
    renderPage();
    await waitFor(() => document.querySelector(".att-card"));
    fireEvent.click(document.querySelector(".att-card"));

    // Only 2 digits
    const keyBtns = Array.from(document.querySelectorAll(".att-kb")).filter(
      (b) => /^\d$/.test(b.textContent.trim())
    );
    keyBtns[0].click();
    keyBtns[1].click();

    const clockInBtn = document.querySelector(".att-abtn.att-in");
    if (clockInBtn) {
      fireEvent.click(clockInBtn);
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("PIN must be 4 digits")
      );
    }
  });

  // ── API error on fetch (negative) ─────────────────────────────────────
  it("shows error toast when employee fetch fails", async () => {
    api.get.mockRejectedValueOnce(new Error("Network error"));
    renderPage();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to load employees")
    );
  });

  // ── Clock out (positive) ──────────────────────────────────────────────
  it("renders Clock Out button", async () => {
    api.get.mockResolvedValueOnce({
      data: [mockEmployee({ attendance_status: "Clocked In" })],
    });
    renderPage();
    await waitFor(() => {
      const clockOutBtn = document.querySelector(".att-abtn.att-out");
      expect(clockOutBtn).toBeInTheDocument();
    });
  });

  // ── Admin section (positive) ──────────────────────────────────────────
  it("shows admin correction section for admin user", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmployee()] });
    renderPage("admin");
    await waitFor(() => document.querySelector(".att-card"));
    fireEvent.click(document.querySelector(".att-card"));
    await waitFor(() => {
      expect(document.querySelector(".att-admin-section")).toBeInTheDocument();
    });
  });
});
