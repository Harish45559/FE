import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";

const renderWithRouter = (ui, { initialEntries = ["/"] } = {}) =>
  render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);

describe("ProtectedRoute", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("redirects to /login when no user in localStorage", () => {
    renderWithRouter(
      <ProtectedRoute allowedRoles={["admin"]}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to /attendance when user role not in allowedRoles", () => {
    localStorage.setItem("user", JSON.stringify({ role: "employee" }));
    renderWithRouter(
      <ProtectedRoute allowedRoles={["admin"]}>
        <div>Admin Only</div>
      </ProtectedRoute>
    );
    expect(screen.queryByText("Admin Only")).not.toBeInTheDocument();
  });

  it("renders children when user role is allowed", () => {
    localStorage.setItem("user", JSON.stringify({ role: "admin" }));
    renderWithRouter(
      <ProtectedRoute allowedRoles={["admin"]}>
        <div>Admin Dashboard</div>
      </ProtectedRoute>
    );
    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
  });

  it("renders children when user has one of multiple allowed roles", () => {
    localStorage.setItem("user", JSON.stringify({ role: "manager" }));
    renderWithRouter(
      <ProtectedRoute allowedRoles={["admin", "manager"]}>
        <div>Manager View</div>
      </ProtectedRoute>
    );
    expect(screen.getByText("Manager View")).toBeInTheDocument();
  });
});
