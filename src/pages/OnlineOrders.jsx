import React, { useEffect, useState, useRef, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import "./OnlineOrders.css";

const TIME_PRESETS = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const POLL_INTERVAL = 8000; // 8 seconds

// ── Shared AudioContext — one instance, resumed on user gesture ───────────────
// Mobile browsers suspend AudioContext until a user interaction occurs.
// We create it once and keep it alive so polling-triggered sounds work.
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}

// Call this from a user gesture (click/touch) to unlock audio for the session
async function unlockAudioCtx() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") await ctx.resume();
  } catch {}
  // Unlock speechSynthesis on mobile — requires a silent utterance with user gesture
  if ("speechSynthesis" in window) {
    try {
      const silent = new SpeechSynthesisUtterance(" ");
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
    } catch {}
  }
}

// ── Request notification permission (call after user interaction on mobile) ───
function requestNotifPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

// ── Announce order ready via speech + browser notification ───────────────────
function announceOrderReady(orderNumber) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("🔔 Order Ready for Collection!", {
        body: `Order ${orderNumber} is ready. Please inform the customer.`,
        icon: "/logo2.png",
        requireInteraction: true,
      });
    } catch {}
  }

  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(
        `Order ${orderNumber} is ready for collection. Please collect your order. Order ${orderNumber} is ready.`,
      );
      msg.rate = 0.88;
      msg.pitch = 1.05;
      msg.volume = 1;
      window.speechSynthesis.speak(msg);
    } catch {}
  }
}

// ── Uber Eats-style ascending ding (uses shared unlocked AudioContext) ────────
function playNewOrderSound() {
  try {
    const ctx = getAudioCtx();
    // If still suspended (no user gesture yet), bail — mobile will block it
    if (ctx.state === "suspended") return;

    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    const note = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(master);
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(0.85, ctx.currentTime + start + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };

    note(784, 0.0, 0.18); // G5
    note(988, 0.18, 0.18); // B5
    note(1175, 0.36, 0.18); // D6
    note(1568, 0.54, 0.4); // G6 — hold
    note(1175, 0.96, 0.15); // D6
    note(1568, 1.14, 0.5); // G6 — final
  } catch {}
}

