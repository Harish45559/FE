import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import customerApi from "../../services/customerApi";
import CustomerLayout from "../../components/CustomerLayout";
import "./OrderConfirmation.css";

const OrderConfirmation = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const order = state?.order;
  const [accepted, setAccepted] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const pollRef = useRef(null);
  const countRef = useRef(null);

  useEffect(() => {
    if (!order?.id) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await customerApi.get(`/customer/orders/${order.id}`);
        const status = res.data.order?.order_status;
        if (status === "accepted" || status === "ready" || status === "completed") {
          clearInterval(pollRef.current);
          setAccepted(true);
          let secs = 4;
          countRef.current = setInterval(() => {
            secs -= 1;
            setCountdown(secs);
            if (secs <= 0) {
              clearInterval(countRef.current);
              navigate("/customer/orders");
            }
          }, 1000);
        } else if (status === "rejected") {
          clearInterval(pollRef.current);
          setRejected(true);
          let secs = 4;
          countRef.current = setInterval(() => {
            secs -= 1;
            setCountdown(secs);
            if (secs <= 0) {
              clearInterval(countRef.current);
              navigate("/customer/orders");
            }
          }, 1000);
        }
      } catch {}
    }, 5000);

    return () => {
      clearInterval(pollRef.current);
      clearInterval(countRef.current);
    };
  }, [order?.id, navigate]);

  const handleDownloadReceipt = async () => {
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

  if (!order) {
    return (
      <CustomerLayout>
        <div className="oc-error">
          <p>No order found.</p>
          <button className="c-btn c-btn-primary" onClick={() => navigate("/customer/menu")}>
            Back to Menu
          </button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="oc-wrapper">
        {accepted && (
          <div className="oc-accepted-banner">
            🎉 Your order has been accepted! Redirecting to My Orders in {countdown}s…
          </div>
        )}
        {rejected && (
          <div className="oc-rejected-banner">
            ❌ Your order was rejected. Redirecting to My Orders in {countdown}s…
          </div>
        )}
        <div className="oc-icon">✅</div>
        <h1 className="oc-title">Order Received!</h1>
        <p className="oc-sub">We've got your order — our team will confirm it shortly. You'll see the status update in My Orders.</p>

        <div className="c-card oc-card">
          <div className="oc-row">
            <span>Order Number</span>
            <span className="oc-value oc-highlight">{order.order_number}</span>
          </div>
          <div className="oc-row">
            <span>Type</span>
            <span className="oc-value">{order.order_type}</span>
          </div>
          {order.pickup_time && (
            <div className="oc-row">
              <span>Pickup Time</span>
              <span className="oc-value oc-highlight">{order.pickup_time}</span>
            </div>
          )}
          <div className="oc-row">
            <span>Payment</span>
            <span className="oc-value">{order.payment_method}</span>
          </div>
          <div className="oc-row">
            <span>Status</span>
            <span className={`oc-value ${order.payment_status === "paid" ? "oc-paid" : "oc-pending"}`}>
              {order.payment_status === "paid" ? "✅ Paid" : "Pay on Collection"}
            </span>
          </div>

          <div className="oc-divider" />

          <div className="oc-items">
            {(order.items || []).map((item, i) => (
              <div key={i} className="oc-item">
                <span>{item.name} × {item.qty}</span>
                <span>£{(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="oc-total-row">
            <span>Total</span>
            <span>£{parseFloat(order.final_amount).toFixed(2)}</span>
          </div>
        </div>

        <div className="oc-actions">
          <button className="c-btn c-btn-primary" onClick={handleDownloadReceipt}>
            Download Receipt
          </button>
          <button className="c-btn c-btn-secondary" onClick={() => navigate("/customer/orders")}>
            My Orders
          </button>
          <button className="c-btn c-btn-secondary" onClick={() => navigate("/customer/menu")}>
            Order More
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default OrderConfirmation;
