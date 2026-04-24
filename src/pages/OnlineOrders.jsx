import React, { useEffect, useState, useRef, useCallback } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import socket from "../services/appSocket";
import "./OnlineOrders.css";

const TIME_PRESETS = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

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

// ── Auto-print receipt on Accept (customer copy + kitchen copy) ───────────────
function printOnlineReceipt(order) {
  const items = order.items || [];
  const onum = order.order_number;
  const cname = order.customer_name;
  const otype = order.order_type || "";
  const odate = order.date || new Date().toLocaleDateString("en-GB");
  const pay = order.payment_method || "";
  const total = parseFloat(order.final_amount).toFixed(2);
  const pickup = order.pickup_time || "";
  const ready = order.estimated_ready || "";

  const itemRows = items.map((it) => {
    const qty = it.qty || 1;
    return `<div class="item-row"><span class="item-name">${qty}x ${it.name}</span><span class="item-price">£${(it.price * qty).toFixed(2)}</span></div>`;
  }).join("");

  const kitchenRows = items.map((it) => {
    const qty = it.qty || 1;
    return `<tr><td style="font-size:14px;font-weight:900;padding:2mm 0">${qty} X ${it.name.toUpperCase()}</td></tr>`;
  }).join("");

  const customerCopy = `
    <div class="bill-section">
      <div class="receipt-header">
        <h2>Mirchi Mafiya</h2>
        <p class="light">Cumberland Street, LU1 3BW, Luton</p>
        <p class="light">Phone: +447440086046</p>
      </div>
      <hr/>
      <p class="highlight-row">ONLINE ORDER #${onum}</p>
      <p class="highlight-row">${cname}</p>
      <p class="light">Type: ${otype}</p>
      ${pickup ? `<p class="highlight-row" style="font-size:11px">Pickup: ${pickup}</p>` : ""}
      ${ready ? `<p class="highlight-row" style="font-size:11px">Ready by: ${ready}</p>` : ""}
      <p class="light">Date: ${odate}</p>
      <hr/>
      <p class="items-label">Items</p>
      <div class="items-block">${itemRows}</div>
      <hr/>
      <div class="receipt-summary">
        <div class="summary-row grand-total"><span>TOTAL</span><span>£${total}</span></div>
        <div class="summary-row highlight-pay"><span>Payment</span><span>${pay}</span></div>
      </div>
      <p style="text-align:center;margin-top:3mm;font-size:9px;color:#111">Thank you for your order!</p>
    </div>`;

  const kitchenCopy = `
    <div class="bill-section kitchen">
      <div style="text-align:center;margin-bottom:3mm">
        <h2 style="font-size:14px;margin:0">KITCHEN — ONLINE</h2>
        <div style="font-size:22px;font-weight:900;letter-spacing:1px;margin:2mm 0">#${onum}</div>
        <div style="font-size:15px;font-weight:800">${otype.toUpperCase()}</div>
        ${pickup ? `<div style="font-size:13px;font-weight:700;margin-top:1mm">Pickup: ${pickup}</div>` : ""}
        ${ready ? `<div style="font-size:13px;font-weight:700">Ready: ${ready}</div>` : ""}
        <div style="font-size:13px;font-weight:700;margin-top:1mm">${cname}</div>
      </div>
      <hr/>
      <table style="width:100%"><tbody>${kitchenRows}</tbody></table>
      <hr/>
      <p style="text-align:center;font-size:10px;color:#111">${odate}</p>
    </div>`;

  const styles = `<style>
    @page { size: 80mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; background: #fff; color: #000; }
    .bill-section { width: 72mm; max-width: 72mm; padding: 5mm 4mm; margin: 0 auto; font-size: 11px; line-height: 1.4; }
    .receipt-header { text-align: center; margin-bottom: 2mm; }
    .receipt-header h2 { font-size: 15px; margin: 0 0 1mm; font-weight: 900; letter-spacing: 1px; }
    .light { font-weight: 400; font-size: 10px; color: #111; margin: 0.5mm 0; }
    .highlight-row { font-size: 13px; font-weight: 900; margin: 1mm 0; letter-spacing: 0.3px; }
    .items-label { font-size: 9px; font-weight: 700; color: #333; text-transform: uppercase; letter-spacing: .8px; margin: 1.5mm 0 1mm; }
    .items-block { display: flex; flex-direction: column; gap: 1mm; margin-bottom: 1mm; }
    .item-row { display: flex; justify-content: space-between; align-items: baseline; gap: 4px; }
    .item-name { font-size: 12px; font-weight: 900; flex: 1; }
    .item-price { font-size: 12px; font-weight: 900; white-space: nowrap; }
    .receipt-summary { margin-top: 1mm; }
    .summary-row { display: flex; justify-content: space-between; margin: 0.6mm 0; }
    .grand-total { font-size: 13px; font-weight: 900; border-top: 2px solid #000; padding-top: 1mm; margin-top: 1mm; }
    .highlight-pay { font-size: 12px; font-weight: 900; }
    .kitchen { border-top: 3px dashed #000; }
    hr { border: 0; border-top: 1px dashed #333; margin: 2mm 0; }
    .page-break { page-break-after: always; break-after: page; height: 0; display: block; }
  </style>`;

  const html = `${customerCopy}<div class="page-break"></div>${kitchenCopy}`;
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Receipt #${onum}</title>${styles}</head><body>${html}</body></html>`);
  w.document.close();
  const doPrint = () => { try { w.focus(); w.print(); } finally { w.close(); } };
  if (w.document.readyState === "complete") setTimeout(doPrint, 50);
  else w.onload = () => setTimeout(doPrint, 50);
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
  const [markPaidModal, setMarkPaidModal] = useState(null); // order id awaiting pay method selection
  const [audioReady, setAudioReady] = useState(false);
  const [readyAnnounced, setReadyAnnounced] = useState({}); // tracks which orders had "ready" announced
  const [inAppAlert, setInAppAlert] = useState(false);
  const prevPendingCountRef = useRef(null);

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

  useEffect(() => {
    fetchOrders();
    const refresh = () => fetchOrders(true);
    socket.on("order:new", refresh);
    socket.on("order:status-changed", refresh);
    return () => {
      socket.off("order:new", refresh);
      socket.off("order:status-changed", refresh);
    };
  }, [fetchOrders]);

  // ── In-app alert + browser notification when new pending orders arrive ────────
  useEffect(() => {
    const pendingCount = orders.filter((o) => o.order_status === "pending").length;
    if (prevPendingCountRef.current !== null && pendingCount > prevPendingCountRef.current) {
      setInAppAlert(true);
      playNewOrderSound();
      // Fire browser notification — works even when tab is in background
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("🔔 New Order!", {
            body: `${pendingCount} pending order${pendingCount > 1 ? "s" : ""} waiting`,
            icon: "/favicon.ico",
            tag: "new-order",   // replaces previous notification instead of stacking
            renotify: true,
          });
        } catch {}
      }
    }
    if (pendingCount === 0) setInAppAlert(false);
    prevPendingCountRef.current = pendingCount;
  }, [orders]);

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
      const res = await api.patch(`/orders/online/${id}/accept`, { minutes });
      const estimatedReady = res.data.estimated_ready;
      const order = orders.find((o) => o.id === id);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, order_status: "accepted", estimated_ready: estimatedReady } : o)),
      );
      setAccepting((prev) => ({ ...prev, [id]: false }));
      // Auto-print receipt (customer copy + kitchen copy) on accept
      if (order) printOnlineReceipt({ ...order, estimated_ready: estimatedReady });
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

  // ── Staff taps "Order Ready" → updates DB status to "ready" ─────────────────
  // Speech + notification fires on the CUSTOMER'S screen via CustomerLayout polling
  const handleNotifyReady = async (order) => {
    try {
      await api.patch(`/orders/online/${order.id}/ready`);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, order_status: "ready" } : o)),
      );
    } catch {}
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

  const handleMarkPaid = async (id, method) => {
    setMarkPaidModal(null);
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/orders/online/${id}/mark-paid`, { payment_method: method });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, payment_status: "paid", payment_method: method } : o,
        ),
      );
    } catch {
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Card orders that haven't been paid yet are awaiting payment — exclude from pending tab
  const isAwaitingPayment = (o) => o.payment_method === "Card" && o.payment_status !== "paid";

  const pendingCount = orders.filter(
    (o) => o.order_status === "pending" && !isAwaitingPayment(o)
  ).length;

  // "accepted" tab shows both accepted and ready orders
  const filtered = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "accepted") return o.order_status === "accepted" || o.order_status === "ready";
    if (filter === "pending") return o.order_status === "pending" && !isAwaitingPayment(o);
    return o.order_status === filter;
  });

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
                <td className="oo-td-muted">
                  {order.payment_method}
                  {" "}
                  {order.payment_status === "paid"
                    ? "✅"
                    : order.payment_method === "Card"
                    ? "⏳"
                    : ""}
                </td>
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
                    ? `✅ Paid (${order.payment_method})`
                    : order.payment_method === "Card"
                    ? "⏳ Awaiting Online Payment"
                    : "🏪 Collect payment on arrival"}
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

              {/* Ready footer — step 2: mark paid (if Pay on Collection) then mark delivered */}
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
                  {order.payment_method === "Pay on Collection" && order.payment_status !== "paid" && (
                    <button
                      className="oo-mark-paid-btn"
                      onClick={() => setMarkPaidModal(order.id)}
                      disabled={isLoading}
                    >
                      💰 Mark as Paid
                    </button>
                  )}
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
          {["pending", "accepted", "rejected", "all"].map((tab) => (
            <button
              key={tab}
              className={`oo-tab ${filter === tab ? "active" : ""}`}
              onClick={() => setFilter(tab)}
            >
              {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "pending" && pendingCount > 0 && (
                <span className="oo-tab-dot">{pendingCount}</span>
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

        {/* ── Mark as Paid modal ── */}
        {markPaidModal && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
            onClick={() => setMarkPaidModal(null)}
          >
            <div
              style={{ background: "#fff", borderRadius: 16, padding: "28px 24px", width: 300, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>💰</div>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>How did the customer pay?</h3>
              <p style={{ color: "#9ca3af", fontSize: "0.82rem", marginBottom: 20 }}>Select the payment method used at collection</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => handleMarkPaid(markPaidModal, "Cash")}
                  style={{ flex: 1, padding: "12px 0", background: "#f0fdf4", color: "#16a34a", border: "1.5px solid #bbf7d0", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}
                >
                  💵 Cash
                </button>
                <button
                  onClick={() => handleMarkPaid(markPaidModal, "Card on Collection")}
                  style={{ flex: 1, padding: "12px 0", background: "#eff6ff", color: "#2563eb", border: "1.5px solid #bfdbfe", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}
                >
                  💳 Card
                </button>
              </div>
              <button
                onClick={() => setMarkPaidModal(null)}
                style={{ marginTop: 14, width: "100%", padding: "10px 0", background: "#f3f4f6", border: "none", borderRadius: 10, color: "#6b7280", fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
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
