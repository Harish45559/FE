import React, { useEffect, useState, useMemo } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import "./Employees.css";
import { useNavigate } from "react-router-dom";

const AVATAR_COLORS = [
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#FBEAF0", color: "#72243E" },
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#FAECE7", color: "#712B13" },
];

const getAvatar = (name = "", idx = 0) => {
  const parts = name.trim().split(" ");
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  const colors = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  return { initials, ...colors };
};

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  username: "",
  password: "",
  email: "",
  phone: "",
  address: "",
  gender: "",
  role: "employee",
  dob: "",
  joining_date: "",
  brp: "",
  pin: "",
};

const Employees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees");
      setEmployees(res.data);
    } catch (err) {
      console.error("Error fetching employees:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validateForm = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[6-9]\d{9}$/;
    const pinRegex = /^\d{4}$/;

    if (!form.first_name.trim()) errs.first_name = "Required";
    if (!form.last_name.trim()) errs.last_name = "Required";
    if (!form.username.trim()) errs.username = "Required";
    if (!form.email.trim()) errs.email = "Required";
    else if (!emailRegex.test(form.email)) errs.email = "Invalid email format";
    if (!form.phone.trim()) errs.phone = "Required";
    else if (!phoneRegex.test(form.phone))
      errs.phone = "Must be 10 digits starting with 6-9";
    if (!form.address.trim()) errs.address = "Required";
    if (!form.gender) errs.gender = "Required";
    if (!form.dob) errs.dob = "Required";
    if (!form.joining_date) errs.joining_date = "Required";
    else if (new Date(form.joining_date) > new Date())
      errs.joining_date = "Cannot be in the future";
    if (!form.brp.trim()) errs.brp = "Required";

    if (!editingId) {
      if (!form.password) errs.password = "Required";
      else if (form.password.length < 6) errs.password = "Min 6 characters";
      if (!form.pin) errs.pin = "Required";
      else if (!pinRegex.test(form.pin)) errs.pin = "Must be exactly 4 digits";
    }

    const duplicateEmail = employees.find(
      (e) => e.email === form.email && e.id !== editingId,
    );
    if (duplicateEmail) errs.email = "Email already exists";

    const duplicateUsername = employees.find(
      (e) => e.username === form.username && e.id !== editingId,
    );
    if (duplicateUsername) errs.username = "Username already exists";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validateForm()) return;

    try {
      setLoading(true);
      let payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [
          k,
          typeof v === "string" ? v.trim() : v,
        ]),
      );
      if (editingId && !payload.password) delete payload.password;
      if (editingId && !payload.pin) delete payload.pin;

      if (editingId) {
        await api.put(`/employees/${editingId}`, payload);
      } else {
        await api.post("/employees", payload);
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      setFormVisible(false);
      setErrors({});
      fetchEmployees();
    } catch (err) {
      console.error("Submit error:", err.response?.data || err.message);
      const msg = err.response?.data?.error || err.response?.data?.errors;
      if (typeof msg === "object") {
        setErrors(msg);
      } else {
        alert(msg || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (emp) => {
    setForm({
      first_name: emp.first_name || "",
      last_name: emp.last_name || "",
      username: emp.username || "",
      password: "",
      email: emp.email || "",
      phone: emp.phone || "",
      address: emp.address || "",
      gender: emp.gender || "",
      role: emp.role || "employee",
      dob: emp.dob || "",
      joining_date: emp.joining_date || "",
      brp: emp.brp || "",
      pin: "",
    });
    setEditingId(emp.id);
    setErrors({});
    setFormVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this employee? This will also remove their attendance records.",
      )
    )
      return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete employee");
    }
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
    setFormVisible(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      const matchSearch =
        !q ||
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(q) ||
        (emp.email || "").toLowerCase().includes(q) ||
        (emp.username || "").toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || emp.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [employees, search, roleFilter]);

  const Field = ({
    name,
    label,
    type = "text",
    required,
    placeholder,
    children,
  }) => (
    <div className="ep-field">
      <label className="ep-label" htmlFor={name}>
        {label}
        {required && <span className="ep-req">*</span>}
      </label>
      {children || (
        <input
          id={name}
          className={`ep-input${errors[name] ? " ep-input-error" : ""}`}
          type={type}
          name={name}
          value={form[name]}
          onChange={handleChange}
          placeholder={placeholder}
          required={required && !editingId}
          maxLength={name === "pin" ? 4 : undefined}
        />
      )}
      {errors[name] && <span className="ep-err-msg">{errors[name]}</span>}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="ep-container">
        {/* Header */}
        <div className="ep-header">
          <div>
            <h1 className="ep-title">Employees</h1>
            <p className="ep-subtitle">Manage your team members</p>
          </div>
          <button
            id="ep-btn-add-employee"
            className={`ep-add-btn${formVisible ? " ep-add-btn--cancel" : ""}`}
            onClick={() =>
              formVisible ? handleCancel() : setFormVisible(true)
            }
          >
            {formVisible ? "✕ Cancel" : "+ Add employee"}
          </button>
        </div>

        {/* Form */}
        {formVisible && (
          <div className="ep-form-card">
            <div className="ep-form-header">
              <span className="ep-form-title">
                {editingId ? "Edit employee" : "Add new employee"}
              </span>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="ep-form-grid">
                <Field
                  name="first_name"
                  label="First name"
                  required
                  placeholder="Ahmed"
                />
                <Field
                  name="last_name"
                  label="Last name"
                  required
                  placeholder="Ali"
                />
                <Field
                  name="username"
                  label="Username"
                  required
                  placeholder="ahmed.ali"
                />
                <Field
                  name="password"
                  label="Password"
                  type="password"
                  required={!editingId}
                  placeholder={
                    editingId
                      ? "Leave blank to keep current"
                      : "Min 6 characters"
                  }
                />
                <Field
                  name="email"
                  label="Email"
                  type="email"
                  required
                  placeholder="ahmed@example.com"
                />
                <Field
                  name="phone"
                  label="Phone"
                  required
                  placeholder="9876543210"
                />
                <Field
                  name="address"
                  label="Address"
                  required
                  placeholder="123 Main Street"
                />
                <Field
                  name="pin"
                  label="4-digit PIN"
                  type="password"
                  required={!editingId}
                  placeholder="••••"
                />
                <Field
                  name="brp"
                  label="BRP number"
                  required
                  placeholder="ZA123456"
                />
                <Field name="dob" label="Date of birth" type="date" required />
                <Field
                  name="joining_date"
                  label="Joining date"
                  type="date"
                  required
                />
                <Field name="gender" label="Gender" required>
                  <select
                    id="gender"
                    name="gender"
                    className={`ep-input${errors.gender ? " ep-input-error" : ""}`}
                    value={form.gender}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.gender && (
                    <span className="ep-err-msg">{errors.gender}</span>
                  )}
                </Field>
                <Field name="role" label="Role" required>
                  <select
                    id="role"
                    name="role"
                    className="ep-input"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </Field>
              </div>
              <div className="ep-form-footer">
                <button
                  id="ep-btn-form-cancel"
                  type="button"
                  className="ep-cancel-btn"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  id="ep-btn-form-submit"
                  type="submit"
                  className="ep-submit-btn"
                  disabled={loading}
                >
                  {loading
                    ? "Saving…"
                    : editingId
                      ? "Update employee"
                      : "Add employee"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Toolbar */}
        <div className="ep-toolbar">
          <input
            id="ep-search"
            className="ep-search"
            type="text"
            placeholder="Search by name, email or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            id="ep-role-filter"
            className="ep-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
          <span className="ep-count">
            {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="ep-table-wrap">
          <table className="ep-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ep-empty">
                    No employees found
                  </td>
                </tr>
              ) : (
                filtered.map((emp, idx) => {
                  const av = getAvatar(
                    `${emp.first_name} ${emp.last_name}`,
                    idx,
                  );
                  return (
                    <tr key={emp.id} id={`ep-emp-row-${emp.id}`}>
                      <td>
                        <div className="ep-name-cell">
                          <div
                            className="ep-avatar"
                            style={{ background: av.bg, color: av.color }}
                          >
                            {av.initials}
                          </div>
                          <div>
                            <div className="ep-name">
                              {emp.first_name} {emp.last_name}
                            </div>
                            <div className="ep-username">@{emp.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="ep-muted">{emp.email}</td>
                      <td className="ep-muted">{emp.phone}</td>
                      <td
                        className="ep-muted"
                        style={{ textTransform: "capitalize" }}
                      >
                        {emp.gender}
                      </td>
                      <td>
                        <span
                          className={`ep-role-badge ${emp.role === "admin" ? "ep-role-admin" : "ep-role-emp"}`}
                        >
                          {emp.role}
                        </span>
                      </td>
                      <td>
                        <div className="ep-actions">
                          <button
                            id={`ep-btn-edit-${emp.id}`}
                            className="ep-btn ep-btn-edit"
                            onClick={() => handleEdit(emp)}
                          >
                            Edit
                          </button>
                          <button
                            id={`ep-btn-delete-${emp.id}`}
                            className="ep-btn ep-btn-del"
                            onClick={() => handleDelete(emp.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Employees;
