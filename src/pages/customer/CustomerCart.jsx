import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import customerApi from "../../services/customerApi";
import CustomerLayout from "../../components/CustomerLayout";
import { useCart } from "../../hooks/useCart";
import "./CustomerCart.css";

const CustomerCart = () => {
  const navigate = useNavigate();
  const { cart, updateQty, removeItem, clearCart, total } = useCart();

  const [orderType, setOrderType] = useState("Takeaway");
  const [paymentMethod, setPaymentMethod] = useState("Pay on Collection");
  const [slots, setSlots] = useState([]);
  const [pickupTime, setPickupTime] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch time slots for both Takeaway and Eat In
  useEffect(() => {
    if (orderType !== "Takeaway" && orderType !== "Eat In") return;
    const fetchSlots = async () => {
      try {
        const res = await customerApi.get(
          `/customer/timeslots?date=${selectedDate}`,
        );
        const available = res.data.slots || [];
        setSlots(available);
        setPickupTime(available[0] || "");
      } catch {
        setSlots([]);
      }
    };
    fetchSlots();
  }, [selectedDate, orderType]);

  const handlePlaceOrder = async () => {
    setError("");
    if (cart.length === 0) return setError("Your cart is empty");
    if ((orderType === "Takeaway" || orderType === "Eat In") && !pickupTime)
      return setError("Please select a pickup time");

    try {
      setLoading(true);
      const needsSlot = orderType === "Takeaway" || orderType === "Eat In";
      const payload = {
        order_type: orderType,
        items: cart,
        payment_method: paymentMethod,
        pickup_time: needsSlot ? `${pickupTime} ${formatDate(selectedDate)}` : null,
      };
      const res = await customerApi.post("/customer/orders", payload);
      const order = res.data.order;
      clearCart();

      if (paymentMethod === "Card") {
        navigate("/customer/payment", { state: { order } });
      } else {
        navigate("/customer/order-confirmation", { state: { order } });
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const today = new Date().toISOString().split("T")[0];

  if (cart.length === 0) {
    return (
      <CustomerLayout>
        <h1 className="c-page-title">Your Cart</h1>
        <div className="cc-empty">
          <div className="cc-empty-icon">🛒</div>
          <p>Your cart is empty</p>
          <button
            className="c-btn c-btn-primary"
            onClick={() => navigate("/customer/menu")}
          >
            Browse Menu
          </button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <h1 className="c-page-title">Your Cart</h1>
      <div className="cc-layout">
        {/* ── Cart Items ── */}
        <div className="cc-items c-card">
          <h3 className="cc-section-title">Items</h3>
          {cart.map((item) => (
            <div key={item.id} className="cc-item">
              <div className="cc-item-name">{item.name}</div>
              <div className="cc-item-right">
                <div className="cc-qty-row">
                  <button
                    className="cc-qty-btn"
                    onClick={() => updateQty(item.id, item.qty - 1)}
                  >
                    −
                  </button>
                  <span className="cc-qty">{item.qty}</span>
                  <button
                    className="cc-qty-btn"
                    onClick={() => updateQty(item.id, item.qty + 1)}
                  >
                    +
                  </button>
                </div>
                <span className="cc-item-price">
                  £{(item.price * item.qty).toFixed(2)}
                </span>
                <button
                  className="cc-remove"
                  onClick={() => removeItem(item.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <div className="cc-total-row">
            <span>Total</span>
            <span className="cc-total">£{total.toFixed(2)}</span>
          </div>
        </div>

        {/* ── Order Options ── */}
        <div className="cc-options">
          {/* Order type */}
          <div className="c-card">
            <h3 className="cc-section-title">Order Type</h3>
            <div className="cc-type-btns">
              {["Takeaway", "Eat In"].map((type) => (
                <button
                  key={type}
                  className={`cc-type-btn ${orderType === type ? "active" : ""}`}
                  onClick={() => setOrderType(type)}
                >
                  {type === "Takeaway" ? "🥡 Takeaway" : "🍽️ Eat In"}
                </button>
              ))}
            </div>
          </div>

          {/* Pickup time — Takeaway and Eat In */}
          {(orderType === "Takeaway" || orderType === "Eat In") && (
            <div className="c-card">
              <h3 className="cc-section-title">
                {orderType === "Eat In" ? "Table Ready Time" : "Pickup Time"}
              </h3>
              <label className="c-label">Date</label>
              <input
                type="date"
                className="c-input"
                min={today}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <label className="c-label" style={{ marginTop: 14 }}>
                Time Slot
              </label>
              {slots.length === 0 ? (
                <p className="cc-no-slots">No slots available for this date.</p>
              ) : (
                <div className="cc-slots">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      className={`cc-slot ${pickupTime === slot ? "active" : ""}`}
                      onClick={() => setPickupTime(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payment method */}
          <div className="c-card">
            <h3 className="cc-section-title">Payment</h3>
            <div className="cc-type-btns">
              {[
                { value: "Pay on Collection", label: "🏪 Pay on Collection" },
                { value: "Card", label: "💳 Pay Online (Card)" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  className={`cc-type-btn ${paymentMethod === value ? "active" : ""}`}
                  onClick={() => setPaymentMethod(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {paymentMethod === "Card" && (
              <p style={{ fontSize: "0.8rem", color: "#aaa", marginTop: "10px", marginBottom: 0 }}>
                You'll enter your card details on the next screen.
              </p>
            )}
          </div>

          {/* Summary + Place Order */}
          <div className="c-card cc-summary">
            {error && <div className="c-error">{error}</div>}
            <div className="cc-summary-row">
              <span>Subtotal</span>
              <span>£{total.toFixed(2)}</span>
            </div>
            <div className="cc-summary-row total">
              <span>Total</span>
              <span>£{total.toFixed(2)}</span>
            </div>
            {(orderType === "Takeaway" || orderType === "Eat In") && pickupTime && (
              <div className="cc-pickup-info">
                {orderType === "Eat In" ? "Ready:" : "Pickup:"} {pickupTime} on {formatDate(selectedDate)}
              </div>
            )}
            <button
              className="c-btn c-btn-primary cc-place-btn"
              onClick={handlePlaceOrder}
              disabled={loading}
            >
              {loading ? "Placing Order…" : "Place Order"}
            </button>
            <button
              className="c-btn c-btn-secondary"
              onClick={() => navigate("/customer/menu")}
            >
              Add More Items
            </button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerCart;
