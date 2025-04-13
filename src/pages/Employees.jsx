import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../services/api';
import { FaEdit, FaTrash } from 'react-icons/fa';
import './Employees.css';


const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    address: '',
    gender: '',
    role: 'employee',
    dob: '',
    joining_date: '',
    brp: '',
    pin: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('Form submitted:', form);

    try {
      if (editingId) {
        await api.put(`/employees/${editingId}`, form);
      } else {
        await api.post('/employees', form);
      }

      setForm({
        first_name: '',
        last_name: '',
        username: '',
        password: '',
        email: '',
        phone: '',
        address: '',
        gender: '',
        role: 'employee',
        dob: '',
        joining_date: '',
        brp: '',        // ✅ Comma added here
        pin: ''
      });
      

      setEditingId(null);
      setFormVisible(false);
      fetchEmployees();
    } catch (err) {
      console.error('Add employee error:', err.response?.data || err.message);
      alert(err.response?.data?.error || 'Failed to add employee');
    }
  };

  const handleEdit = (emp) => {
    setForm({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      username: emp.username || '',
      password: '', // keep empty for security
      email: emp.email || '',
      phone: emp.phone || '',
      address: emp.address || '',
      gender: emp.gender || '',
      role: emp.role || 'employee',
      dob: emp.dob || '',
      joining_date: emp.joining_date || '',
      brp: emp.brp || '',
      pin: emp.pin || '',
    });
    setEditingId(emp.id);
    setFormVisible(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await api.delete(`/employees/${id}`);
        fetchEmployees();
      } catch (err) {
        console.error('Delete error:', err.response?.data || err.message);
        alert('Failed to delete employee');
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="employee-table-wrapper">
  <table className="employee-table">
    {/* table head & rows */}
  </table>
</div>


      <div className="employee-header">
        <h2>Employees</h2>
        <button className="add-button" onClick={() => setFormVisible(!formVisible)}>
          {formVisible ? '✖ Close' : '➕ Add Employee'}
        </button>
      </div>

      {formVisible && (
        <form className="employee-form" onSubmit={handleSubmit}>
          <input type="text" name="first_name" value={form.first_name} onChange={handleChange} placeholder="First Name" required />
          <input type="text" name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last Name" required />
          <input type="text" name="username" value={form.username} onChange={handleChange} placeholder="Username" required />
          <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Password" required={!editingId} />
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email" />
          <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" />
          <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="Address" />
          <input type = "password" name="pin" value={form.pin} onChange={handleChange} placeholder="4-digit PIN" maxLength={4} required />
          <label>
  Date of Birth:
  <input type="date" name="dob" value={form.dob} onChange={handleChange} required />
</label>

<label>
  Joining Date:
  <input type="date" name="joining_date" value={form.joining_date} onChange={handleChange} required />
</label>

          <input type="text" name="brp" value={form.brp} onChange={handleChange} placeholder="BRP Number" required />

          <select name="gender" value={form.gender} onChange={handleChange}>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
          
          <button type="submit">{editingId ? 'Update' : 'Add'} Employee</button>
        </form>
      )}

      <table className="employee-table">
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
            <tr key={emp.id}>
              <td>{emp.id}</td>
              <td>{emp.first_name}</td>
              <td>{emp.last_name}</td>
              <td>{emp.username}</td>
              <td>{emp.email}</td>
              <td>{emp.phone}</td>
              <td>{emp.gender}</td>
              <td>{emp.role}</td>
              <td>
                <button onClick={() => handleEdit(emp)}>✏️</button>{' '}
                <button onClick={() => handleDelete(emp.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardLayout>
  );
};

export default Employees;
