import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import customerApi from "../../services/customerApi";
import socket from "../../services/appSocket";
import { useCart } from "../../hooks/useCart";
import CustomerLayout from "../../components/CustomerLayout";
import "./CustomerOrders.css";

const ORDER_STATUS = {
  pending:   { label: "Pending",   color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  accepted:  { label: "Preparing", color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
  rejected:  { label: "Rejected",  color: "#ef4444", bg: "#fff5f5", border: "#fecaca" },
  ready:     { label: "Ready",     color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  completed: { label: "Delivered", color: "#9ca3af", bg: "#f9fafb", border: "#e5e7eb" },
};

const STATUS_FILTERS = [
  { key: "all",       label: "All" },
  { key: "pending",   label: "Pending" },
  { key: "accepted",  label: "Preparing" },
  { key: "ready",     label: "Ready" },
  { key: "completed", label: "Delivered" },
  { key: "rejected",  label: "Rejected" },
];

const CustomerOrders = () => {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter]     = useState("all");
  const { addItem } = useCart();
  const navigate    = useNavigate();

  const fetchOrders = useCallback(async () => {
    try {
      const res = await customerApi.get("/customer/orders");
      setOrders(res.data.orders || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const customer = JSON.parse(localStorage.getItem("customer_user") || "{}");
    const handler = ({ customer_id }) => {
      if (!customer_id || customer_id === customer.id) fetchOrders();
    };
    socket.on("connect", fetchOrders);
    socket.on("order:status-changed", handler);
    return () => {
      socket.off("connect", fetchOrders);
      socket.off("order:status-changed", handler);
    };
  }, [fetchOrders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.order_status !== statusFilter) return false;
      if (typeFilter === "takeaway" && o.order_type !== "Takeaway") return false;
      if (typeFilter === "eatin"    && o.order_type === "Takeaway") return false;
      if (q) {
        const inNumber = String(o.order_number).toLowerCase().includes(q);
        const inItems  = (o.items || []).some((i) =>
          i.name.toLowerCase().includes(q),
        );
        if (!inNumber && !inItems) return false;
      }
      return true;
    });
  }, [orders, statusFilter, typeFilter, search]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const isFiltered = search || statusFilter !== "all" || typeFilter !== "all";

  const handleOrderAgain = (order) => {
    (order.items || []).forEach((item) => {
      for (let i = 0; i < (item.qty || 1); i++) {
        addItem({ id: item.id, name: item.name, price: item.price });
      }
    });
    navigate("/customer/cart");
  };

  const handleDownload = async (order) => {
    try {
      const res = await customerApi.get(`/customer/orders/${order.id}/receipt`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `receipt-${order.order_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download receipt");
    }
  };

  return (
    <CustomerLayout>
      <div className="co-page">

        {/* ── Header ── */}
        <div className="co-header-row">
          <h1 className="co-title">My Orders</h1>
          {orders.length > 0 && (
            <span className="co-count">{filtered.length} of {orders.length}</span>
          )}
        </div>

        {/* ── Filters ── */}
        {orders.length > 0 && (
          <div className="co-filters">
            {/* Search */}
            <div className="co-search-wrap">
              <span className="co-search-icon">🔍</span>
              <input
                className="co-search"
                type="text"
                placeholder="Search order # or item…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="co-search-clear" onClick={() => setSearch("")}>✕</button>
              )}
            </div>

            {/* Type */}
            <select
              className="co-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All types</option>
              <option value="eatin">Eat In</option>
              <option value="takeaway">Takeaway</option>
            </select>

            {/* Status pills */}
            <div className="co-status-pills">
              {STATUS_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  className={`co-pill ${statusFilter === key ? "co-pill--active" : ""}`}
                  onClick={() => setStatusFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Clear */}
            {isFiltered && (
              <button className="co-clear-btn" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="co-state">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="co-state co-empty">
            <span className="co-empty-icon">🛍️</span>
            <span>No orders yet. Start ordering!</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="co-state">No orders match your filters.</div>
        ) : (
          <div className="co-table-wrap">
            <table className="co-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const cfg     = ORDER_STATUS[order.order_status] || ORDER_STATUS.pending;
                  const isReady = order.order_status === "ready";
                  return (
                    <tr key={order.id} className={isReady ? "co-row-ready" : ""}>

                      <td data-label="Order">
                        <div className="co-order-num">#{order.order_number}</div>
                        <div className="co-order-type">
                          {order.order_type === "Takeaway" ? "🥡 Takeaway" : "🍽️ Eat In"}
                        </div>
                      </td>

                      <td data-label="Date">
                        <div className="co-date">{order.date}</div>
                        {order.pickup_time && (
                          <div className="co-pickup">🕐 {order.pickup_time}</div>
                        )}
                      </td>

                      <td data-label="Items">
                        <ul className="co-items-list">
                          {(order.items || []).map((item, i) => (
                            <li key={i} className="co-item">
                              <span className="co-item-name">{item.name}</span>
                              <span className="co-item-qty">×{item.qty}</span>
                              <span className="co-item-price">
                                £{(item.price * item.qty).toFixed(2)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {order.customer_notes && (
                          <div className="co-notes">📝 {order.customer_notes}</div>
                        )}
                      </td>

                      <td data-label="Total">
                        <div className="co-total">£{parseFloat(order.final_amount).toFixed(2)}</div>
                        <div className="co-payment">{order.payment_method}</div>
                      </td>

                      <td data-label="Status">
                        <span
                          className="co-status-badge"
                          style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
                        >
                          {cfg.label}
                        </span>
                        {order.order_status === "accepted" && order.estimated_ready && (
                          <div className="co-ready-time">Ready at {order.estimated_ready}</div>
                        )}
                      </td>

                      <td data-label="Actions">
                        <div className="co-actions">
                          <button className="co-btn co-btn-dark" onClick={() => handleOrderAgain(order)}>
                            🔁 Again
                          </button>
                          <button className="co-btn co-btn-light" onClick={() => handleDownload(order)}>
                            🧾 Receipt
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default CustomerOrders;
