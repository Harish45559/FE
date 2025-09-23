import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./login.css";
import "./forgot.css"; // ← add this file (container/card look)

const ForgotPassword = () => {
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");    // show success/error text
  const [isError, setIsError] = useState(false); // toggle message style
  const [loading, setLoading] = useState(false); // disable button during call
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    // basic client-side validation (server also validates)
    if (!username.trim() || !newPassword) {
      setIsError(true);
      setMessage("Please enter username and new password.");
      return;
    }
    if (newPassword.length < 8) {
      setIsError(true);
      setMessage("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", {
        username: username.trim(),
        newPassword,
      });

      // backend should return { message: "..." }
      const text = (res?.data && res.data.message) || "Password updated successfully.";
      setIsError(false);
      setMessage(text);

      // optional UX: clear fields after success
      setUsername("");
      setNewPassword("");

      // optional: navigate to login after a short delay
      // setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      const text =
        err?.response?.data?.message ||
        err?.message ||
        "Network or server error. Please try again.";
      setIsError(true);
      setMessage(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <div className="forgot-box">
        <h2>Forgot Password</h2>

        <form onSubmit={handleReset} noValidate>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            aria-label="Username"
            required
          />

          <input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            aria-label="New password"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        {message && (
          <p className={`message ${isError ? "error" : "success"}`}>{message}</p>
        )}

        {/* Optional link back to login */}
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            className="linklike"
            onClick={() => navigate("/login")}
            aria-label="Back to login"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
