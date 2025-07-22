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
  try {
    const res = await api.post('/auth/login', form);

    // Add token expiration handling
    const userData = {
      username: form.username,
      role: res.data.role,
      token: res.data.token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(userData));

    // Redirect based on role
    if (res.data.role === 'admin') {
      navigate('/dashboard');
    } else if (res.data.role === 'employee') {
      navigate('/attendance');
    } else {
      setError('Unknown role');
    }
  } catch (err) {
    console.error('Login error:', err);
    setError(err.response?.data?.message || 'Login failed');
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
