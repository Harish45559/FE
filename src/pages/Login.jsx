import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './login.css';

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

const handleLogin = async (e) => {
  e.preventDefault();
  setError('');

  try {
    const res = await api.post('/auth/login', form); // <-- await!

    const { token, role, username } = res.data || {};
    if (!token || !role) {
      setError('Login failed: invalid server response');
      return;
    }

    // Save token + user
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ username, role, token }));

    // Route by role
    if (role === 'admin') {
      navigate('/dashboard');
    } else if (role === 'employee') {
      navigate('/attendance');
    } else {
      setError('Unknown role');
    }
  } catch (err) {
    setError(err?.response?.data?.message || 'Login failed');
  }
};



  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-box">
          <h2>Login</h2>
          {error && <div className="error">{error}</div>}
          <form onSubmit={handleLogin}>
            <input
              type="text"
              name="username"
              placeholder="Username"
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              onChange={handleChange}
              required
            />
            <button type="submit">Login</button>
          </form>
          <p className="forgot-password-link">
            <a href="/forgot-password">Forgot Password?</a>
          </p>
        </div>
      </div>
      <div className="login-right">
        <img src="download.png" alt="Logo" />
      </div>
    </div>
  );
};

export default Login;
