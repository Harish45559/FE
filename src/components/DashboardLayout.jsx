// DashboardLayout.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";
import socket from "../services/appSocket";
import "./DashboardLayout.css";

// ── Module-level AudioContext (persists across re-renders) ────────────────────
let _dlAudioCtx = null;
function getDlAudioCtx() {
  if (!_dlAudioCtx || _dlAudioCtx.state === "closed") {
    _dlAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _dlAudioCtx;
}

function playDlNewOrderSound() {
  try {
    const ctx = getDlAudioCtx();
    if (ctx.state === "suspended") return;
    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    const note = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(master);
      osc.type = "sine"; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(0.85, ctx.currentTime + start + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    note(784, 0.0, 0.18); note(988, 0.18, 0.18);
    note(1175, 0.36, 0.18); note(1568, 0.54, 0.4);
    note(1175, 0.96, 0.15); note(1568, 1.14, 0.5);
  } catch {}
}

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

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingOnlineCount, setPendingOnlineCount] = useState(0);
  const prevPendingRef = useRef(null);
  const soundLoopRef = useRef(null);
  const speechLoopRef = useRef(null);

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

  // Unlock AudioContext + speech synthesis + notifications on first click anywhere
  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = getDlAudioCtx();
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
      } catch {}
      if ("speechSynthesis" in window) {
        try {
          const s = new SpeechSynthesisUtterance("");
          s.volume = 0;
          window.speechSynthesis.speak(s);
        } catch {}
      }
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      document.removeEventListener("click", unlock, true);
    };
    document.addEventListener("click", unlock, true);
    return () => document.removeEventListener("click", unlock, true);
  }, []);

  // Poll pending online orders every 10s — works on ANY staff page
  const fetchPendingOnline = useCallback(async () => {
    const u = JSON.parse(localStorage.getItem("user"));
    if (!u || u.role !== "admin") return;
    try {
      const res = await api.get("/orders/online/pending");
      const count = (res.data.orders || []).length;
      setPendingOnlineCount(count);

      if (prevPendingRef.current !== null && count > prevPendingRef.current) {
        const newCount = count - prevPendingRef.current;
        sendDlNewOrderNotif(newCount);
      }

      if (count > 0) {
        // Start sound loop if not already running
        if (!soundLoopRef.current) {
          playDlNewOrderSound();
          soundLoopRef.current = setInterval(playDlNewOrderSound, 4500);
        }
        // Start speech loop if not already running — repeats every 12s until accepted
        if (!speechLoopRef.current) {
          speakDlNewOrder();
          speechLoopRef.current = setInterval(speakDlNewOrder, 12000);
        }
      } else {
        // No pending orders — stop both loops
        if (soundLoopRef.current) {
          clearInterval(soundLoopRef.current);
          soundLoopRef.current = null;
        }
        if (speechLoopRef.current) {
          clearInterval(speechLoopRef.current);
          speechLoopRef.current = null;
          try { window.speechSynthesis?.cancel(); } catch {}
        }
      }
      prevPendingRef.current = count;
    } catch {}
  }, []);

  useEffect(() => {
    fetchPendingOnline();
    socket.on("order:new", fetchPendingOnline);
    socket.on("order:status-changed", fetchPendingOnline);
    return () => {
      socket.off("order:new", fetchPendingOnline);
      socket.off("order:status-changed", fetchPendingOnline);
      if (soundLoopRef.current) clearInterval(soundLoopRef.current);
      if (speechLoopRef.current) clearInterval(speechLoopRef.current);
    };
  }, [fetchPendingOnline]);

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
      {/* Mobile overlay */}
      {menuOpen && (
        <div className="dl-overlay" onClick={() => setMenuOpen(false)} />
      )}
      {/* Mobile top bar */}
      <div className="dl-topbar">
        <button className="dl-hamburger" onClick={() => setMenuOpen((o) => !o)}>
          <span />
          <span />
          <span />
        </button>
        <div className="dl-logo dl-logo--topbar">
          <img
            src="/bg-chili.png"
            alt="Mirchi Mafiya"
            className="dl-logo-img"
          />
          <span className="dl-brand">Mirchi Mafiya</span>
        </div>
      </div>
      <aside className={`dl-sidebar${menuOpen ? " dl-sidebar--open" : ""}`}>
        <button className="dl-sidebar-close" onClick={() => setMenuOpen(false)}>
          ✕
        </button>
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
                onClick={() => setMenuOpen(false)}
              >
                <span className="dl-item-icon">📊</span>
                <span className="dl-item-label">Dashboard</span>
              </NavLink>

              <div className="dl-section">Online Ordering</div>
              <NavLink
                to="/online-orders"
                className={({ isActive }) => `dl-item${isActive ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="dl-item-icon">🌐</span>
                <span className="dl-item-label">Online Orders</span>
                {pendingOnlineCount > 0 && (
                  <span className="dl-pending-badge">{pendingOnlineCount}</span>
                )}
              </NavLink>
              <NavLink
                to="/customers"
                className={({ isActive }) => `dl-item${isActive ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="dl-item-icon">👤</span>
                <span className="dl-item-label">Customers</span>
              </NavLink>

              <div className="dl-section">Management</div>
              <NavLink
                to="/employees"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                <span className="dl-item-icon">👥</span>
                <span className="dl-item-label">Employees</span>
              </NavLink>
              <NavLink
                to="/reports"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                <span className="dl-item-icon">📈</span>
                <span className="dl-item-label">Reports</span>
              </NavLink>
              <NavLink
                to="/master-data"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                <span className="dl-item-icon">🗂️</span>
                <span className="dl-item-label">Master Data</span>
              </NavLink>
              <NavLink
                to="/eod-sales"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
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
                onClick={() => setMenuOpen(false)}
              >
                <span className="dl-item-icon">⏳</span>
                <span className="dl-item-label">Held Orders</span>
              </NavLink>
              <NavLink
                to="/billing"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                <span className="dl-item-icon">💵</span>
                <span className="dl-item-label">Billing Counter</span>
              </NavLink>
              <NavLink
                to="/previous-orders"
                className={({ isActive }) =>
                  `dl-item${isActive ? " active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                <span className="dl-item-icon">📜</span>
                <span className="dl-item-label">Previous Orders</span>
              </NavLink>
            </>
          )}

          <NavLink
            to="/attendance"
            className={({ isActive }) => `dl-item${isActive ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
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
