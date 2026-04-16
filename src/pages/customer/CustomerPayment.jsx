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

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ── Inner form (must be inside <Elements>) ──────────────────────────────────
const PaymentForm = ({ order, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentRequest, setPaymentRequest] = useState(null);

  // Set up Apple Pay / Google Pay payment request
  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: "GB",
      currency: "gbp",
      total: {
        label: `Order #${order.order_number}`,
        amount: Math.round(parseFloat(order.final_amount) * 100),
      },
      requestPayerName: true,
      requestPayerEmail: false,
    });

    // Check if Apple Pay / Google Pay is available on this device/browser
    pr.canMakePayment().then((result) => {
      if (result) setPaymentRequest(pr);
    });

    // Handle payment via Apple Pay / Google Pay
    pr.on("paymentmethod", async (ev) => {
      const { error: confirmError, paymentIntent } =
        await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

      if (confirmError) {
        ev.complete("fail");
        setError(confirmError.message);
        return;
      }

      ev.complete("success");

      if (paymentIntent.status === "requires_action") {
        const { error: actionError } = await stripe.confirmCardPayment(clientSecret);
        if (actionError) {
          setError(actionError.message);
          return;
        }
      }

      navigate("/customer/order-confirmation", {
        state: { order: { ...order, payment_status: "paid" } },
      });
    });
  }, [stripe, clientSecret, order, navigate]);

  // Handle card form submission
  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setError("");
    setLoading(true);

    const { error: stripeError, paymentIntent } =
      await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

    if (stripeError) {
      setError(stripeError.message);
      setLoading(false);
      return;
    }

    if (paymentIntent.status === "succeeded") {
      navigate("/customer/order-confirmation", {
        state: { order: { ...order, payment_status: "paid" } },
      });
    }
  };

  return (
    <div className="cp-form">
      <div className="cp-amount">
        <span>Amount to pay</span>
        <span className="cp-price">£{parseFloat(order.final_amount).toFixed(2)}</span>
      </div>

      {/* Apple Pay / Google Pay button — only shown if device supports it */}
      {paymentRequest && (
        <>
          <PaymentRequestButtonElement
            options={{
              paymentRequest,
              style: {
                paymentRequestButton: {
                  type: "buy",
                  theme: "dark",
                  height: "52px",
                },
              },
            }}
          />
          <div className="cp-divider">
            <span>or pay by card</span>
          </div>
        </>
      )}

      {/* Card form */}
      <form onSubmit={handlePay}>
        <div className="cp-card-wrapper">
          <label className="cp-label">Card Details</label>
          <div className="cp-card-element">
            <CardElement
              options={{
                style: {
                  base: {
                    color: "#e8e8e8",
                    fontFamily: "inherit",
                    fontSize: "16px",
                    "::placeholder": { color: "#888" },
                  },
                  invalid: { color: "#ff6b6b" },
                },
              }}
            />
          </div>
        </div>

        {error && <div className="cp-error">{error}</div>}

        <button
          type="submit"
          className="c-btn c-btn-primary cp-pay-btn"
          disabled={!stripe || loading}
        >
          {loading ? "Processing…" : `Pay £${parseFloat(order.final_amount).toFixed(2)}`}
        </button>
      </form>

      <p className="cp-secure">🔒 Secured by Stripe</p>
    </div>
  );
};

// ── Outer page — fetches clientSecret, then renders form ────────────────────
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
      .catch((err) =>
        setFetchError(
          err?.response?.data?.message || "Failed to initialise payment"
        )
      );
  }, [order?.id]);

  if (!order) {
    return (
      <CustomerLayout>
        <div style={{ padding: "40px", textAlign: "center" }}>
          <p style={{ color: "#aaa" }}>No order found.</p>
          <button
            className="c-btn c-btn-primary"
            onClick={() => navigate("/customer/menu")}
          >
            Back to Menu
          </button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="cp-wrapper">
        <h1 className="c-page-title">Pay for Order</h1>

        <div className="c-card cp-card">
          <div className="cp-order-info">
            <span className="cp-order-num">Order #{order.order_number}</span>
            {order.pickup_time && (
              <span className="cp-pickup">Pickup: {order.pickup_time}</span>
            )}
          </div>

          <div className="cp-items">
            {(order.items || []).map((item, i) => (
              <div key={i} className="cp-item-row">
                <span>{item.name} × {item.qty}</span>
                <span>£{(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {fetchError && <div className="cp-error">{fetchError}</div>}

          {clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm order={order} clientSecret={clientSecret} />
            </Elements>
          ) : !fetchError ? (
            <p className="cp-loading">Loading payment form…</p>
          ) : null}
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerPayment;
