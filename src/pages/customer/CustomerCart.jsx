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
  const [paymentMethod, setPaymentMethod] = useState("Card");
  const [slots, setSlots] = useState([]);
  const [pickupTime, setPickupTime] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMsg, setPromoMsg] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

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

  // Re-validate promo whenever cart changes while a promo is applied
  useEffect(() => {
    if (!promoCode) return;
    const revalidate = async () => {
      try {
        const res = await customerApi.post("/customer/orders/validate-promo", {
          code: promoCode,
          items: cart.map((i) => ({ id: i.id, price: i.price, qty: i.qty, category_id: i.categoryId })),
        });
        setPromoDiscount(res.data.discount_amount || 0);
        setPromoMsg(`🏷️ ${res.data.description || res.data.code} — £${res.data.discount_amount.toFixed(2)} off applied!`);
        setPromoError("");
      } catch (err) {
        // Promo no longer valid for current cart — clear it
        setPromoCode("");
        setPromoDiscount(0);
        setPromoMsg("");
        setPromoError(err?.response?.data?.message || "Promo code no longer valid for your current cart");
      }
    };
    revalidate();
  }, [cart]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoError("");
    setPromoMsg("");
    setPromoLoading(true);
    try {
      const res = await customerApi.post("/customer/orders/validate-promo", {
        code: promoInput.trim(),
        items: cart.map((i) => ({ id: i.id, price: i.price, qty: i.qty, category_id: i.categoryId })),
      });
      setPromoCode(promoInput.trim().toUpperCase());
      setPromoDiscount(res.data.discount_amount || 0);
      setPromoMsg(`🏷️ ${res.data.description || res.data.code} — £${res.data.discount_amount.toFixed(2)} off applied!`);
    } catch (err) {
      setPromoError(err?.response?.data?.message || "Invalid promo code");
      setPromoCode("");
      setPromoDiscount(0);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode("");
    setPromoInput("");
    setPromoDiscount(0);
    setPromoMsg("");
    setPromoError("");
  };

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
        customer_notes: notes.trim() || null,
        promo_code: promoCode || null,
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
              <div className="cc-date-display">
                📅 {formatDate(selectedDate)}
              </div>
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
              {pickupTime && (
                <div className="cc-selection-summary">
                  ✅ Selected: <strong>{formatDate(selectedDate)}</strong> at <strong>{pickupTime}</strong>
                </div>
              )}
            </div>
          )}

          {/* Payment method */}
          <div className="c-card">
            <h3 className="cc-section-title">Payment</h3>
            <div className="cc-type-btns">
              {[
                // { value: "Pay on Collection", label: "🏪 Pay on Collection" },
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

          {/* Special requests / notes */}
          <div className="c-card">
            <h3 className="cc-section-title">Special Requests</h3>
            <textarea
              className="cc-notes"
              placeholder="e.g. No onions, less spicy, extra sauce…"
              maxLength={500}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="cc-notes-count">{notes.length}/500</div>
          </div>

          {/* Promo Code */}
          <div className="c-card">
            <h3 className="cc-section-title">Promo Code</h3>
            {promoCode ? (
              <div className="cc-promo-applied">
                <span>🏷️ <strong>{promoCode}</strong> — -£{promoDiscount.toFixed(2)} off</span>
                <button className="cc-promo-remove" onClick={handleRemovePromo}>✕ Remove</button>
              </div>
            ) : (
              <div className="cc-promo-row">
                <input
                  className="cc-promo-input"
                  placeholder="Enter promo code"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                />
                <button
                  className="cc-promo-btn"
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoInput.trim()}
                >
                  {promoLoading ? "…" : "Apply"}
                </button>
              </div>
            )}
            {promoMsg && <div className="cc-promo-msg">{promoMsg}</div>}
            {promoError && <div className="cc-promo-error">{promoError}</div>}
          </div>

          {/* Summary + Place Order */}
          <div className="c-card cc-summary">
            {error && <div className="c-error">{error}</div>}
            <div className="cc-summary-row">
              <span>Subtotal</span>
              <span>£{total.toFixed(2)}</span>
            </div>
            {promoCode && (
              <div className="cc-summary-row" style={{ color: "#16a34a", fontWeight: 700 }}>
                <span>🏷️ {promoCode}</span>
                <span>-£{promoDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="cc-summary-row total">
              <span>Total</span>
              <span>£{Math.max(0, total - promoDiscount).toFixed(2)}</span>
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
              {loading ? "Placing Order…" : `Place Order · £${Math.max(0, total - promoDiscount).toFixed(2)}`}
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
