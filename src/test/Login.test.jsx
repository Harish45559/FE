import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login";

// Mock api
vi.mock("../services/api", () => ({
  default: { post: vi.fn() },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import api from "../services/api";

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── Render ──────────────────────────────────────────────────────────
  it("renders username, password inputs and sign in button", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders forgot password link", () => {
    renderLogin();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  // ── Password toggle ──────────────────────────────────────────────────
  it("toggles password visibility", () => {
    renderLogin();
    const passwordInput = screen.getByPlaceholderText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByText("👁️")); // toggle btn
    expect(passwordInput).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByText("🙈"));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  // ── Client-side validation (negative) ───────────────────────────────
  it("shows error when username is empty", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText("Username required")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("shows error when password is empty", async () => {
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "admin" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText("Password required")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  // ── Successful login (positive) ──────────────────────────────────────
  it("navigates to /dashboard for admin role", async () => {
    api.post.mockResolvedValueOnce({
      data: { token: "abc", role: "admin", username: "adminUser" },
    });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/dashboard"));
  });

  it("navigates to /attendance for employee role", async () => {
    api.post.mockResolvedValueOnce({
      data: { token: "abc", role: "employee", username: "emp1" },
    });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "emp1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/attendance"));
  });

  it("saves token and user to localStorage on success", async () => {
    api.post.mockResolvedValueOnce({
      data: { token: "mytoken", role: "admin", username: "adminUser" },
    });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(localStorage.getItem("token")).toBe("mytoken"));
    const user = JSON.parse(localStorage.getItem("user"));
    expect(user.role).toBe("admin");
  });

  // ── API errors (negative) ────────────────────────────────────────────
  it("shows API error message on failed login", async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { message: "Invalid credentials" } },
    });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });

  it("shows fallback error message when API returns no message", async () => {
    api.post.mockRejectedValueOnce({ response: { data: {} } });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText("Login failed")).toBeInTheDocument();
  });

  it("shows error for unknown role", async () => {
    api.post.mockResolvedValueOnce({
      data: { token: "abc", role: "superuser", username: "u1" },
    });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "u1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText("Unknown role")).toBeInTheDocument();
  });

  it("shows error when server returns no token", async () => {
    api.post.mockResolvedValueOnce({ data: { role: "admin" } });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(
      await screen.findByText("Login failed: invalid server response")
    ).toBeInTheDocument();
  });
});