// ── Receipt Modal ─────────────────────────────────────────────────────────────
const ReceiptModal = ({ order, onClose }) => {
  if (!order) return null;
  const statusLabels = {
    pending: { label: "Pending", color: "#ffa048" },
    accepted: { label: "Accepted", color: "#6effc2" },
    rejected: { label: "Rejected", color: "#ff8888" },
    completed: { label: "Delivered", color: "#80d4ff" },
  };
  const st = statusLabels[order.order_status] || statusLabels.pending;

  return (
    <div className="oo-modal-overlay" onClick={onClose}>
      <div className="oo-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="oo-receipt">
          <div className="oo-receipt-brand">Mirchi Mafiya</div>
          <div className="oo-receipt-sub">Staff Receipt</div>
          <div className="oo-receipt-divider" />
          <div className="oo-receipt-row">
            <span>Order</span>
            <strong>#{order.order_number}</strong>
          </div>
          <div className="oo-receipt-row">
            <span>Customer</span>
            <strong>{order.customer_name}</strong>
          </div>
          <div className="oo-receipt-row">
            <span>Type</span>
            <strong>{order.order_type}</strong>
          </div>
          {order.pickup_time && (
            <div className="oo-receipt-row">
              <span>Pickup</span>
              <strong>{order.pickup_time}</strong>
            </div>
          )}
          <div className="oo-receipt-row">
            <span>Date</span>
            <strong>{order.date}</strong>
          </div>
          <div className="oo-receipt-divider" />
          {(order.items || []).map((it, i) => (
            <div key={i} className="oo-receipt-item">
              <span className="oo-ri-name">{it.name}</span>
              <span className="oo-ri-qty">x{it.qty}</span>
              <span className="oo-ri-price">
                £{(it.price * it.qty).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="oo-receipt-divider" />
          <div className="oo-receipt-total">
            <span>TOTAL</span>
            <strong>£{parseFloat(order.final_amount).toFixed(2)}</strong>
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="oo-receipt-row">
              <span>Payment</span>
              <span>{order.payment_method}</span>
            </div>
            <div className="oo-receipt-row">
              <span>Status</span>
              <span style={{ color: st.color }}>{st.label}</span>
            </div>
          </div>
          <div className="oo-receipt-divider" />
          <div className="oo-receipt-thanks">Thank you!</div>
        </div>
        <div className="oo-modal-footer">
          <button className="oo-modal-print" onClick={() => window.print()}>
            🖨️ Print
          </button>
          <button className="oo-modal-close" onClick={onClose}>
            ✕ Close
          </button>
        </div>
      </div>
    </div>
  );
};

const OnlineOrders = () => {
  const [orders, setOrders] = useState([]);
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState({});
  const [selectedMinutes, setSelectedMinutes] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [audioReady, setAudioReady] = useState(false);
  const [readyAnnounced, setReadyAnnounced] = useState({}); // tracks which orders had "ready" announced
  const [inAppAlert, setInAppAlert] = useState(false);
  const prevPendingCountRef = useRef(null);
  const soundLoopRef = useRef(null);

  // ── Handle tap-to-enable audio (required on mobile) ──────────────────────
  const handleEnableAudio = async () => {
    await unlockAudioCtx();
    requestNotifPermission();
    setAudioReady(true);
    // Play sound immediately so user hears confirmation
    playNewOrderSound();
  };

  // ── Auto-detect if AudioContext is already running (desktop) ─────────────
  useEffect(() => {
    try {
      const ctx = getAudioCtx();
      if (ctx.state === "running") {
        setAudioReady(true);
      }
    } catch {}
    requestNotifPermission();
  }, []);

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      const [ordersRes, statusRes] = await Promise.all([
        api.get("/orders/online"),
        api.get("/orders/online/status"),
      ]);
      const fresh = ordersRes.data.orders || [];
      setOnlineEnabled(statusRes.data.online_orders_enabled ?? true);
      setOrders(fresh);
    } catch {
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // ── Poll every 8 seconds ────────────────────────────────────────────────────
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ── Sound loop + in-app alert when pending orders exist ─────────────────────
  useEffect(() => {
    const pendingCount = orders.filter(
      (o) => o.order_status === "pending",
    ).length;

    // Show in-app banner when count goes up — fires on iOS too (no Web Notifications there)
    if (prevPendingCountRef.current !== null && pendingCount > prevPendingCountRef.current) {
      setInAppAlert(true);
    }
    prevPendingCountRef.current = pendingCount;

    if (pendingCount > 0) {
      if (!soundLoopRef.current) {
        playNewOrderSound();
        soundLoopRef.current = setInterval(playNewOrderSound, 4500);
      }
    } else {
      if (soundLoopRef.current) {
        clearInterval(soundLoopRef.current);
        soundLoopRef.current = null;
      }
      setInAppAlert(false);
    }
  }, [orders]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundLoopRef.current) clearInterval(soundLoopRef.current);
    };
  }, []);

  const handleToggleOnline = async () => {
    // Any button press is a user gesture — unlock audio silently
    if (!audioReady) {
      await unlockAudioCtx();
      requestNotifPermission();
      setAudioReady(true);
    }
    try {
      const res = await api.patch("/orders/online/toggle");
      setOnlineEnabled(res.data.online_orders_enabled);
    } catch {}
  };

  const handleAcceptClick = (id) => {
    if (!audioReady) {
      unlockAudioCtx().then(() => {
        requestNotifPermission();
        setAudioReady(true);
      });
    }
    setAccepting((prev) => ({ ...prev, [id]: true }));
    setSelectedMinutes((prev) => ({ ...prev, [id]: 20 }));
  };

  const handleConfirmAccept = async (id) => {
    const minutes = selectedMinutes[id] ?? 20;
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/orders/online/${id}/accept`, { minutes });
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, order_status: "accepted" } : o)),
      );
      setAccepting((prev) => ({ ...prev, [id]: false }));
    } catch {
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleReject = async (id) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/orders/online/${id}/reject`);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, order_status: "rejected" } : o)),
      );
    } catch {
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ── Staff taps "Order Ready" → updates DB status to "ready" + fires speech/notification ──
  const handleNotifyReady = async (order) => {
    try {
      await api.patch(`/orders/online/${order.id}/ready`);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, order_status: "ready" } : o)),
      );
    } catch {}
    // Fire speech + browser notification regardless of API success
    announceOrderReady(order.order_number);
    setReadyAnnounced((prev) => ({ ...prev, [order.id]: true }));
  };

  const handleMarkDelivered = async (id) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/orders/online/${id}/complete`);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, order_status: "completed" } : o,
        ),
      );
      setReadyAnnounced((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch {
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const pendingCount = orders.filter((o) => o.order_status === "pending").length;
  const readyCount   = orders.filter((o) => o.order_status === "ready").length;
  const filtered = orders.filter((o) =>
    filter === "all" ? true : o.order_status === filter,
  );

  // ── ALL tab: table ──────────────────────────────────────────────────────────
  const renderAllTable = () => (
    <div className="oo-table-wrap">
      <table className="oo-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>Type</th>
            <th>Pickup</th>
            <th>Items</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((order) => {
            const cfg = STATUS_CFG[order.order_status] || STATUS_CFG.pending;
            return (
              <tr key={order.id}>
                <td className="oo-td-num">{order.order_number}</td>
                <td>{order.customer_name}</td>
                <td>
                  <span
                    className={`oo-type-chip ${order.order_type === "Takeaway" ? "takeaway" : "eatin"}`}
                  >
                    {order.order_type === "Takeaway"
                      ? "🥡 Takeaway"
                      : "🍽️ Eat In"}
                  </span>
                </td>
                <td className="oo-td-muted">{order.pickup_time || "—"}</td>
                <td className="oo-td-muted">{(order.items || []).length}pc</td>
                <td className="oo-td-amount">
                  £{parseFloat(order.final_amount).toFixed(2)}
                </td>
                <td className="oo-td-muted">{order.payment_method}</td>
                <td>
                  <span
                    className="oo-status-chip"
                    style={{ background: cfg.chipBg, color: cfg.chipColor }}
                  >
                    {cfg.label}
                  </span>
                </td>
                <td>
                  <button
                    className="oo-receipt-ico"
                    onClick={() => setReceiptOrder(order)}
                    title="View Receipt"
                  >
                    🧾
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── Card tabs: pending / accepted / rejected ────────────────────────────────
  const renderCards = () => (
    <div className="oo-grid">
      {filtered.map((order) => {
        const cfg = STATUS_CFG[order.order_status] || STATUS_CFG.pending;
        const isAcceptingThis = accepting[order.id];
        const isLoading = actionLoading[order.id];

        return (
          <div
            key={order.id}
            className="oo-card"
            style={{ borderColor: cfg.border, background: cfg.bg }}
          >
            {/* Header stripe */}
            <div className="oo-card-stripe" style={{ background: cfg.stripe }}>
              <div className="oo-card-id">#{order.order_number}</div>
              <div
                className="oo-card-status"
                style={{ color: cfg.statusColor }}
              >
                {cfg.label}
              </div>
            </div>

            {/* Meta */}
            <div className="oo-card-body">
              <div className="oo-card-meta-row">
                <span
                  className={`oo-type-chip ${order.order_type === "Takeaway" ? "takeaway" : "eatin"}`}
                >
                  {order.order_type === "Takeaway"
                    ? "🥡 Takeaway"
                    : "🍽️ Eat In"}
                </span>
                {order.pickup_time && (
                  <span className="oo-meta-pill">🕐 {order.pickup_time}</span>
                )}
              </div>

              <div className="oo-card-customer">
                <span className="oo-cust-name">👤 {order.customer_name}</span>
                {order.customer_contact?.phone && (
                  <span className="oo-cust-phone">
                    📞 {order.customer_contact.phone}
                  </span>
                )}
              </div>

              {/* Items list */}
              <div className="oo-items-box">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="oo-item-line">
                    <span className="oo-item-name">{item.name}</span>
                    <span className="oo-item-qty">×{item.qty}</span>
                    <span className="oo-item-price">
                      £{(item.price * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total row */}
              <div className="oo-total-bar">
                <span>Total</span>
                <strong className="oo-total-val">
                  £{parseFloat(order.final_amount).toFixed(2)}
                </strong>
              </div>

              {/* Payment */}
              <div className="oo-pay-row">
                <span>{order.payment_method}</span>
                <span>
                  {order.payment_status === "paid"
                    ? "✅ Paid"
                    : "⏳ Pay on Collection"}
                </span>
              </div>

              {/* Accept time picker */}
              {order.order_status === "pending" && isAcceptingThis && (
                <div className="oo-time-picker">
                  <p className="oo-time-label">⏱ Ready in how many minutes?</p>
                  <div className="oo-presets">
                    {TIME_PRESETS.map((m) => (
                      <button
                        key={m}
                        className={`oo-preset ${selectedMinutes[order.id] === m ? "active" : ""}`}
                        onClick={() =>
                          setSelectedMinutes((prev) => ({
                            ...prev,
                            [order.id]: m,
                          }))
                        }
                      >
                        {m === 0 ? "00" : m}
                      </button>
                    ))}
                  </div>
                  <div className="oo-confirm-row">
                    <button
                      className="oo-confirm-btn"
                      onClick={() => handleConfirmAccept(order.id)}
                      disabled={isLoading}
                    >
                      {isLoading
                        ? "…"
                        : (() => { const m = selectedMinutes[order.id] ?? 20; return `✓ Confirm — ${m === 0 ? "00" : m} min`; })()}
                    </button>
                    <button
                      className="oo-cancel-btn"
                      onClick={() =>
                        setAccepting((prev) => ({ ...prev, [order.id]: false }))
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Pending actions */}
              {order.order_status === "pending" && !isAcceptingThis && (
                <div className="oo-actions">
                  <button
                    className="oo-accept-btn"
                    onClick={() => handleAcceptClick(order.id)}
                    disabled={isLoading}
                  >
                    ✓ Accept
                  </button>
                  <button
                    className="oo-reject-btn"
                    onClick={() => handleReject(order.id)}
                    disabled={isLoading}
                  >
                    ✕ Reject
                  </button>
                </div>
              )}

              {/* Accepted footer — step 1: notify ready (updates DB to "ready") */}
              {order.order_status === "accepted" && (
                <div className="oo-accepted-footer">
                  {order.estimated_ready && (
                    <div className="oo-ready-badge">
                      🕐 Ready at <strong>{order.estimated_ready}</strong>
                    </div>
                  )}
                  <button
                    className="oo-notify-ready-btn"
                    onClick={() => handleNotifyReady(order)}
                    disabled={isLoading}
                  >
                    🔔 Order is Ready!
                  </button>
                </div>
              )}

              {/* Ready footer — step 2: customer notified, now mark as delivered */}
              {order.order_status === "ready" && (
                <div className="oo-accepted-footer">
                  {order.estimated_ready && (
                    <div className="oo-ready-badge">
                      🕐 Ready at <strong>{order.estimated_ready}</strong>
                    </div>
                  )}
                  <div className="oo-announced-badge">
                    🔔 Customer notified — waiting to collect
                  </div>
                  <button
                    className="oo-delivered-btn"
                    onClick={() => handleMarkDelivered(order.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? "…" : "✓ Mark as Delivered"}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="oo-page">
        {/* ── Tap-to-enable audio banner (mobile) ── */}
        {!audioReady && (
          <button className="oo-audio-unlock-btn" onClick={handleEnableAudio}>
            🔔 Tap here to enable sound &amp; notifications
          </button>
        )}

        {/* ── In-app new order alert (iOS fallback — no Web Notifications on iOS Safari) ── */}
        {inAppAlert && (
          <div className="oo-inapp-alert" onClick={() => setInAppAlert(false)}>
            <span className="oo-inapp-alert-icon">🔔</span>
            <span className="oo-inapp-alert-text">New order received! Tap to dismiss.</span>
          </div>
        )}

        {/* ── Header ── */}
        <div className="oo-header">
          <div className="oo-title-row">
            <h1 className="oo-title">🌐 Online Orders</h1>
            {pendingCount > 0 && (
              <span className="oo-new-badge">{pendingCount} new</span>
            )}
          </div>
          <div className="oo-toggle-row">
            <span className="oo-toggle-label">Online Ordering</span>
            <button
              className={`oo-toggle-btn ${onlineEnabled ? "on" : "off"}`}
              onClick={handleToggleOnline}
            >
              {onlineEnabled ? "🟢 ON" : "🔴 OFF"}
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="oo-tabs">
          {["pending", "accepted", "ready", "rejected", "all"].map((tab) => (
            <button
              key={tab}
              className={`oo-tab ${filter === tab ? "active" : ""}`}
              onClick={() => setFilter(tab)}
            >
              {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "pending" && pendingCount > 0 && (
                <span className="oo-tab-dot">{pendingCount}</span>
              )}
              {tab === "ready" && readyCount > 0 && (
                <span className="oo-tab-dot" style={{ background: "#80d4ff", color: "#000" }}>{readyCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="oo-loading">Loading orders…</div>
        ) : filtered.length === 0 ? (
          <div className="oo-empty">
            {filter === "pending"
              ? "✅ No pending orders right now."
              : "No orders in this category."}
          </div>
        ) : filter === "all" ? (
          renderAllTable()
        ) : (
          renderCards()
        )}

        {receiptOrder && (
          <ReceiptModal
            order={receiptOrder}
            onClose={() => setReceiptOrder(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

// ── Status display config ─────────────────────────────────────────────────────
const STATUS_CFG = {
  pending: {
    bg: "#1c1100",
    border: "#FF8C00",
    stripe: "linear-gradient(90deg, #FF6A00, #DD3A00)",
    statusColor: "#fff",
    label: "Pending",
    chipBg: "#FF6A00",
    chipColor: "#fff",
  },
  accepted: {
    bg: "#061510",
    border: "#00a854",
    stripe: "linear-gradient(90deg, #00a854, #007a38)",
    statusColor: "#fff",
    label: "Accepted",
    chipBg: "#00a854",
    chipColor: "#fff",
  },
  ready: {
    bg: "#041420",
    border: "#80d4ff",
    stripe: "linear-gradient(90deg, #0099cc, #006699)",
    statusColor: "#fff",
    label: "Ready",
    chipBg: "#80d4ff",
    chipColor: "#000",
  },
  rejected: {
    bg: "#160808",
    border: "#DD3A00",
    stripe: "linear-gradient(90deg, #DD3A00, #9a2800)",
    statusColor: "#fff",
    label: "Rejected",
    chipBg: "#DD3A00",
    chipColor: "#fff",
  },
  completed: {
    bg: "#0c0e14",
    border: "#4a90d9",
    stripe: "linear-gradient(90deg, #4a90d9, #2c6090)",
    statusColor: "#fff",
    label: "Delivered",
    chipBg: "#4a90d9",
    chipColor: "#fff",
  },
};

export default OnlineOrders;
