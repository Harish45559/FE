import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import customerApi from "../../services/customerApi";
import "../login.css";

const CustomerResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [form, setForm]           = useState({ password: "", confirm: "" });
  const [showPassword, setShowPw] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  useEffect(() => {
    if (!token) setError("Invalid or missing reset token. Please request a new link.");
  }, [token]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.password || form.password.length < 8)
      return setError("Password must be at least 8 characters");
    if (form.password !== form.confirm)
      return setError("Passwords do not match");

    try {
      setLoading(true);
      await customerApi.post("/customer/auth/reset-password", {
        token,
        password: form.password,
      });
      setSuccess(true);
      setTimeout(() => navigate("/customer/login"), 2500);
    } catch (err) {
      setError(err?.response?.data?.message || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background" />
      <div className="login-card">
        <img className="brand-logo" src="/logo2.png" alt="Mirchi Mafia" draggable="false" />
        <h2 className="title">New Password</h2>

        {error && <div className="alert error">{error}</div>}

        {success ? (
          <div style={{ textAlign: "center", color: "#6effc2", fontSize: "0.92rem", lineHeight: "1.7" }}>
            ✅ Password updated successfully!<br />
            <span style={{ color: "#aaa", fontSize: "0.82rem" }}>Redirecting to login…</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="password-wrapper">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="New password (min 8 chars)"
                value={form.password}
                onChange={handleChange}
                disabled={!token}
              />
              <button type="button" className="toggle-password" onClick={() => setShowPw((p) => !p)}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <input
              name="confirm"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={form.confirm}
              onChange={handleChange}
              disabled={!token}
            />
            <button type="submit" className="btn-primary" disabled={loading || !token}>
              {loading ? "Saving…" : "Set New Password"}
            </button>
          </form>
        )}

        <p className="forgot" style={{ marginTop: "18px" }}>
          <Link to="/customer/login">← Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerResetPassword;
