import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import customerApi from "../../services/customerApi";
import CustomerLayout from "../../components/CustomerLayout";
import "./CustomerPayment.css";

// NOTE: do NOT pass clientSecret to Elements — that breaks CardElement input
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ── Inner form ───────────────────────────────────────────────────────────────
const PaymentForm = ({ order, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentRequest, setPaymentRequest] = useState(null);

  const amount = parseFloat(order.final_amount);

  const onSuccess = () =>
    navigate("/customer/order-confirmation", {
      state: { order: { ...order, payment_status: "paid" } },
    });

  // Apple Pay / Google Pay
  useEffect(() => {
    if (!stripe) return;
    const pr = stripe.paymentRequest({
      country: "GB",
      currency: "gbp",
      total: { label: `Order #${order.order_number}`, amount: Math.round(amount * 100) },
      requestPayerName: true,
    });
    pr.canMakePayment().then((r) => { if (r) setPaymentRequest(pr); });
    pr.on("paymentmethod", async (ev) => {
      const { error: err, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret, { payment_method: ev.paymentMethod.id }, { handleActions: false }
      );
      if (err) { ev.complete("fail"); setError(err.message); return; }
      ev.complete("success");
      if (paymentIntent.status === "requires_action") {
        const { error: e2 } = await stripe.confirmCardPayment(clientSecret);
        if (e2) { setError(e2.message); return; }
      }
      await customerApi.patch(`/customer/orders/${order.id}/confirm-payment`, {
        paymentIntentId: paymentIntent.id,
      }).catch(() => {});
      onSuccess();
    });
  }, [stripe, clientSecret]);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError("");
    setLoading(true);
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });
    if (stripeError) { setError(stripeError.message); setLoading(false); return; }
    if (paymentIntent.status === "succeeded") {
      // Confirm payment in our DB directly (don't rely solely on webhook)
      await customerApi.patch(`/customer/orders/${order.id}/confirm-payment`, {
        paymentIntentId: paymentIntent.id,
      }).catch(() => {}); // webhook is fallback if this fails
      onSuccess();
    }
  };

  return (
    <form onSubmit={handlePay} className="cpf-form">
      {/* Apple Pay / Google Pay */}
      {paymentRequest && (
        <>
          <PaymentRequestButtonElement
            options={{
              paymentRequest,
              style: { paymentRequestButton: { type: "buy", theme: "dark", height: "48px" } },
            }}
          />
          <div className="cpf-divider"><span>or pay by card</span></div>
        </>
      )}

      {/* Card input */}
      <div className="cpf-field">
        <label className="cpf-label">Card details</label>
        <div className="cpf-stripe-box">
          <CardElement
            options={{
              hidePostalCode: true,
              style: {
                base: {
                  color: "#1a1a1a",
                  fontSize: "15px",
                  fontFamily: "system-ui, sans-serif",
                  lineHeight: "24px",
                  "::placeholder": { color: "#9ca3af" },
                  iconColor: "#FF6A00",
                },
                invalid: { color: "#dc2626", iconColor: "#dc2626" },
              },
            }}
          />
        </div>
      </div>

      {error && <div className="cpf-error">{error}</div>}

      <button type="submit" className="cpf-pay-btn" disabled={!stripe || loading}>
        {loading ? "Processing…" : `Pay £${amount.toFixed(2)}`}
      </button>

      <p className="cpf-secure">🔒 Payments secured by Stripe</p>
    </form>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────
const CustomerPayment = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const order = state?.order;
  const [clientSecret, setClientSecret] = useState("");
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (!order?.id) return;
    customerApi
      .post(`/customer/orders/${order.id}/pay`)
      .then((res) => setClientSecret(res.data.clientSecret))
      .catch((err) => setFetchError(err?.response?.data?.message || "Failed to initialise payment"));
  }, [order?.id]);

  if (!order) {
    return (
      <CustomerLayout>
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ color: "#aaa" }}>No order found.</p>
          <button className="c-btn c-btn-primary" onClick={() => navigate("/customer/menu")}>
            Back to Menu
          </button>
        </div>
      </CustomerLayout>
    );
  }

  const amount = parseFloat(order.final_amount);

  return (
    <CustomerLayout>
      <div className="cp-grid">

        {/* ── Left: Payment form ── */}
        <div>
          <div className="cp-panel">
            <h3 className="cp-panel-title">Payment details</h3>
            {fetchError && <div className="cpf-error">{fetchError}</div>}
            {clientSecret ? (
              // Pass ONLY stripePromise to Elements — do NOT pass clientSecret here
              <Elements stripe={stripePromise}>
                <PaymentForm order={order} clientSecret={clientSecret} />
              </Elements>
            ) : !fetchError ? (
              <div className="cp-loading">
                <div className="cp-spinner" />
                <p>Loading payment…</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Right: Order summary ── */}
        <aside>
          <div className="cp-panel">
            <h3 className="cp-panel-title">Order summary</h3>

            <div className="cp-summary-items">
              {(order.items || []).map((item, i) => (
                <div key={i} className="cp-summary-row">
                  <span className="cp-item-name">
                    {item.name}
                    <span className="cp-item-qty"> ×{item.qty}</span>
                  </span>
                  <span className="cp-item-price">
                    £{(item.price * item.qty).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {order.pickup_time && (
              <div className="cp-pickup">
                <span>⏱ Pickup time</span>
                <span>{order.pickup_time}</span>
              </div>
            )}

            <div className="cp-total">
              <span>Total</span>
              <span className="cp-total-amount">£{amount.toFixed(2)}</span>
            </div>

            <div className="cp-order-ref">
              Order #{order.order_number}
            </div>
          </div>
        </aside>

      </div>
    </CustomerLayout>
  );
};

export default CustomerPayment;
