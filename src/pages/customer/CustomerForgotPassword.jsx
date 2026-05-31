import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import customerApi from "../../services/customerApi";
import "../login.css";

const CustomerForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);
  const [resetToken, setResetToken] = useState(""); // populated in dev so user can proceed

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Please enter your email address");

    try {
      setLoading(true);
      const res = await customerApi.post("/customer/auth/forgot-password", { email });
      const token = res.data.resetToken;
      if (token) {
        navigate(`/customer/reset-password?token=${token}`);
      } else {
        setSent(true);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goToReset = () => {
    if (resetToken) {
      navigate(`/customer/reset-password?token=${resetToken}`);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background" />
      <div className="login-card">
        <img className="brand-logo" src="/logo2.png" alt="Mirchi Mafia" draggable="false" />
        <h2 className="title">Reset Password</h2>

        {error && <div className="alert error">{error}</div>}

        {!sent ? (
          <>
            <p style={{ color: "#aaa", fontSize: "0.88rem", marginBottom: "16px" }}>
              Enter the email address on your account and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="login-form">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            {resetToken ? (
              <>
                <p style={{ color: "#6effc2", fontSize: "0.92rem", marginBottom: "18px", lineHeight: "1.6" }}>
                  ✅ Reset link generated.<br />
                  Click below to set your new password.
                </p>
                <button className="btn-primary" onClick={goToReset}>
                  Continue to Reset Password →
                </button>
              </>
            ) : (
              <div style={{ color: "#6effc2", fontSize: "0.92rem", marginBottom: "18px", lineHeight: "1.8", textAlign: "left" }}>
                <p style={{ marginBottom: "12px" }}>✅ Password reset email sent to <strong>{email}</strong></p>
                <p style={{ color: "#aaa", fontSize: "0.85rem" }}>
                  📬 If you don't see it in your inbox within 2 minutes:
                </p>
                <ul style={{ color: "#aaa", fontSize: "0.85rem", paddingLeft: "18px", marginTop: "6px" }}>
                  <li>Check your <strong style={{ color: "#fff" }}>Spam</strong> or <strong style={{ color: "#fff" }}>Junk</strong> folder</li>
                  <li>Check <strong style={{ color: "#fff" }}>Promotions</strong> tab (Gmail)</li>
                  <li>Search for <strong style={{ color: "#fff" }}>mirchimafiyaluton@gmail.com</strong></li>
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="forgot" style={{ marginTop: "18px" }}>
          <Link to="/customer/login">← Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerForgotPassword;
