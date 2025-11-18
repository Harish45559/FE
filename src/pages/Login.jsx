import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './login.css';

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false); 

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await api.post('/auth/login', form);
      const { token, role, username } = res.data || {};

      if (!token || !role) {
        setError('Login failed: invalid server response');
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ username, role, token }));

      if (role === 'admin') navigate('/dashboard');
      else if (role === 'employee') navigate('/attendance');
      else setError('Unknown role');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="login-page">
      {/* Background */}
      <div className="login-background"></div>

      {/* Card */}
      <div className="login-card">
        <img
          className="brand-logo"
          src="/logo2.png"
          alt="Mirchi Mafia"
          draggable="false"
        />
        <h2 className="title">Welcome back</h2>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleLogin} className="login-form" autoComplete="on">
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Username"
            onChange={handleChange}
            required
          />

          <div className="password-wrapper">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'} // 👈 toggle
              placeholder="Password"
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <button type="submit" className="btn-primary">Sign In</button>
        </form>

        <p className="forgot">
          <a href="/forgot-password">Forgot password?</a>
        </p>

        <p className="tagline">“Spice so good, it should be illegal.”</p>
      </div>
    </div>
  );
};

export default Login;