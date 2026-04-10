import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Employees from "../pages/Employees";

vi.mock("../components/DashboardLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import api from "../services/api";

const mockEmp = (overrides = {}) => ({
  id: "1",
  first_name: "Ahmed",
  last_name: "Ali",
  username: "ahmed.ali",
  email: "ahmed@example.com",
  phone: "9876543210",
  gender: "male",
  role: "employee",
  dob: "1990-01-01",
  joining_date: "2022-01-01",
  brp: "ZA123456",
  address: "123 Street",
  ...overrides,
});

const renderPage = () => {
  localStorage.setItem("token", "testtoken");
  return render(
    <MemoryRouter>
      <Employees />
    </MemoryRouter>
  );
};

describe("Employees page", () => {
  beforeEach(() => {
    vi.resetAllMocks(); // resets queued mockResolvedValueOnce values between tests
    localStorage.clear();
  });

  // ── Render / list ─────────────────────────────────────────────────────
  it("shows employee email after load", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmp()] });
    renderPage();
    expect(await screen.findByText("ahmed@example.com")).toBeInTheDocument();
  });

  it("shows employee username after load", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmp()] });
    renderPage();
    expect(await screen.findByText("@ahmed.ali")).toBeInTheDocument();
  });

  it("shows 'No employees found' when list is empty", async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    renderPage();
    expect(await screen.findByText(/no employees found/i)).toBeInTheDocument();
  });

  it("shows employee count in toolbar", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmp(), mockEmp({ id: "2", username: "sara" })] });
    renderPage();
    expect(await screen.findByText("2 employees")).toBeInTheDocument();
  });

  it("redirects to /login when no token", () => {
    api.get.mockResolvedValueOnce({ data: [] });
    render(<MemoryRouter><Employees /></MemoryRouter>);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  // ── Search (positive) ────────────────────────────────────────────────
  it("filters employees by name search — only Sara's row visible", async () => {
    api.get.mockResolvedValueOnce({
      data: [
        mockEmp(),
        mockEmp({ id: "2", first_name: "Sara", last_name: "Smith", email: "sara@x.com", username: "sara" }),
      ],
    });
    renderPage();
    // Wait for both rows — use email which is a clean single text node in <td>
    await screen.findByText("ahmed@example.com");
    await screen.findByText("sara@x.com");
    // Filter by Sara
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "Sara" } });
    expect(screen.getByText("sara@x.com")).toBeInTheDocument();
    expect(screen.queryByText("ahmed@example.com")).not.toBeInTheDocument();
  });

  it("filters employees by email search", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmp()] });
    renderPage();
    await screen.findByText("ahmed@example.com");
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "ahmed@example.com" },
    });
    expect(screen.getByText("ahmed@example.com")).toBeInTheDocument();
  });

  // ── Role filter (positive) ────────────────────────────────────────────
  it("filters by admin role — only admin email visible", async () => {
    api.get.mockResolvedValueOnce({
      data: [
        mockEmp({ role: "employee" }),
        mockEmp({ id: "2", first_name: "Boss", last_name: "Man", email: "boss@x.com", username: "boss", role: "admin" }),
      ],
    });
    renderPage();
    await screen.findByText("ahmed@example.com");
    await screen.findByText("boss@x.com");
    const roleSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(roleSelect, { target: { value: "admin" } });
    expect(screen.getByText("boss@x.com")).toBeInTheDocument();
    expect(screen.queryByText("ahmed@example.com")).not.toBeInTheDocument();
  });

  // ── Add employee form ─────────────────────────────────────────────────
  it("shows form when Add employee button is clicked", async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    renderPage();
    await screen.findByText(/no employees found/i);
    fireEvent.click(screen.getByRole("button", { name: /add employee/i }));
    expect(screen.getByText(/add new employee/i)).toBeInTheDocument();
  });

  it("hides form when header Cancel button is clicked", async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    renderPage();
    await screen.findByText(/no employees found/i);
    // Open form
    fireEvent.click(screen.getByRole("button", { name: /add employee/i }));
    expect(screen.getByText(/add new employee/i)).toBeInTheDocument();
    // The header button now shows "✕ Cancel" — click the form-footer Cancel button
    const cancelBtns = screen.getAllByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtns[0]);
    expect(screen.queryByText(/add new employee/i)).not.toBeInTheDocument();
  });

  // ── Form validation (negative) ────────────────────────────────────────
  it("shows required errors when submitting empty form", async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    renderPage();
    await screen.findByText(/no employees found/i);
    fireEvent.click(screen.getByRole("button", { name: /add employee/i }));
    const submitBtn = screen.getByRole("button", { name: /add employee/i, hidden: true });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
    });
  });

  it("shows invalid email error for bad email", async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    renderPage();
    await screen.findByText(/no employees found/i);
    fireEvent.click(screen.getByRole("button", { name: /add employee/i }));

    // Fill all required fields with valid values except email
    fireEvent.change(document.getElementById("first_name"), { target: { name: "first_name", value: "Ahmed" } });
    fireEvent.change(document.getElementById("last_name"), { target: { name: "last_name", value: "Ali" } });
    fireEvent.change(document.getElementById("username"), { target: { name: "username", value: "ahmed" } });
    fireEvent.change(document.getElementById("email"), { target: { name: "email", value: "notanemail" } });
    fireEvent.change(document.getElementById("phone"), { target: { name: "phone", value: "9876543210" } });
    fireEvent.change(document.getElementById("address"), { target: { name: "address", value: "123 St" } });
    fireEvent.change(document.getElementById("brp"), { target: { name: "brp", value: "ZA123456" } });
    fireEvent.change(document.getElementById("dob"), { target: { name: "dob", value: "1990-01-01" } });
    fireEvent.change(document.getElementById("joining_date"), { target: { name: "joining_date", value: "2022-01-01" } });
    fireEvent.change(document.getElementById("gender"), { target: { name: "gender", value: "male" } });
    fireEvent.change(document.getElementById("password"), { target: { name: "password", value: "password123" } });
    fireEvent.change(document.getElementById("pin"), { target: { name: "pin", value: "1234" } });

    const submitBtn = document.querySelector("button[type='submit']");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Invalid email format")).toBeInTheDocument();
    });
  });

  // ── Edit employee (positive) ──────────────────────────────────────────
  it("shows edit form when Edit is clicked", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmp()] });
    renderPage();
    await screen.findByText("ahmed@example.com");
    const editBtns = document.querySelectorAll(".ep-btn.ep-btn-edit");
    expect(editBtns.length).toBeGreaterThan(0);
    fireEvent.click(editBtns[0]);
    expect(screen.getByText(/edit employee/i)).toBeInTheDocument();
  });

  it("pre-fills form with employee data when editing", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmp()] });
    renderPage();
    await screen.findByText("ahmed@example.com");
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    const emailInput = document.getElementById("email");
    expect(emailInput?.value).toBe("ahmed@example.com");
  });

  // ── Delete employee ───────────────────────────────────────────────────
  it("calls delete API and refreshes list on confirm", async () => {
    api.get.mockResolvedValue({ data: [mockEmp()] });
    api.delete.mockResolvedValueOnce({});
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    renderPage();
    await screen.findByText("ahmed@example.com");
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/employees/1"));
  });

  it("does not call delete API when confirm is cancelled", async () => {
    api.get.mockResolvedValueOnce({ data: [mockEmp()] });
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    renderPage();
    await screen.findByText("ahmed@example.com");
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(api.delete).not.toHaveBeenCalled();
  });

  // ── API error (negative) ──────────────────────────────────────────────
  it("redirects to /login on 401 from employee fetch", async () => {
    api.get.mockRejectedValueOnce({ response: { status: 401 } });
    renderPage();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });
});
