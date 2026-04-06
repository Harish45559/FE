// DashboardLayout.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./DashboardLayout.css";

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user")),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const updatedUser = JSON.parse(localStorage.getItem("user"));
      setUser(updatedUser);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const getInitials = () => {
    if (user?.first_name && user?.last_name)
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    if (user?.username) return user.username.charAt(0).toUpperCase();
    return "U";
  };

  const getDisplayName = () => {
    if (user?.first_name)
      return `${user.first_name} ${user.last_name || ""}`.trim();
    if (user?.username) return user.username;
    return "User";
  };

  return (
    <div className="dl-layout">
      <aside className="dl-sidebar">
        {/* Logo */}
        <div className="dl-logo">
          <img
            src="/bg-chili.png"
            alt="Mirchi Mafiya"
            className="dl-logo-img"
          />
          <div className="dl-logo-text">
            <span className="dl-brand">Mirchi Mafiya</span>
            <span className="dl-tagline">Point of Sale</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="dl-nav">
          {user?.role === "admin" && (
            <>
              <div className="dl-section">Main</div>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
              >
                <span className="dl-item-icon">📊</span>
                <span className="dl-item-label">Dashboard</span>
              </NavLink>

              <div className="dl-section">Management</div>
              <NavLink
                to="/employees"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
              >
                <span className="dl-item-icon">👥</span>
                <span className="dl-item-label">Employees</span>
              </NavLink>
              <NavLink
                to="/reports"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
              >
                <span className="dl-item-icon">📈</span>
                <span className="dl-item-label">Reports</span>
              </NavLink>
              <NavLink
                to="/master-data"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
              >
                <span className="dl-item-icon">🗂️</span>
                <span className="dl-item-label">Master Data</span>
              </NavLink>
              <NavLink
                to="/eod-sales"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
              >
                <span className="dl-item-icon">📊</span>
                <span className="dl-item-label">EOD Sales</span>
              </NavLink>

              <div className="dl-section">Operations</div>
              <NavLink
                to="/held-orders"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
              >
                <span className="dl-item-icon">⏳</span>
                <span className="dl-item-label">Held Orders</span>
              </NavLink>
              <NavLink
                to="/billing"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
              >
                <span className="dl-item-icon">💵</span>
                <span className="dl-item-label">Billing Counter</span>
              </NavLink>
              <NavLink
                to="/previous-orders"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
              >
                <span className="dl-item-icon">📜</span>
                <span className="dl-item-label">Previous Orders</span>
              </NavLink>
            </>
          )}

          <NavLink
            to="/attendance"
            className={({ isActive }) => `dl-item${isActive ? " active" : ""}`}
          >
            <span className="dl-item-icon">⏰</span>
            <span className="dl-item-label">Attendance</span>
          </NavLink>
        </nav>

        {/* Footer */}
        <div className="dl-footer">
          <div className="dl-user">
            <div className="dl-user-av">{getInitials()}</div>
            <div className="dl-user-info">
              <span className="dl-user-name">{getDisplayName()}</span>
              <span className="dl-user-role">
                {user?.role === "admin" ? "👑 Administrator" : "👤 Employee"}
              </span>
            </div>
          </div>
          <button className="dl-logout" onClick={handleLogout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <main className="dl-main">
        {children}
        <ToastContainer position="top-center" autoClose={3000} />
      </main>
    </div>
  );
};

export default DashboardLayout;
