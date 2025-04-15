import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './DashboardLayout.css';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <h2>Cozy Cup</h2>
        <nav>
          <ul>
            <li><NavLink to="/dashboard">🏠 Dashboard</NavLink></li>
            <li><NavLink to="/employees">👥 Employees</NavLink></li>
            <li><NavLink to="/attendance">⏰ Attendance</NavLink></li>
            <li><NavLink to="/reports">📊 Reports</NavLink></li>
            <li><NavLink to="/previous-orders">📜 Previous Orders</NavLink></li>
            <li><NavLink to="/held-orders">🕒 Held Orders</NavLink></li>
            <li><NavLink to="/master-data">🗂️ Master Data</NavLink></li>
           
             
                <li><NavLink to="/billing">🍽 Billing Counter</NavLink></li>
                <li><NavLink to="/sales-report">📊 Sales Report</NavLink></li>
              
         
            <li><button onClick={handleLogout}>🔒 Logout</button></li>
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        {children}
        <ToastContainer position="top-center" autoClose={3000} />
      </main>
    </div>
  );
};

export default DashboardLayout;
