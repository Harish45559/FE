import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import customerApi from "../../services/customerApi";
import "../login.css";

const CustomerLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email.trim()) return setError("Email is required");
    if (!form.password) return setError("Password is required");

    try {
      setLoading(true);
      const res = await customerApi.post("/customer/auth/login", form);
      const { token, customer } = res.data;
      localStorage.setItem("customer_token", token);
      localStorage.setItem("customer_user", JSON.stringify(customer));
      navigate("/customer/menu");
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background" />
      <div className="login-card">
        <img className="brand-logo" src="/logo2.png" alt="Mirchi Mafia" draggable="false" />
        <h2 className="title">Order Online</h2>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <input
            name="email"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
          />
          <div className="password-wrapper">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
            />
            <button type="button" className="toggle-password" onClick={() => setShowPassword((p) => !p)}>
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="forgot">
          <Link to="/customer/forgot-password">Forgot password?</Link>
        </p>
        <p className="forgot">
          Don't have an account? <Link to="/customer/register">Register here</Link>
        </p>
        <p className="tagline">"Spice so good, it should be illegal."</p>
      </div>
    </div>
  );
};

export default CustomerLogin;
