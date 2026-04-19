import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import customerApi from "../services/customerApi";
import "./CustomerLayout.css";

// ── Module-level AudioContext — shared, unlocked on first tap ─────────────────
let _custAudioCtx = null;
function getCustAudioCtx() {
  if (!_custAudioCtx || _custAudioCtx.state === "closed") {
    _custAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _custAudioCtx;
}

function playCustSound(type) {
  try {
    const ctx = getCustAudioCtx();
    if (ctx.state === "suspended") return;
    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    const note = (f, s, d) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(master);
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, ctx.currentTime + s);
      g.gain.linearRampToValueAtTime(0.9, ctx.currentTime + s + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s + d);
      o.start(ctx.currentTime + s); o.stop(ctx.currentTime + s + d + 0.05);
    };
    if (type === "ready") {
      note(1047, 0.00, 0.2); note(1319, 0.22, 0.2);
      note(1568, 0.44, 0.4); note(1319, 0.86, 0.15); note(1568, 1.04, 0.5);
    } else {
      note(1047, 0.00, 0.2); note(1319, 0.22, 0.35);
    }
  } catch {}
}

function speakCust(msg) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(msg);
    u.volume = 1; u.rate = 0.88; u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  } catch {}
}

function showCustNotif(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    try { new Notification(title, { body, icon: "/logo2.png", requireInteraction: true }); } catch {}
  }
}

const CustomerLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
  const user = JSON.parse(localStorage.getItem("customer_user") || "{}");
  const prevStatusRef = useRef({}); // { [orderId]: order_status }
  const pendingAlertRef = useRef(null); // holds alert data when tab is backgrounded
  const [orderAlert, setOrderAlert] = useState(false); // badge on My Orders tab
  const [notifDismissed, setNotifDismissed] = useState(
    () => localStorage.getItem("notif_dismissed") === "1"
  );
  const notifPermission = "Notification" in window ? Notification.permission : "denied";
  const showNotifBanner = !notifDismissed && notifPermission !== "granted" && notifPermission !== "denied";

  // Unlock AudioContext + speech + notifications on first tap
  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = getCustAudioCtx();
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
      } catch {}
      if ("speechSynthesis" in window) {
        try { const s = new SpeechSynthesisUtterance(""); s.volume = 0; window.speechSynthesis.speak(s); } catch {}
      }
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      document.removeEventListener("click", unlock, true);
    };
    document.addEventListener("click", unlock, true);
    return () => document.removeEventListener("click", unlock, true);
  }, []);

  // Clear the alert badge when customer opens My Orders
  useEffect(() => {
    if (location.pathname === "/customer/orders") setOrderAlert(false);
  }, [location.pathname]);

  // Poll orders globally — works on any customer page
  const pollOrders = useCallback(async () => {
    const token = localStorage.getItem("customer_token");
    if (!token) return;
    try {
      const res = await customerApi.get("/customer/orders");
      const orders = res.data.orders || [];
      orders.forEach((order) => {
        const prev = prevStatusRef.current[order.id];
        const curr = order.order_status;
        if (prev && prev !== curr) {
          setOrderAlert(true);
          if (curr === "accepted") {
            const msg = `Your order number ${order.order_number} has been accepted and is being prepared. It will be ready at ${order.estimated_ready || "soon"}.`;
            showCustNotif("👨‍🍳 Order Accepted!", `#${order.order_number} is being prepared — ready at ${order.estimated_ready || "soon"}.`);
            if (document.hidden) {
              // Tab in background — hold speech until customer returns
              pendingAlertRef.current = { soundType: "accepted", msg, repeat: false };
            } else {
              playCustSound("accepted");
              speakCust(msg);
            }
          } else if (curr === "ready") {
            const msg = `Your order number ${order.order_number} is ready for collection. Please come to the counter.`;
            showCustNotif("🔔 Order Ready!", `#${order.order_number} is ready — please collect at the counter!`);
            if (document.hidden) {
              // Tab in background — hold speech until customer returns
              pendingAlertRef.current = { soundType: "ready", msg, repeat: true };
            } else {
              playCustSound("ready");
              speakCust(msg);
              setTimeout(() => speakCust(msg), 2800);
            }
          } else if (curr === "rejected") {
            showCustNotif("❌ Order Rejected", `Sorry, order #${order.order_number} was rejected. Please contact us.`);
          }
        }
        prevStatusRef.current[order.id] = curr;
      });
    } catch {}
  }, []);

  useEffect(() => {
    pollOrders();
    const interval = setInterval(pollOrders, 12000);
    return () => clearInterval(interval);
  }, [pollOrders]);

  // When customer returns to the tab — re-unlock audio, fire held speech, and re-poll immediately
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return;
      try {
        const ctx = getCustAudioCtx();
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
      } catch {}
      pollOrders();
      if (pendingAlertRef.current) {
        const { soundType, msg, repeat } = pendingAlertRef.current;
        pendingAlertRef.current = null;
        playCustSound(soundType);
        speakCust(msg);
        if (repeat) setTimeout(() => speakCust(msg), 2800);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [pollOrders]);

  const handleLogout = () => {
    localStorage.removeItem("customer_token");
    localStorage.removeItem("customer_user");
    localStorage.removeItem("customer_cart");
    navigate("/customer/login");
  };

  const isActive = (path) => location.pathname === path;

  const handleEnableNotifs = async () => {
    const result = await Notification.requestPermission();
    if (result === "denied") {
      localStorage.setItem("notif_dismissed", "1");
      setNotifDismissed(true);
    }
  };

  return (
    <div className="cl-wrapper">
      {/* ── Notification permission banner ── */}
      {showNotifBanner && (
        <div style={{ background: "#ff6a00", color: "#fff", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem", gap: 8 }}>
          <span>🔔 Enable notifications to get alerted when your order is ready</span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={handleEnableNotifs} style={{ background: "#fff", color: "#ff6a00", border: "none", borderRadius: 6, padding: "5px 12px", fontWeight: 700, cursor: "pointer" }}>
              Enable
            </button>
            <button onClick={() => { setNotifDismissed(true); localStorage.setItem("notif_dismissed", "1"); }} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.5)", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
              ✕
            </button>
          </div>
        </div>
      )}
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
            My Orders{orderAlert && <span className="cl-order-dot" />}
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
          <span className="cl-tab-icon" style={{ position: "relative" }}>
            📋{orderAlert && <span className="cl-tab-badge cl-order-alert-dot" />}
          </span>
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
