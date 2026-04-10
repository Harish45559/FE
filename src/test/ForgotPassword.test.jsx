import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ForgotPassword from "../pages/ForgotPassword";

vi.mock("../services/api", () => ({
  default: { post: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import api from "../services/api";

const renderPage = () =>
  render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>
  );

describe("ForgotPassword page", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Render ───────────────────────────────────────────────────────────
  it("renders username and new password inputs", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Enter username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter new password")).toBeInTheDocument();
  });

  it("renders Reset Password button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
  });

  it("renders Back to Login button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /back to login/i })).toBeInTheDocument();
  });

  // ── Client validation (negative) ────────────────────────────────────
  it("shows error when both fields are empty", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    expect(
      await screen.findByText("Please enter username and new password.")
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("shows error when only username is provided", async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Enter username"), {
      target: { value: "john" },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    expect(
      await screen.findByText("Please enter username and new password.")
    ).toBeInTheDocument();
  });

  it("shows error when password is less than 8 characters", async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Enter username"), {
      target: { value: "john" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    expect(
      await screen.findByText("Password must be at least 8 characters.")
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  // ── Successful reset (positive) ──────────────────────────────────────
  it("shows success message on successful reset", async () => {
    api.post.mockResolvedValueOnce({
      data: { message: "Password updated successfully." },
    });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Enter username"), {
      target: { value: "john" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    expect(
      await screen.findByText("Password updated successfully.")
    ).toBeInTheDocument();
  });

  it("clears fields after successful reset", async () => {
    api.post.mockResolvedValueOnce({
      data: { message: "Password updated successfully." },
    });
    renderPage();
    const usernameInput = screen.getByPlaceholderText("Enter username");
    const passwordInput = screen.getByPlaceholderText("Enter new password");
    fireEvent.change(usernameInput, { target: { value: "john" } });
    fireEvent.change(passwordInput, { target: { value: "newpassword123" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    await waitFor(() => expect(usernameInput.value).toBe(""));
    expect(passwordInput.value).toBe("");
  });

  it("disables button while loading", async () => {
    api.post.mockImplementationOnce(() => new Promise(() => {})); // never resolves
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Enter username"), {
      target: { value: "john" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /resetting/i })).toBeDisabled()
    );
  });

  // ── API errors (negative) ────────────────────────────────────────────
  it("shows API error message on failure", async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { message: "User not found" } },
    });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Enter username"), {
      target: { value: "unknown" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    expect(await screen.findByText("User not found")).toBeInTheDocument();
  });

  it("shows fallback error on network failure", async () => {
    api.post.mockRejectedValueOnce({ message: "Network Error" });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Enter username"), {
      target: { value: "john" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    expect(await screen.findByText("Network Error")).toBeInTheDocument();
  });

  // ── Navigation ───────────────────────────────────────────────────────
  it("navigates to /login when Back to Login clicked", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /back to login/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
