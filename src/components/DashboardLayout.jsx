// DashboardLayout.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './DashboardLayout.css';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();

  // Use state to ensure updates after login
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')));

  // Sync user data from localStorage every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedUser = JSON.parse(localStorage.getItem('user'));
      setUser(updatedUser);
    }, 1000);

    return () => clearInterval(interval); // cleanup
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <h2>Mirchi Mafiya</h2>
        <ul>
          {/* Admin-only routes */}
          {user?.role === 'admin' && (
            <>
              <li><NavLink to="/dashboard">📊 Dashboard</NavLink></li>
              <li><NavLink to="/employees">👥 Employees</NavLink></li>
              <li><NavLink to="/reports">📈 Reports</NavLink></li>
              <li><NavLink to="/master-data">🗂️ Master Data</NavLink></li>
              <li><NavLink to="/end-of-day-sales">📊 End of Day Sales</NavLink></li>
            </>
          )}

          {/* Shared routes */}
          <li><NavLink to="/attendance">⏰ Attendance</NavLink></li>
          <li><NavLink to="/billing">💵 Billing Counter</NavLink></li>
          <li><NavLink to="/previous-orders">📜 Previous Orders</NavLink></li>
          <li><NavLink to="/held-orders">⏳ Held Orders</NavLink></li>

          {/* Logout */}
          <li>
            <button onClick={handleLogout} style={{ marginTop: '1rem' }}>
              🚪 Logout
            </button>
          </li>
        </ul>

        {/* Logged in user info */}
        <div className="user-info">
          {user?.role === 'admin' ? (
            '👑 Admin Logged In'
          ) : user?.first_name ? (
            `👤 Logged in as ${user.first_name} ${user.last_name || ''}`
          ) : user?.username ? (
            `👤 Logged in as ${user.username}`
          ) : user?.id ? (
            `👤 Logged in as User ${user.id}`
          ) : (
            '👤 Employee Logged In'
          )}
        </div>
      </aside>

      <main className="main-content">
        {children}
        <ToastContainer position="top-center" autoClose={3000} />
      </main>
    </div>
  );
};

export default DashboardLayout;
