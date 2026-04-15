import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import customerApi from "../../services/customerApi";
import "../login.css";
import "./CustomerRegister.css";

/* ── Validators ───────────────────────────────────────────────────────────── */
const EMAIL_RE    = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
// UK mobile: 07xxxxxxxxx or +447xxxxxxxxx (11 digits local / 13 with +44)
const UK_PHONE_RE = /^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$/;
// UK postcode (case-insensitive)
const POSTCODE_RE = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;

function validate(form) {
  const name = form.name.trim();
  if (name.length < 2)                          return "Full name must be at least 2 characters";
  if (!/^[a-zA-Z\s'\-]+$/.test(name))          return "Name can only contain letters, spaces, hyphens and apostrophes";

  if (!EMAIL_RE.test(form.email.trim()))        return "Please enter a valid email address";

  const phone = form.phone.trim().replace(/\s/g, "");
  if (!UK_PHONE_RE.test(form.phone.trim()))     return "Please enter a valid UK mobile number (e.g. 07911 123456 or +44 7911 123456)";

  if (!form.address_line1.trim())               return "Address is required";
  if (form.city.trim().length < 2)              return "Please enter a valid city";

  if (!POSTCODE_RE.test(form.postcode.trim()))  return "Please enter a valid UK postcode (e.g. LU1 3BW)";

  if (form.password.length < 8)                 return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(form.password))          return "Password must contain at least one letter";
  if (!/[0-9]/.test(form.password))             return "Password must contain at least one number";

  return null;
}

/* ── Password strength ────────────────────────────────────────────────────── */
function passwordStrength(pw) {
  if (!pw) return { level: 0, label: "", color: "#555" };
  let score = 0;
  if (pw.length >= 8)                score++;
  if (pw.length >= 12)               score++;
  if (/[A-Z]/.test(pw))             score++;
  if (/[0-9]/.test(pw))             score++;
  if (/[^A-Za-z0-9]/.test(pw))      score++;
  if (score <= 1) return { level: score, label: "Weak",   color: "#e53e3e" };
  if (score <= 3) return { level: score, label: "Fair",   color: "#dd6b20" };
  if (score === 4) return { level: score, label: "Good",  color: "#38a169" };
  return              { level: score, label: "Strong", color: "#2b6cb0" };
}

const CustomerRegister = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    address_line1: "", city: "", postcode: "", password: "",
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const strength = passwordStrength(form.password);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear field-level error on change
    if (errors[e.target.name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[e.target.name]; return n; });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const fieldErrors = {};
    if (name === "name") {
      if (value.trim().length < 2) fieldErrors.name = "At least 2 characters";
    }
    if (name === "email") {
      if (!EMAIL_RE.test(value.trim())) fieldErrors.email = "Invalid email address";
    }
    if (name === "phone") {
      if (!UK_PHONE_RE.test(value.trim())) fieldErrors.phone = "Invalid UK mobile (e.g. 07911 123456)";
    }
    if (name === "postcode") {
      if (!POSTCODE_RE.test(value.trim())) fieldErrors.postcode = "Invalid UK postcode (e.g. LU1 3BW)";
    }
    if (name === "password") {
      if (value.length < 8) fieldErrors.password = "Min 8 characters";
      else if (!/[0-9]/.test(value)) fieldErrors.password = "Must include a number";
    }
    setErrors((prev) => ({ ...prev, ...fieldErrors }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitError("");
    const err = validate(form);
    if (err) return setSubmitError(err);

    try {
      setLoading(true);
      const res = await customerApi.post("/customer/auth/register", form);
      const { token, customer } = res.data;
      localStorage.setItem("customer_token", token);
      localStorage.setItem("customer_user", JSON.stringify(customer));
      navigate("/customer/menu");
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors?.length) {
        setSubmitError(data.errors[0].msg);
      } else {
        setSubmitError(data?.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background" />
      <div className="login-card reg-card">
        <img className="brand-logo" src="/logo2.png" alt="Mirchi Mafiya" draggable="false" />
        <h2 className="title">Create Account</h2>
        <p className="reg-subtitle">Join us to order online</p>

        {submitError && <div className="alert error">{submitError}</div>}

        <form onSubmit={handleRegister} className="login-form reg-form" noValidate>

          {/* Full name */}
          <div className="reg-field">
            <input
              data-testid="reg-name"
              name="name" type="text" placeholder="Full name"
              value={form.name} onChange={handleChange} onBlur={handleBlur}
              className={errors.name ? "input-err" : ""}
              autoComplete="name"
            />
            {errors.name && <span className="field-err">{errors.name}</span>}
          </div>

          {/* Email */}
          <div className="reg-field">
            <input
              data-testid="reg-email"
              name="email" type="email" placeholder="Email address"
              value={form.email} onChange={handleChange} onBlur={handleBlur}
              className={errors.email ? "input-err" : ""}
              autoComplete="email"
            />
            {errors.email && <span className="field-err">{errors.email}</span>}
          </div>

          {/* UK Phone */}
          <div className="reg-field">
            <input
              data-testid="reg-phone"
              name="phone" type="tel" placeholder="UK mobile (e.g. 07911 123456)"
              value={form.phone} onChange={handleChange} onBlur={handleBlur}
              className={errors.phone ? "input-err" : ""}
              autoComplete="tel"
            />
            {errors.phone && <span className="field-err">{errors.phone}</span>}
          </div>

          {/* Address */}
          <div className="reg-field">
            <input
              data-testid="reg-address"
              name="address_line1" type="text" placeholder="Address line 1"
              value={form.address_line1} onChange={handleChange}
              autoComplete="street-address"
            />
          </div>

          {/* City + Postcode */}
          <div className="reg-row">
            <div className="reg-field" style={{ flex: 1 }}>
              <input
                data-testid="reg-city"
                name="city" type="text" placeholder="City"
                value={form.city} onChange={handleChange}
                autoComplete="address-level2"
              />
            </div>
            <div className="reg-field" style={{ flex: 1 }}>
              <input
                data-testid="reg-postcode"
                name="postcode" type="text" placeholder="Postcode"
                value={form.postcode} onChange={handleChange} onBlur={handleBlur}
                className={errors.postcode ? "input-err" : ""}
                autoComplete="postal-code"
                style={{ textTransform: "uppercase" }}
              />
              {errors.postcode && <span className="field-err">{errors.postcode}</span>}
            </div>
          </div>

          {/* Password */}
          <div className="reg-field">
            <div className="password-wrapper">
              <input
                data-testid="reg-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password (min 8 chars, include a number)"
                value={form.password}
                onChange={handleChange} onBlur={handleBlur}
                className={errors.password ? "input-err" : ""}
                autoComplete="new-password"
              />
              <button type="button" className="toggle-password" onClick={() => setShowPassword((p) => !p)}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.password && <span className="field-err">{errors.password}</span>}
            {/* Strength bar */}
            {form.password && (
              <div className="pw-strength">
                <div className="pw-bar">
                  {[1,2,3,4,5].map((n) => (
                    <div
                      key={n}
                      className="pw-seg"
                      style={{ background: n <= strength.level ? strength.color : "rgba(255,255,255,0.08)" }}
                    />
                  ))}
                </div>
                <span className="pw-label" style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          <button data-testid="reg-submit" type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="forgot">
          Already have an account? <Link to="/customer/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerRegister;
