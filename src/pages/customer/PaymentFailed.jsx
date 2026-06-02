import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/CustomerLayout";

const PaymentFailed = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const order = state?.order;

  return (
    <CustomerLayout>
      <div style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: "0 16px" }}>
        <div style={{ fontSize: "4rem", marginBottom: 16 }}>❌</div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>
          Payment Failed
        </h1>
        <p style={{ color: "#666", fontSize: "0.95rem", marginBottom: 8 }}>
          Your payment could not be processed and your order has been cancelled.
        </p>
        {order && (
          <p style={{ color: "#aaa", fontSize: "0.85rem", marginBottom: 32 }}>
            Order #{order.order_number} · £{parseFloat(order.final_amount).toFixed(2)}
          </p>
        )}

        <div style={{ background: "#fff8f5", borderRadius: 12, padding: 20, marginBottom: 28, textAlign: "left", border: "1px solid #fde8d8" }}>
          <p style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>What you can do:</p>
          <ul style={{ color: "#555", fontSize: "0.9rem", paddingLeft: 18, lineHeight: 2 }}>
            <li>Check your card details and try again</li>
            <li>Make sure your card has sufficient funds</li>
            <li>Try a different card</li>
            <li>Contact your bank if the issue persists</li>
          </ul>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            className="c-btn c-btn-primary"
            onClick={() => navigate("/customer/menu")}
          >
            🔄 Place a New Order
          </button>
          <button
            className="c-btn c-btn-secondary"
            onClick={() => navigate("/customer/orders")}
          >
            View My Orders
          </button>
        </div>

        <p style={{ marginTop: 24, color: "#aaa", fontSize: "0.82rem" }}>
          Need help? Contact us at mirchimafiyarestaurant@gmail.com
        </p>
      </div>
    </CustomerLayout>
  );
};

export default PaymentFailed;
