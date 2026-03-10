import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { FaEdit, FaTrash } from "react-icons/fa";
import "./Employees.css";

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
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
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees");
      setEmployees(res.data);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = { ...form };

      // ✅ No more bcrypt.hash here — let backend handle it

      if (editingId) {
        await api.put(`/employees/${editingId}`, payload);
      } else {
        await api.post("/employees", payload);
      }

      setForm({
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
      });

      setEditingId(null);
      setFormVisible(false);
      fetchEmployees();
    } catch (err) {
      console.error("Add employee error:", err.response?.data || err.message);
      alert(err.response?.data?.error || "Failed to add employee");
    }
  };

  const handleEdit = (emp) => {
    setForm({
      first_name: emp.first_name || "",
      last_name: emp.last_name || "",
      username: emp.username || "",
      password: "", // Do not show hashed password
      email: emp.email || "",
      phone: emp.phone || "",
      address: emp.address || "",
      gender: emp.gender || "",
      role: emp.role || "employee",
      dob: emp.dob || "",
      joining_date: emp.joining_date || "",
      brp: emp.brp || "",
      pin: "", // Keep PIN empty for editing
    });
    setEditingId(emp.id);
    setFormVisible(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        await api.delete(`/employees/${id}`);
        fetchEmployees();
      } catch (err) {
        console.error("Delete error:", err.response?.data || err.message);
        alert("Failed to delete employee");
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="employee-header">
        <h2 id="employee-title">Employees</h2>
        <button
          id="add-btn"
          className="add-button"
          onClick={() => setFormVisible(!formVisible)}
        >
          {formVisible ? "✖ Close" : "➕ Add Employee"}
        </button>
      </div>

      {formVisible && (
        <form
          id="employee-form"
          className="employee-form"
          onSubmit={handleSubmit}
        >
          <input
            id="first-name"
            type="text"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            placeholder="First Name"
            required
          />

          <input
            id="last-name"
            type="text"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            placeholder="Last Name"
            required
          />

          <input
            id="employee-username"
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Username"
            required
          />

          <input
            id="employee-password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            required={!editingId}
          />

          <input
            id="employee-email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
          />

          <input
            id="employee-phone"
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone"
          />

          <input
            id="employee-address"
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Address"
          />

          <input
            id="employee-pin"
            type="password"
            name="pin"
            value={form.pin}
            onChange={handleChange}
            placeholder="4-digit PIN"
            maxLength={4}
            required={!editingId}
          />

          <label>
            Date of Birth:
            <input
              id="employee-dob"
              type="date"
              name="dob"
              value={form.dob}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Joining Date:
            <input
              id="employee-joining-date"
              type="date"
              name="joining_date"
              value={form.joining_date}
              onChange={handleChange}
              required
            />
          </label>

          <input
            id="employee-brp"
            type="text"
            name="brp"
            value={form.brp}
            onChange={handleChange}
            placeholder="BRP Number"
            required
          />

          <select
            id="employee-gender"
            name="gender"
            value={form.gender}
            onChange={handleChange}
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <select
            id="employee-role"
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>

          <button id="submit-employee" type="submit">
            {editingId ? "Update" : "Add"} Employee
          </button>
        </form>
      )}

      <div className="employee-table-wrapper">
        <table id="employee-table" className="employee-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>First</th>
              <th>Last</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Gender</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} id={`employee-row-${emp.id}`}>
                <td id={`employee-id-${emp.id}`}>{emp.id}</td>
                <td id={`employee-first-${emp.id}`}>{emp.first_name}</td>
                <td id={`employee-last-${emp.id}`}>{emp.last_name}</td>
                <td id={`employee-username-${emp.id}`}>{emp.username}</td>
                <td id={`employee-email-${emp.id}`}>{emp.email}</td>
                <td id={`employee-phone-${emp.id}`}>{emp.phone}</td>
                <td id={`employee-gender-${emp.id}`}>{emp.gender}</td>
                <td id={`employee-role-${emp.id}`}>{emp.role}</td>
                <td>
                  <button
                    id={`edit-employee-${emp.id}`}
                    onClick={() => handleEdit(emp)}
                  >
                    ✏️
                  </button>
                  <button
                    id={`delete-employee-${emp.id}`}
                    onClick={() => handleDelete(emp.id)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};

export default Employees;
