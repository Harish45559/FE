import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import "./CustomerLayout.css";

const CustomerLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
  const user = JSON.parse(localStorage.getItem("customer_user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("customer_token");
    localStorage.removeItem("customer_user");
    localStorage.removeItem("customer_cart");
    navigate("/customer/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="cl-wrapper">
      {/* ── Top nav bar ── */}
      <nav className="cl-nav">
        <Link to="/customer/menu" className="cl-brand">
          <img src="/logo2.png" alt="Mirchi Mafia" className="cl-logo" />
          <span>Order Online</span>
        </Link>

        {/* Desktop nav links */}
        <div className="cl-links">
          <Link to="/customer/menu" className={`cl-link ${isActive("/customer/menu") ? "active" : ""}`}>
            Menu
          </Link>
          <Link to="/customer/orders" className={`cl-link ${isActive("/customer/orders") ? "active" : ""}`}>
            My Orders
          </Link>
          <Link to="/customer/profile" className={`cl-link ${isActive("/customer/profile") ? "active" : ""}`}>
            Profile
          </Link>
        </div>

        <div className="cl-right">
          <Link to="/customer/cart" className="cl-cart-btn">
            🛒
            {itemCount > 0 && <span className="cl-cart-badge">{itemCount}</span>}
          </Link>
          <span className="cl-username">{user.name?.split(" ")[0]}</span>
          <button onClick={handleLogout} className="cl-logout">Logout</button>
        </div>
      </nav>

      <main className="cl-main">{children}</main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="cl-bottom-nav">
        <Link to="/customer/menu" className={`cl-tab ${isActive("/customer/menu") ? "cl-tab-active" : ""}`}>
          <span className="cl-tab-icon">🍽️</span>
          <span className="cl-tab-label">Menu</span>
        </Link>

        <Link to="/customer/orders" className={`cl-tab ${isActive("/customer/orders") ? "cl-tab-active" : ""}`}>
          <span className="cl-tab-icon">📋</span>
          <span className="cl-tab-label">My Orders</span>
        </Link>

        <Link to="/customer/cart" className={`cl-tab ${isActive("/customer/cart") ? "cl-tab-active" : ""}`}>
          <span className="cl-tab-icon cl-tab-cart-wrap">
            🛒
            {itemCount > 0 && <span className="cl-tab-badge">{itemCount}</span>}
          </span>
          <span className="cl-tab-label">Cart</span>
        </Link>

        <Link to="/customer/profile" className={`cl-tab ${isActive("/customer/profile") ? "cl-tab-active" : ""}`}>
          <span className="cl-tab-icon">👤</span>
          <span className="cl-tab-label">Profile</span>
        </Link>
      </nav>
    </div>
  );
};

export default CustomerLayout;
