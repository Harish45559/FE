import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import "./PreviousOrders.css";

const PAGE_SIZES = [10, 20, 50];

const PreviousOrders = () => {
  // Table data
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  // Receipt modal
  const [showReceipt, setShowReceipt] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);

  // Fetch all orders once (client-side filter/paginate)
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await api.get("/orders/all");
        const list = Array.isArray(res.data) ? res.data : (res.data?.orders ?? []);
        const norm = list.map((o) => ({
          id: o.id ?? o._id ?? o.order_number,
          order_number: o.order_number ?? o.orderNo ?? o.orderId ?? "—",
          customer_name: o.customer_name ?? o.customer ?? "N/A",
          server_name: o.server_name ?? o.server ?? "",
          // Expect each item: {name, price, qty, total}
          items: Array.isArray(o.items) ? o.items : [],
          payment_method: o.payment_method ?? o.payment ?? "Cash",
          discount_percent: Number(o.discount_percent ?? o.discountPercent ?? 0),
          discount_amount: Number(o.discount_amount ?? o.discountAmount ?? 0),
          total_amount: Number(o.total_amount ?? o.subtotal ?? 0),
          final_amount: Number(o.final_amount ?? o.grand_total ?? o.total ?? 0),
          date: o.date ?? o.created_at ?? o.createdAt ?? "",
        }));
        setOrders(norm.reverse()); // most recent first
      } catch (e) {
        console.error("Failed to load orders", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Derived table after filters
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesSearch =
        !needle ||
        String(o.order_number).toLowerCase().includes(needle) ||
        String(o.customer_name).toLowerCase().includes(needle) ||
        String(o.payment_method).toLowerCase().includes(needle);
      const matchesDate =
        !date || (o.date && String(o.date).slice(0, 10) === date);
      return matchesSearch && matchesDate;
    });
  }, [orders, search, date]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Helpers for receipt math (no ?? mixed with ||)
  const calcSubtotal = (ord) =>
    (ord?.items ?? []).reduce(
      (s, it) => s + Number(it.total ?? ((it.price ?? 0) * (it.qty ?? 0))),
      0
    );

  const calcIncluded = (amount, percent) => (Number(amount) * percent) / (100 + percent);

  // Open/close receipt
  const openReceipt = (ord) => {
    setActiveOrder(ord);
    setShowReceipt(true);
  };
  const closeReceipt = () => {
    setShowReceipt(false);
    setActiveOrder(null);
  };

  // Print uses CSS @media print to show only .bill-section
  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="previous-orders">
        <div className="header">
          <h2>Previous Orders</h2>

          <div className="controls">
            <input
              className="search-box"
              type="text"
              placeholder="Search by customer, order no., or payment…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <input
              className="date-picker"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
            />
            <button
              className="clear-btn"
              onClick={() => {
                setSearch("");
                setDate("");
                setPage(1);
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date/Time</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Paid By</th>
                <th>Total (£)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>Loading…</td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={7}>No orders found.</td>
                </tr>
              ) : (
                pageData.map((o) => (
                  <tr key={o.id}>
                    <td>#{o.order_number}</td>
                    <td>{o.date ? String(o.date) : "—"}</td>
                    <td>{o.customer_name}</td>
                    <td>{o.items?.length ?? 0}</td>
                    <td>{o.payment_method}</td>
                    <td>{(o.final_amount || calcSubtotal(o)).toFixed(2)}</td>
                    <td>
                      <button
                        className="view-btn"
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

        <div className="pagination">
          <div>
            <label>
              Page size:&nbsp;
              <select
                className="page-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="pagination-center">
            <button onClick={() => setPage(1)} disabled={page === 1}>
              ⏮
            </button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              ◀
            </button>
            <span style={{ margin: "0 6px" }}>
              Page {page} / {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
            >
              ▶
            </button>
            <button onClick={() => setPage(pageCount)} disabled={page === pageCount}>
              ⏭
            </button>
          </div>

          <div />
        </div>
      </div>

      {/* ===== Receipt Modal (same layout vibe as Billing Counter) ===== */}
      {showReceipt && activeOrder && (
        <div className="receipt-modal" role="dialog" aria-modal="true">
          <div className="bill-section">
            {/* header actions (hidden on print) */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <button className="print-btn" onClick={handlePrint}>
                🖨️ Print
              </button>
              <button className="close-preview-btn" onClick={closeReceipt}>
                ✖
              </button>
            </div>

            {/* Receipt header (copy of Billing Counter info) */}
            <div className="receipt-header">
              <h2>Mirchi Mafiya</h2>
              <p>Cumberland Street, LU1 3BW, Luton</p>
              <p>Phone: +447440086046</p>
              <p>dtsretaillimited@gmail.com</p>
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

            {/* Items */}
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
                  const total = Number(it.total ?? (price * qty));
                  return (
                    <tr key={idx}>
                      <td>{it.name}</td>
                      <td style={{ textAlign: "right" }}>£{price.toFixed(2)}</td>
                      <td style={{ textAlign: "right" }}>{qty}</td>
                      <td style={{ textAlign: "right" }}>£{total.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Summary */}
            {(() => {
              const subtotal = activeOrder.total_amount || calcSubtotal(activeOrder);
              const discountPct = Number(activeOrder.discount_percent || 0);
              const discountAmt =
                activeOrder.discount_amount ||
                (discountPct > 0 ? (subtotal * discountPct) / 100 : 0);
              const grand = activeOrder.final_amount || Math.max(0, subtotal - discountAmt);

              // Example “includes” if VAT/Service are included in prices (5% each)
              const vatIncluded = calcIncluded(grand, 5);
              const svcIncluded = calcIncluded(grand, 5);

              const totalQty = (activeOrder.items || []).reduce((s, it) => s + Number(it.qty ?? 0), 0);

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
                      <strong>Discount ({discountPct}%):</strong> -£{discountAmt.toFixed(2)}
                    </p>
                  )}
                  <p className="grand-total">
                    <strong>Grand Total:</strong> £ {grand.toFixed(2)}
                  </p>

                  <p className="includes-label">Includes:</p>
                  <p>VAT (5%): £{vatIncluded.toFixed(2)}</p>
                  <p>Service Charge (5%): £{svcIncluded.toFixed(2)}</p>
                  <p className="server-name">
                    Staff: {activeOrder.server_name ? `(${activeOrder.server_name})` : ""}
                  </p>
                  <hr />
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PreviousOrders;
