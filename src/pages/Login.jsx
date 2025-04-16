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
      const res = await api.post('/login', form);
  
      // Save token
      localStorage.setItem('token', res.data.token);
  
      // Navigate manually (no user.role, so assume admin for now)
      navigate('/dashboard'); // or '/attendance' based on your logic
    } catch (err) {
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
