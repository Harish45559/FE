import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./login.css";

const Login = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Client validation
    if (!form.username.trim()) {
      setError("Username required");
      return;
    }

    if (!form.password) {
      setError("Password required");
      return;
    }

    try {
      const res = await api.post("/auth/login", form);

      const { token, role, username } = res.data || {};
      console.log("role from server:", role);

      if (!token || !role) {
        setError("Login failed: invalid server response");
        return;
      }
      localStorage.setItem("token", token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          username,
          role,
          token,
        }),
      );

      if (role === "admin") {
        navigate("/dashboard");
      } else if (role === "employee") {
        navigate("/attendance");
      } else {
        setError("Unknown role");
      }
    } catch (err) {
      const errorData = err?.response?.data;

      if (errorData?.errors) {
        const firstError = Object.values(errorData.errors)[0];
        setError(firstError);
      } else {
        setError(errorData?.message || "Login failed");
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-background"></div>

      <div className="login-card">
        <img
          className="brand-logo"
          src="/logo2.png"
          alt="Mirchi Mafia"
          draggable="false"
        />

        <h2 className="title">Welcome back</h2>

        {error && (
          <div className="alert error" id="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form" autoComplete="on">
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
          />

          <div className="password-wrapper">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
            />

            <button
              id="toggle-password"
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <button id="login-btn" type="submit" className="btn-primary">
            Sign In
          </button>
        </form>

        <p id="forgot-password" className="forgot">
          <a href="/forgot-password">Forgot password?</a>
        </p>

        <p className="tagline">“Spice so good, it should be illegal.”</p>
      </div>
    </div>
  );
};

export default Login;
