// DashboardLayout.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, NavLink, Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";
import socket from "../services/appSocket";
import { unlockAudioCtx, requestNotifPermission, playNewOrderSound } from "../services/audio";
import "./DashboardLayout.css";

function sendDlNewOrderNotif(count) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(`🛎️ ${count} new online order${count > 1 ? "s" : ""}!`, {
        body: "Go to Online Orders to accept.",
        icon: "/bg-chili.png",
        requireInteraction: true,
      });
    } catch {}
  }
}

function speakDlNewOrder() {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(
      "New online order received. Please check online orders."
    );
    u.volume = 1; u.rate = 0.9; u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  } catch {}
}

// ── Opt 3: custom hook — pending orders polling + alerts ──────────────────────
function usePendingOrders(user) {
  const [pendingOnlineCount, setPendingOnlineCount] = useState(0);
  const prevPendingRef = useRef(null);
  const pendingCountRef = useRef(0);
  const reminderRef = useRef(null);

  const startReminder = useCallback(() => {
    if (reminderRef.current) return; // already running
    reminderRef.current = setInterval(() => {
      if (pendingCountRef.current > 0) {
        playNewOrderSound();
      } else {
        clearInterval(reminderRef.current);
        reminderRef.current = null;
      }
    }, 30000); // ring every 30s while orders are pending
  }, []);

  const fetchPendingOnline = useCallback(async () => {
    if (!user || (user.role !== "admin" && user.role !== "cashier")) return;
    try {
      const res = await api.get("/orders/online/pending");
      const count = (res.data.orders || []).length;
      setPendingOnlineCount(count);
      pendingCountRef.current = count;

      // Alert immediately when a NEW order arrives
      if (prevPendingRef.current !== null && count > prevPendingRef.current) {
        playNewOrderSound();
        speakDlNewOrder();
        sendDlNewOrderNotif(count - prevPendingRef.current);
      }

      // Start 30s reminder loop while there are pending orders
      if (count > 0) {
        startReminder();
      } else {
        clearInterval(reminderRef.current);
        reminderRef.current = null;
      }

      prevPendingRef.current = count;
    } catch {}
  }, [user, startReminder]);

  useEffect(() => {
    fetchPendingOnline();

    // Fallback poll every 15s — catches socket misses
    const pollTimer = setInterval(fetchPendingOnline, 15000);

    // When admin comes back to this tab, resume AudioContext and re-check immediately
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        unlockAudioCtx();
        fetchPendingOnline();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    socket.on("connect", fetchPendingOnline);
    socket.on("order:new", fetchPendingOnline);
    socket.on("order:status-changed", fetchPendingOnline);
    return () => {
      clearInterval(pollTimer);
      clearInterval(reminderRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      socket.off("connect", fetchPendingOnline);
      socket.off("order:new", fetchPendingOnline);
      socket.off("order:status-changed", fetchPendingOnline);
    };
  }, [fetchPendingOnline]);

  return pendingOnlineCount;
}

// ── Opt 2: shared NavItem — eliminates ~60 lines of repeated JSX ──────────────
const NavItem = ({ to, icon, label, badge, onClose }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `dl-item${isActive ? " active" : ""}`}
    onClick={onClose}
  >
    <span className="dl-item-icon">{icon}</span>
    <span className="dl-item-label">{label}</span>
    {badge > 0 && <span className="dl-pending-badge">{badge}</span>}
  </NavLink>
);

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // Opt 1: storage event instead of 1s setInterval poll
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));
  useEffect(() => {
    const onStorage = () => setUser(JSON.parse(localStorage.getItem("user")));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Unlock AudioContext + speech + notifications on first click
  useEffect(() => {
    const unlock = () => {
      unlockAudioCtx();
      requestNotifPermission();
      document.removeEventListener("click", unlock, true);
    };
    document.addEventListener("click", unlock, true);
    return () => document.removeEventListener("click", unlock, true);
  }, []);

  const pendingOnlineCount = usePendingOrders(user);

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
    if (user?.first_name) return `${user.first_name} ${user.last_name || ""}`.trim();
    if (user?.username) return user.username;
    return "User";
  };

  return (
    <div className="dl-layout">
      {menuOpen && <div className="dl-overlay" onClick={closeMenu} />}

      <div className="dl-topbar">
        <button className="dl-hamburger" onClick={() => setMenuOpen((o) => !o)}>
          <span /><span /><span />
        </button>
        <div className="dl-logo dl-logo--topbar">
          <img src="/bg-chili.png" alt="Mirchi Mafiya" className="dl-logo-img" />
          <span className="dl-brand">Mirchi Mafiya</span>
        </div>
      </div>

      <aside className={`dl-sidebar${menuOpen ? " dl-sidebar--open" : ""}`}>
        <button className="dl-sidebar-close" onClick={closeMenu}>✕</button>
        <div className="dl-logo">
          <img src="/bg-chili.png" alt="Mirchi Mafiya" className="dl-logo-img" />
          <div className="dl-logo-text">
            <span className="dl-brand">Mirchi Mafiya</span>
            <span className="dl-tagline">Point of Sale</span>
          </div>
        </div>

        <nav className="dl-nav">
          {user?.role === "admin" && (
            <>
              <div className="dl-section">Main</div>
              <NavItem to="/dashboard" icon="📊" label="Dashboard" onClose={closeMenu} />

              <div className="dl-section">Online Ordering</div>
              <NavItem to="/online-orders" icon="🌐" label="Online Orders" badge={pendingOnlineCount} onClose={closeMenu} />
              <NavItem to="/offers" icon="🏷️" label="Offers" onClose={closeMenu} />
              <NavItem to="/customers" icon="👤" label="Customers" onClose={closeMenu} />

              <div className="dl-section">Management</div>
              <NavItem to="/employees" icon="👥" label="Employees" onClose={closeMenu} />
              <NavItem to="/reports" icon="📈" label="Reports" onClose={closeMenu} />
              <NavItem to="/master-data" icon="🗂️" label="Master Data" onClose={closeMenu} />
              <NavItem to="/eod-sales" icon="📊" label="EOD Sales" onClose={closeMenu} />

              <div className="dl-section">Operations</div>
              <NavItem to="/held-orders" icon="⏳" label="Held Orders" onClose={closeMenu} />
              <NavItem to="/billing" icon="💵" label="Billing Counter" onClose={closeMenu} />
              <NavItem to="/previous-orders" icon="📜" label="Previous Orders" onClose={closeMenu} />
            </>
          )}

          {user?.role === "cashier" && (
            <>
              <div className="dl-section">Online Ordering</div>
              <NavItem to="/online-orders" icon="🌐" label="Online Orders" badge={pendingOnlineCount} onClose={closeMenu} />

              <div className="dl-section">Operations</div>
              <NavItem to="/held-orders" icon="⏳" label="Held Orders" onClose={closeMenu} />
              <NavItem to="/billing" icon="💵" label="Billing Counter" onClose={closeMenu} />
              <NavItem to="/previous-orders" icon="📜" label="Previous Orders" onClose={closeMenu} />
            </>
          )}

          <NavItem to="/attendance" icon="⏰" label="Attendance" onClose={closeMenu} />
        </nav>

        <div className="dl-footer">
          <div className="dl-user">
            <div className="dl-user-av">{getInitials()}</div>
            <div className="dl-user-info">
              <span className="dl-user-name">{getDisplayName()}</span>
              <span className="dl-user-role">
                {user?.role === "admin" ? "👑 Administrator" : user?.role === "cashier" ? "🧾 Cashier" : "👤 Employee"}
              </span>
            </div>
          </div>
          <button className="dl-logout" onClick={handleLogout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <main className="dl-main">
        {children ?? <Outlet />}
        <ToastContainer position="top-center" autoClose={3000} />
      </main>
    </div>
  );
};

export default DashboardLayout;
