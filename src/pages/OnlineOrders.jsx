import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import api from "../services/api";
import socket from "../services/appSocket";
import "./OnlineOrders.css";
import { btConnected, btPrintOnlineOrder } from "../services/bluetoothPrinter";
import {
  getAudioCtx,
  unlockAudioCtx,
  requestNotifPermission,
  playNewOrderSound,
} from "../services/audio";

// ── Opt 4: STATUS_CFG moved to top (was line 880) — no hoisting confusion ─────
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

const TIME_PRESETS = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

// ── Auto-print receipt on Accept ───────────────────────────────────────────────
async function printOnlineReceipt(order) {
  if (btConnected()) {
    try {
      await btPrintOnlineOrder(order);
      return;
    } catch (_) {}
  }
  const items = order.items || [];
  const onum = order.order_number;
  const cname = order.customer_name;
  const otype = order.order_type || "";
  const odate = order.date || new Date().toLocaleDateString("en-GB");
  const pay = order.payment_method || "";
  const total = parseFloat(order.final_amount).toFixed(2);
  const pickup = order.pickup_time || "";
  const ready = order.estimated_ready || "";
  const notes = order.customer_notes || "";

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
      ${notes ? `<hr/><p style="font-size:10px;font-weight:700;margin:1mm 0 0.5mm">Special Requests:</p><p style="font-size:10px;font-style:italic;margin:0">${notes}</p>` : ""}
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
      ${notes ? `<p style="font-size:12px;font-weight:900;margin:1mm 0 0.5mm">⚠ NOTES: ${notes}</p><hr/>` : ""}
      <p style="text-align:center;font-size:10px;color:#111">${odate}</p>
    </div>`;

  const styles = `<style>
    @page { size: 80mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; width: 80mm; height: auto; overflow: visible; }
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
    .kitchen { page-break-before: always; break-before: page; }
    hr { border: 0; border-top: 1px dashed #333; margin: 2mm 0; }
  </style>`;

  const html = `${customerCopy}${kitchenCopy}`;
  const id = "oo-receipt-frame";
  const old = document.getElementById(id);
  if (old) old.remove();
  const f = document.createElement("iframe");
  f.id = id;
  f.style.cssText = "position:fixed;bottom:0;right:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(f);
  const doc = f.contentDocument || f.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Receipt #${onum}</title>${styles}</head><body>${html}</body></html>`);
  doc.close();
  const doPrint = () => {
    try { f.contentWindow.focus(); f.contentWindow.print(); } catch (_) {}
    setTimeout(() => { try { f.remove(); } catch (_) {} }, 2000);
  };
  setTimeout(doPrint, 150);
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
          {order.customer_notes && (
            <>
              <div className="oo-receipt-divider" />
              <div className="oo-receipt-notes">
                <span className="oo-receipt-notes-label">📝 Notes</span>
                <span className="oo-receipt-notes-text">{order.customer_notes}</span>
              </div>
            </>
          )}
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

// ── Opt 2: OrderCard extracted as memoized component ──────────────────────────
// React.memo prevents re-rendering cards that haven't changed when one order updates
const OrderCard = memo(({
  order, cfg,
  isAccepting, isLoading, selectedMin,
  onAcceptClick, onCancelAccept, onSelectMinutes,
  onConfirmAccept, onReject, onNotifyReady,
  onMarkDelivered, onSetPaidModal,
}) => (
  <div
    className="oo-card"
    style={{ borderColor: cfg.border, background: cfg.bg }}
  >
    <div className="oo-card-stripe" style={{ background: cfg.stripe }}>
      <div className="oo-card-id">#{order.order_number}</div>
      <div className="oo-card-status" style={{ color: cfg.statusColor }}>
        {cfg.label}
      </div>
    </div>

    <div className="oo-card-body">
      <div className="oo-card-meta-row">
        <span className={`oo-type-chip ${order.order_type === "Takeaway" ? "takeaway" : "eatin"}`}>
          {order.order_type === "Takeaway" ? "🥡 Takeaway" : "🍽️ Eat In"}
        </span>
        {order.pickup_time && (
          <span className="oo-pickup-pill">🕐 {order.pickup_time}</span>
        )}
      </div>

      <div className="oo-card-customer">
        <span className="oo-cust-name">👤 {order.customer_name}</span>
        {order.customer_contact?.phone && (
          <span className="oo-cust-phone">📞 {order.customer_contact.phone}</span>
        )}
      </div>

      <div className="oo-items-box">
        {(order.items || []).map((item, i) => (
          <div key={i} className="oo-item-line">
            <span className="oo-item-name">{item.name}</span>
            <span className="oo-item-qty">×{item.qty}</span>
            <span className="oo-item-price">£{(item.price * item.qty).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {order.customer_notes && (
        <div className="oo-notes-box">
          <span className="oo-notes-label">📝 Notes:</span>
          <span className="oo-notes-text">{order.customer_notes}</span>
        </div>
      )}

      <div className="oo-total-bar">
        <span>Total</span>
        <strong className="oo-total-val">£{parseFloat(order.final_amount).toFixed(2)}</strong>
      </div>

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
      {order.order_status === "pending" && isAccepting && (
        <div className="oo-time-picker">
          <p className="oo-time-label">⏱ Ready in how many minutes?</p>
          <div className="oo-presets">
            {TIME_PRESETS.map((m) => (
              <button
                key={m}
                className={`oo-preset ${selectedMin === m ? "active" : ""}`}
                onClick={() => onSelectMinutes(order.id, m)}
              >
                {m === 0 ? "00" : m}
              </button>
            ))}
          </div>
          <div className="oo-confirm-row">
            <button
              className="oo-confirm-btn"
              onClick={() => onConfirmAccept(order.id, selectedMin)}
              disabled={isLoading}
            >
              {isLoading ? "…" : `✓ Confirm — ${selectedMin === 0 ? "00" : selectedMin} min`}
            </button>
            <button className="oo-cancel-btn" onClick={() => onCancelAccept(order.id)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending actions */}
      {order.order_status === "pending" && !isAccepting && (
        <div className="oo-actions">
          <button
            className="oo-accept-btn"
            onClick={() => onAcceptClick(order.id)}
            disabled={isLoading}
          >
            ✓ Accept
          </button>
          <button
            className="oo-reject-btn"
            onClick={() => onReject(order.id)}
            disabled={isLoading}
          >
            ✕ Reject
          </button>
        </div>
      )}

      {/* Accepted footer */}
      {order.order_status === "accepted" && (
        <div className="oo-accepted-footer">
          {order.estimated_ready && (
            <div className="oo-ready-badge">
              🕐 Ready at <strong>{order.estimated_ready}</strong>
            </div>
          )}
          <button
            className="oo-notify-ready-btn"
            onClick={() => onNotifyReady(order)}
            disabled={isLoading}
          >
            🔔 Order is Ready!
          </button>
        </div>
      )}

      {/* Ready footer */}
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
          {/* Pay on Collection — disabled for now, uncomment to enable
          {order.payment_method === "Pay on Collection" && order.payment_status !== "paid" && (
            <button
              className="oo-mark-paid-btn"
              onClick={() => onSetPaidModal(order.id)}
              disabled={isLoading}
            >
              💰 Mark as Paid
            </button>
          )} */}
          <button
            className="oo-delivered-btn"
            onClick={() => onMarkDelivered(order.id)}
            disabled={isLoading}
          >
            {isLoading ? "…" : "✓ Mark as Delivered"}
          </button>
        </div>
      )}
    </div>
  </div>
));

const OnlineOrders = () => {
  const [orders, setOrders] = useState([]);
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  // Opt 3: merged accepting + selectedMinutes + actionLoading into one object
  // orderUiState[id] = { accepting: bool, minutes: number, loading: bool }
  const [orderUiState, setOrderUiState] = useState({});

  const [receiptOrder, setReceiptOrder] = useState(null);
  const [markPaidModal, setMarkPaidModal] = useState(null);
  const [audioReady, setAudioReady] = useState(false);
  const [inAppAlert, setInAppAlert] = useState(false);
  const prevPendingCountRef = useRef(null);
  const ordersRef = useRef(orders);

  // Keep ordersRef in sync — lets callbacks read latest orders without being in deps
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  const patchUi = useCallback((id, patch) => {
    setOrderUiState((prev) => ({
      ...prev,
      [id]: { accepting: false, minutes: 20, loading: false, ...prev[id], ...patch },
    }));
  }, []);

  const handleEnableAudio = async () => {
    await unlockAudioCtx();
    requestNotifPermission();
    setAudioReady(true);
    playNewOrderSound();
  };

  useEffect(() => {
    try {
      if (getAudioCtx().state === "running") setAudioReady(true);
    } catch {}
    requestNotifPermission();
  }, []);

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      const [ordersRes, statusRes] = await Promise.all([
        api.get("/orders/online"),
        api.get("/orders/online/status"),
      ]);
      setOnlineEnabled(statusRes.data.online_orders_enabled ?? true);
      setOrders(ordersRes.data.orders || []);
    } catch {
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const refresh = () => fetchOrders(true);
    socket.on("connect", refresh);
    socket.on("order:new", refresh);
    socket.on("order:status-changed", refresh);
    return () => {
      socket.off("connect", refresh);
      socket.off("order:new", refresh);
      socket.off("order:status-changed", refresh);
    };
  }, [fetchOrders]);

  // In-app alert + browser notification when new pending orders arrive
  useEffect(() => {
    const pendingCount = orders.filter((o) => o.order_status === "pending").length;
    if (prevPendingCountRef.current !== null && pendingCount > prevPendingCountRef.current) {
      setInAppAlert(true);
      playNewOrderSound();
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("🔔 New Order!", {
            body: `${pendingCount} pending order${pendingCount > 1 ? "s" : ""} waiting`,
            icon: "/favicon.ico",
            tag: "new-order",
            renotify: true,
          });
        } catch {}
      }
    }
    if (pendingCount === 0) setInAppAlert(false);
    prevPendingCountRef.current = pendingCount;
  }, [orders]);

  const handleToggleOnline = useCallback(async () => {
    if (!audioReady) {
      await unlockAudioCtx();
      requestNotifPermission();
      setAudioReady(true);
    }
    try {
      const res = await api.patch("/orders/online/toggle");
      setOnlineEnabled(res.data.online_orders_enabled);
    } catch {}
  }, [audioReady]);

  const handleAcceptClick = useCallback((id) => {
    if (!audioReady) {
      unlockAudioCtx().then(() => { requestNotifPermission(); setAudioReady(true); });
    }
    patchUi(id, { accepting: true, minutes: 20 });
  }, [audioReady, patchUi]);

  const handleCancelAccept = useCallback((id) => {
    patchUi(id, { accepting: false });
  }, [patchUi]);

  const handleSelectMinutes = useCallback((id, minutes) => {
    patchUi(id, { minutes });
  }, [patchUi]);

  const handleConfirmAccept = useCallback(async (id, minutes) => {
    patchUi(id, { loading: true });
    try {
      const res = await api.patch(`/orders/online/${id}/accept`, { minutes });
      const estimatedReady = res.data.estimated_ready;
      const order = ordersRef.current.find((o) => o.id === id);
      setOrders((prev) =>
        prev.map((o) => o.id === id ? { ...o, order_status: "accepted", estimated_ready: estimatedReady } : o),
      );
      if (order) printOnlineReceipt({ ...order, estimated_ready: estimatedReady });
      patchUi(id, { accepting: false, loading: false });
    } catch {
      patchUi(id, { loading: false });
    }
  }, [patchUi]);

  const handleReject = useCallback(async (id) => {
    patchUi(id, { loading: true });
    try {
      await api.patch(`/orders/online/${id}/reject`);
      setOrders((prev) =>
        prev.map((o) => o.id === id ? { ...o, order_status: "rejected" } : o),
      );
    } catch {
    } finally {
      patchUi(id, { loading: false });
    }
  }, [patchUi]);

  const handleNotifyReady = useCallback(async (order) => {
    try {
      await api.patch(`/orders/online/${order.id}/ready`);
      setOrders((prev) =>
        prev.map((o) => o.id === order.id ? { ...o, order_status: "ready" } : o),
      );
    } catch {}
  }, []);

  const handleMarkDelivered = useCallback(async (id) => {
    patchUi(id, { loading: true });
    try {
      await api.patch(`/orders/online/${id}/complete`);
      setOrders((prev) =>
        prev.map((o) => o.id === id ? { ...o, order_status: "completed" } : o),
      );
    } catch {
    } finally {
      patchUi(id, { loading: false });
    }
  }, [patchUi]);

  const handleMarkPaid = useCallback(async (id, method) => {
    setMarkPaidModal(null);
    patchUi(id, { loading: true });
    try {
      await api.patch(`/orders/online/${id}/mark-paid`, { payment_method: method });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, payment_status: "paid", payment_method: method } : o,
        ),
      );
    } catch {
    } finally {
      patchUi(id, { loading: false });
    }
  }, [patchUi]);

  const isAwaitingPayment = (o) => o.payment_method === "Card" && o.payment_status !== "paid";

  const pendingCount = orders.filter(
    (o) => o.order_status === "pending" && !isAwaitingPayment(o),
  ).length;

  const filtered = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "accepted") return o.order_status === "accepted" || o.order_status === "ready";
    if (filter === "pending") return o.order_status === "pending" && !isAwaitingPayment(o);
    return o.order_status === filter;
  });

  // ── ALL tab: table ────────────────────────────────────────────────────────────
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
                  <span className={`oo-type-chip ${order.order_type === "Takeaway" ? "takeaway" : "eatin"}`}>
                    {order.order_type === "Takeaway" ? "🥡 Takeaway" : "🍽️ Eat In"}
                  </span>
                </td>
                <td className="oo-td-muted">{order.pickup_time || "—"}</td>
                <td className="oo-td-muted">{(order.items || []).length}pc</td>
                <td className="oo-td-amount">£{parseFloat(order.final_amount).toFixed(2)}</td>
                <td className="oo-td-muted">
                  {order.payment_method}{" "}
                  {order.payment_status === "paid" ? "✅" : order.payment_method === "Card" ? "⏳" : ""}
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

  // ── Card tabs: pending / accepted / rejected ──────────────────────────────────
  const renderCards = () => (
    <div className="oo-grid">
      {filtered.map((order) => {
        const ui = orderUiState[order.id] || {};
        return (
          <OrderCard
            key={order.id}
            order={order}
            cfg={STATUS_CFG[order.order_status] || STATUS_CFG.pending}
            isAccepting={ui.accepting || false}
            isLoading={ui.loading || false}
            selectedMin={ui.minutes ?? 20}
            onAcceptClick={handleAcceptClick}
            onCancelAccept={handleCancelAccept}
            onSelectMinutes={handleSelectMinutes}
            onConfirmAccept={handleConfirmAccept}
            onReject={handleReject}
            onNotifyReady={handleNotifyReady}
            onMarkDelivered={handleMarkDelivered}
            onSetPaidModal={setMarkPaidModal}
          />
        );
      })}
    </div>
  );

  return (
    <>
      <div className="oo-page">
        {!audioReady && (
          <button className="oo-audio-unlock-btn" onClick={handleEnableAudio}>
            🔔 Tap here to enable sound &amp; notifications
          </button>
        )}

        {inAppAlert && (
          <div className="oo-inapp-alert" onClick={() => setInAppAlert(false)}>
            <span className="oo-inapp-alert-icon">🔔</span>
            <span className="oo-inapp-alert-text">New order received! Tap to dismiss.</span>
          </div>
        )}

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

        {loading ? (
          <div className="oo-loading">Loading orders…</div>
        ) : filtered.length === 0 ? (
          <div className="oo-empty">
            {filter === "pending" ? "✅ No pending orders right now." : "No orders in this category."}
          </div>
        ) : filter === "all" ? (
          renderAllTable()
        ) : (
          renderCards()
        )}

        {receiptOrder && (
          <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />
        )}

        {/* Opt 6: markPaidModal uses CSS classes instead of inline styles */}
        {markPaidModal && (
          <div className="oo-paid-overlay" onClick={() => setMarkPaidModal(null)}>
            <div className="oo-paid-modal" onClick={(e) => e.stopPropagation()}>
              <div className="oo-paid-icon">💰</div>
              <h3 className="oo-paid-title">How did the customer pay?</h3>
              <p className="oo-paid-subtitle">Select the payment method used at collection</p>
              <div className="oo-paid-btns">
                <button className="oo-paid-btn-cash" onClick={() => handleMarkPaid(markPaidModal, "Cash")}>
                  💵 Cash
                </button>
                <button className="oo-paid-btn-card" onClick={() => handleMarkPaid(markPaidModal, "Card on Collection")}>
                  💳 Card
                </button>
              </div>
              <button className="oo-paid-cancel" onClick={() => setMarkPaidModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default OnlineOrders;
