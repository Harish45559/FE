import React, { useEffect, useState, useCallback } from "react";
import customerApi from "../../services/customerApi";
import CustomerLayout from "../../components/CustomerLayout";
import "./CustomerOrders.css";

const ORDER_STATUS = {
  pending:   { label: "Awaiting confirmation", color: "#ffa048", icon: "⏳", short: "Pending" },
  accepted:  { label: "Accepted — being prepared", color: "#6effc2", icon: "👨‍🍳", short: "Accepted" },
  rejected:  { label: "Order rejected", color: "#ff8888", icon: "✕", short: "Rejected" },
  ready:     { label: "Ready for collection!", color: "#80d4ff", icon: "🔔", short: "Ready" },
  completed: { label: "Delivered ✓", color: "#aaa", icon: "✅", short: "Delivered" },
};

const CustomerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Display-only polling — notifications/speech handled globally by CustomerLayout
  const fetchOrders = useCallback(async () => {
    try {
      const res = await customerApi.get("/customer/orders");
      setOrders(res.data.orders || []);
    } catch {}
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 12000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleDownload = async (order) => {
    try {
      const res = await customerApi.get(`/customer/orders/${order.id}/receipt`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${order.order_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download receipt");
    }
  };

  return (
    <CustomerLayout>
      <h1 className="c-page-title">My Orders</h1>

      {loading ? (
        <div className="co-loading">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="co-empty">No orders yet. Start ordering!</div>
      ) : (
        <div className="co-list">
          {orders.map((order) => {
            const cfg = ORDER_STATUS[order.order_status] || ORDER_STATUS.pending;
            const isAccepted      = order.order_status === "accepted";
            const isPending       = order.order_status === "pending";
            const isReady         = order.order_status === "ready";
            const isCompleted     = order.order_status === "completed";
            const isRejected      = order.order_status === "rejected";
            const isPaymentFailed = order.payment_method === "Card" && order.payment_status !== "paid";

            return (
              <div
                key={order.id}
                className={`co-card co-status-${order.order_status} ${isReady ? "co-card-ready" : ""} ${isCompleted ? "co-card-done" : ""}`}
              >
                {/* Header */}
                <div className="co-header">
                  <div className="co-header-left">
                    <span className="co-number">#{order.order_number}</span>
                    <span className="co-type-pill">
                      {order.order_type === "Takeaway" ? "🥡 Takeaway" : "🍽️ Eat In"}
                    </span>
                  </div>
                  <div
                    className="co-status-badge"
                    style={{
                      background: `${cfg.color}1a`,
                      borderColor: `${cfg.color}55`,
                      color: cfg.color,
                    }}
                  >
                    {cfg.icon} {cfg.short}
                  </div>
                </div>

                {/* Status-specific banners */}
                {isPaymentFailed && (
                  <div className="co-info-banner co-banner-rejected">
                    ❌ Payment failed. Your order has not been confirmed. Please try ordering again.
                  </div>
                )}

                {isPending && !isPaymentFailed && (
                  <div className="co-info-banner co-banner-pending">
                    ⏳ Waiting for restaurant to confirm your order…
                  </div>
                )}

                {isAccepted && order.estimated_ready && (
                  <div className="co-info-banner co-banner-accepted">
                    👨‍🍳 Being prepared — ready at <strong>{order.estimated_ready}</strong>
                  </div>
                )}

                {isReady && (
                  <div className="co-info-banner co-banner-ready">
                    🔔 Your order is ready for collection!
                  </div>
                )}

                {isCompleted && (
                  <div className="co-info-banner co-banner-done">
                    ✅ Order delivered. Thank you!
                  </div>
                )}

                {isRejected && (
                  <div className="co-info-banner co-banner-rejected">
                    ❌ Your order was rejected. Please contact us.
                  </div>
                )}

                {/* Meta */}
                <div className="co-meta">
                  <span>📅 {order.date}</span>
                  {order.pickup_time && <span>🕐 {order.pickup_time}</span>}
                  <span>💳 {order.payment_method}</span>
                </div>

                {/* Items */}
                <div className="co-items">
                  {(order.items || []).map((item, i) => (
                    <div key={i} className="co-item-row">
                      <span className="co-item-name">{item.name}</span>
                      <span className="co-item-qty">×{item.qty}</span>
                      <span className="co-item-price">£{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="co-footer">
                  <span className="co-total">£{parseFloat(order.final_amount).toFixed(2)}</span>
                  <button className="c-btn c-btn-secondary co-receipt-btn" onClick={() => handleDownload(order)}>
                    🧾 Receipt
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CustomerLayout>
  );
};

export default CustomerOrders;
