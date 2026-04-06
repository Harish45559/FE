import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import "./PreviousOrders.css";
import usePagination from "../hooks/usePagination";

/* ── Receipt Portal ── */
const ReceiptPortal = ({ children }) => {
  const [el] = useState(() => {
    const d = document.createElement("div");
    d.className = "receipt-modal";
    return d;
  });
  useEffect(() => {
    document.body.appendChild(el);
    return () => {
      try {
        document.body.removeChild(el);
      } catch (e) {
        console.error(e);
      }
    };
  }, [el]);
  return ReactDOM.createPortal(children, el);
};

const PreviousOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await api.get("/orders/all");
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.orders ?? []);
        const norm = list.map((o) => ({
          id: o.id ?? o._id ?? o.order_number,
          order_number: o.order_number ?? o.orderNo ?? o.orderId ?? "—",
          customer_name: o.customer_name ?? o.customer ?? "N/A",
          server_name: o.server_name ?? o.server ?? "",
          items: Array.isArray(o.items) ? o.items : [],
          payment_method: o.payment_method ?? o.payment ?? "Cash",
          discount_percent: Number(
            o.discount_percent ?? o.discountPercent ?? 0,
          ),
          discount_amount: Number(o.discount_amount ?? o.discountAmount ?? 0),
          total_amount: Number(o.total_amount ?? o.subtotal ?? 0),
          final_amount: Number(o.final_amount ?? o.grand_total ?? o.total ?? 0),
          date: o.date ?? o.created_at ?? o.createdAt ?? "",
          order_type: o.order_type ?? o.orderType ?? o.type ?? "",
        }));
        norm.sort((a, b) => {
          const ta = a.date ? new Date(a.date).getTime() : 0;
          const tb = b.date ? new Date(b.date).getTime() : 0;
          if (tb !== ta) return tb - ta;
          return String(b.order_number).localeCompare(String(a.order_number));
        });
        setOrders(norm);
      } catch (e) {
        console.error("Failed to load orders", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesSearch =
        !needle ||
        String(o.order_number).toLowerCase().includes(needle) ||
        String(o.customer_name).toLowerCase().includes(needle) ||
        String(o.payment_method).toLowerCase().includes(needle);

      let matchesDate = true;
      if (date && o.date) {
        const raw = String(o.date);
        // Handle "DD/MM/YYYY HH:mm:ss" or "DD/MM/YYYY" format
        if (raw.includes("/")) {
          const parts = raw.split(" ")[0].split("/"); // ["04","04","2026"]
          if (parts.length === 3) {
            const normalised = `${parts[2]}-${parts[1]}-${parts[0]}`; // "2026-04-04"
            matchesDate = normalised === date;
          }
        } else {
          // ISO format "2026-04-04T..." or "2026-04-04 ..."
          matchesDate = raw.slice(0, 10) === date;
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [orders, search, date]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    pageRows: pageData,
  } = usePagination(filtered);

  const calcSubtotal = (ord) =>
    (ord?.items ?? []).reduce(
      (s, it) => s + Number(it.total ?? (it.price ?? 0) * (it.qty ?? 0)),
      0,
    );

  const calcIncluded = (amount, percent) =>
    (Number(amount) * percent) / (100 + percent);

  const openReceipt = (ord) => {
    setActiveOrder(ord);
    setShowReceipt(true);
    window.onafterprint = () => {
      window.onafterprint = null;
      setShowReceipt(false);
      setActiveOrder(null);
    };
    setTimeout(() => window.print(), 200);
  };

  const handlePrint = () => {
    window.onafterprint = () => {
      window.onafterprint = null;
      setShowReceipt(false);
      setActiveOrder(null);
    };
    window.print();
  };

  /* Pagination pages array */
  const pages = [];
  for (let i = 1; i <= pageCount; i++) pages.push(i);
  const visiblePages = pages.filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  return (
    <DashboardLayout>
      <div className="previous-orders">
        {/* ── Header ── */}
        <div className="po-header">
          <span className="po-title">Previous Orders</span>
          <span className="po-badge">{filtered.length} orders</span>
        </div>

        {/* ── Controls ── */}
        <div className="po-controls">
          <input
            className="po-search"
            type="text"
            placeholder="Search by customer, order no. or payment…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <input
            className="po-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
          />
          <button
            className="po-clear"
            onClick={() => {
              setSearch("");
              setDate("");
              setPage(1);
            }}
          >
            ✕ Clear
          </button>
        </div>

        {/* ── Table card ── */}
        <div className="po-card">
          <div className="po-table-wrap">
            <table className="po-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Print</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="po-empty">
                      Loading orders…
                    </td>
                  </tr>
                ) : pageData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="po-empty">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  pageData.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <div className="po-order-num">#{o.order_number}</div>
                        <div className="po-order-sub">
                          {o.date ? String(o.date) : "—"}
                        </div>
                      </td>
                      <td>
                        <div className="po-cust-name">{o.customer_name}</div>
                        <div className="po-cust-type">
                          {o.order_type || "—"}
                        </div>
                      </td>
                      <td>
                        <span className="po-items-pill">
                          {o.items?.length ?? 0} items
                        </span>
                      </td>
                      <td>
                        <span
                          className={`po-pay ${o.payment_method?.toLowerCase() === "card" ? "card" : "cash"}`}
                        >
                          {o.payment_method?.toLowerCase() === "card"
                            ? "💳"
                            : "💵"}{" "}
                          {o.payment_method}
                        </span>
                      </td>
                      <td>
                        <span className="po-amount">
                          £{(o.final_amount || calcSubtotal(o)).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="po-print-btn"
                          title="View / Print Receipt"
                          onClick={() => openReceipt(o)}
                        >
                          🧾
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Footer pagination ── */}
          <div className="po-footer">
            <span className="po-foot-info">
              Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, filtered.length)} of {filtered.length}{" "}
              orders
            </span>
            <div className="po-foot-right">
              <select
                className="po-page-size"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              <div className="po-pages">
                <button
                  className="po-pg"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹
                </button>
                {visiblePages.map((p, i, arr) => (
                  <React.Fragment key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && (
                      <span
                        style={{
                          padding: "0 4px",
                          color: "#ccc",
                          lineHeight: "32px",
                        }}
                      >
                        …
                      </span>
                    )}
                    <button
                      className={`po-pg${page === p ? " active" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
                <button
                  className="po-pg"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page === pageCount || pageCount === 0}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Receipt Portal ── */}
      {showReceipt && activeOrder && (
        <ReceiptPortal>
          <div className="bill-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <button className="print-btn" onClick={handlePrint}>
                🖨️ Print
              </button>
              <button
                className="close-preview-btn"
                onClick={() => {
                  setShowReceipt(false);
                  setActiveOrder(null);
                }}
              >
                ✕ Close
              </button>
            </div>

            <div className="receipt-header">
              <h2>Mirchi Mafiya</h2>
              <p>Cumberland Street, LU1 3BW, Luton</p>
              <p>Phone: +447440086046</p>
              <p>dtsretaillimited@gmail.com</p>
              <p>
                <strong>Order Type:</strong> {activeOrder.order_type || "—"}
              </p>
              <p>
                <strong>Order No:</strong> #{activeOrder.order_number}
              </p>
              <p>
                <strong>Customer:</strong> {activeOrder.customer_name || "N/A"}
              </p>
              <p>
                <strong>Paid By:</strong> {activeOrder.payment_method}
              </p>
              <hr />
              <p>Date: {activeOrder.date || "—"}</p>
              <hr />
            </div>

            <table className="receipt-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: "right" }}>Price</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(activeOrder.items || []).map((it, idx) => {
                  const price = Number(it.price ?? 0);
                  const qty = Number(it.qty ?? 0);
                  const total = Number(it.total ?? price * qty);
                  return (
                    <tr key={idx}>
                      <td>{it.name}</td>
                      <td style={{ textAlign: "right" }}>
                        £{price.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "right" }}>{qty}</td>
                      <td style={{ textAlign: "right" }}>
                        £{total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {(() => {
              const subtotal =
                activeOrder.total_amount || calcSubtotal(activeOrder);
              const discountPct = Number(activeOrder.discount_percent || 0);
              const discountAmt =
                activeOrder.discount_amount ||
                (discountPct > 0 ? (subtotal * discountPct) / 100 : 0);
              const grand =
                activeOrder.final_amount || Math.max(0, subtotal - discountAmt);
              const vatIncluded = calcIncluded(grand, 20);
              const svcIncluded = calcIncluded(grand, 8);
              const totalQty = (activeOrder.items || []).reduce(
                (s, it) => s + Number(it.qty ?? 0),
                0,
              );
              return (
                <div className="receipt-summary">
                  <p>
                    <strong>Total Qty:</strong> {totalQty}
                  </p>
                  <p>
                    <strong>Sub Total:</strong> £ {subtotal.toFixed(2)}
                  </p>
                  {discountPct > 0 && (
                    <p>
                      <strong>Discount ({discountPct}%):</strong> -£
                      {discountAmt.toFixed(2)}
                    </p>
                  )}
                  <p className="grand-total">
                    <strong>Grand Total:</strong> £ {grand.toFixed(2)}
                  </p>
                  <p>VAT (20%): £{vatIncluded.toFixed(2)}</p>
                  <p>Service Charge (8%): £{svcIncluded.toFixed(2)}</p>
                  <p>
                    Staff:{" "}
                    {activeOrder.server_name
                      ? `(${activeOrder.server_name})`
                      : ""}
                  </p>
                  <hr />
                </div>
              );
            })()}
          </div>
        </ReceiptPortal>
      )}
    </DashboardLayout>
  );
};

export default PreviousOrders;
