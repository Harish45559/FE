import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import "./PreviousOrders.css";
import usePagination from "../hooks/usePagination";

const PreviousOrders = () => {
  const [orders, setOrders]               = useState([]);
  const [loading, setLoading]             = useState(false);
  const [search, setSearch]               = useState("");
  const [date, setDate]                   = useState("");
  const [sourceFilter, setSourceFilter]   = useState("all");
  const [payFilter, setPayFilter]         = useState("all");
  const [markingReady, setMarkingReady]   = useState(null);
  const [completing, setCompleting]       = useState(null);
  const [qrModal, setQrModal]             = useState(null);
  const [qrLoading, setQrLoading]         = useState(null);
  const [markPaidModal, setMarkPaidModal] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await api.get("/orders/all");
        const list = Array.isArray(res.data) ? res.data : (res.data?.orders ?? []);
        const norm = list.map((o) => ({
          id: o.id ?? o._id ?? o.order_number,
          order_number:     o.order_number ?? o.orderNo ?? o.orderId ?? "—",
          customer_name:    o.customer_name ?? o.customer ?? "N/A",
          customer_phone:   o.customer_phone ?? o.phone ?? null,
          server_name:      o.server_name ?? o.server ?? "",
          items:            Array.isArray(o.items) ? o.items : [],
          payment_method:   o.payment_method ?? o.payment ?? "Cash",
          discount_percent: Number(o.discount_percent ?? o.discountPercent ?? 0),
          discount_amount:  Number(o.discount_amount ?? o.discountAmount ?? 0),
          total_amount:     Number(o.total_amount ?? o.subtotal ?? 0),
          final_amount:     Number(o.final_amount ?? o.grand_total ?? o.total ?? 0),
          date:             o.date ?? o.created_at ?? o.createdAt ?? "",
          order_type:       o.order_type ?? o.orderType ?? o.type ?? "",
          source:           o.source ?? "pos",
          payment_status:   o.payment_status ?? null,
          pager_token:      o.pager_token ?? null,
          pager_status:     o.pager_status ?? null,
          ring_count:       o.ring_count ?? 0,
          customer_notes:   o.customer_notes ?? null,
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
        if (raw.includes("/")) {
          const parts = raw.split(" ")[0].split("/");
          if (parts.length === 3) {
            const normalised = `${parts[2]}-${parts[1]}-${parts[0]}`;
            matchesDate = normalised === date;
          }
        } else {
          matchesDate = raw.slice(0, 10) === date;
        }
      }

      const matchesSource =
        sourceFilter === "all" ||
        (sourceFilter === "online" && o.source === "online") ||
        (sourceFilter === "counter" && (o.source === "pos" || !o.source || o.source !== "online"));

      const matchesPay = payFilter === "all" || o.payment_method === payFilter;

      return matchesSearch && matchesDate && matchesSource && matchesPay;
    });
  }, [orders, search, date, sourceFilter, payFilter]);

  const { page, setPage, pageSize, setPageSize, pageCount, pageRows: pageData } = usePagination(filtered);

  const calcSubtotal = (ord) =>
    (ord?.items ?? []).reduce((s, it) =>
      s + Number(it.total ?? (it.price ?? 0) * (it.qty ?? it.quantity ?? 0)), 0);

  const calcIncluded = (amount, percent) => (Number(amount) * percent) / (100 + percent);

  const markPagerReady = async (order) => {
    if (!order.pager_token) return;
    setMarkingReady(order.id);
    try {
      const res = await api.put(`/pager/mark-ready/${order.pager_token}`);
      const newRingCount = res.data?.ringCount ?? (order.ring_count || 0) + 1;
      setOrders((prev) =>
        prev.map((o) => o.id === order.id ? { ...o, pager_status: "ready", ring_count: newRingCount } : o)
      );
    } catch (err) {
      console.error("Failed to mark pager ready", err);
    } finally {
      setMarkingReady(null);
    }
  };

  const completePagerOrder = async (order) => {
    if (!order.pager_token) return;
    setCompleting(order.id);
    try {
      await api.put(`/pager/complete/${order.pager_token}`);
      setOrders((prev) =>
        prev.map((o) => o.id === order.id ? { ...o, pager_status: "done" } : o)
      );
    } catch (err) {
      console.error("Failed to complete order", err);
    } finally {
      setCompleting(null);
    }
  };

  const handleMarkPaid = async (id, method) => {
    setMarkPaidModal(null);
    try {
      await api.patch(`/orders/online/${id}/mark-paid`, { payment_method: method });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, payment_status: "paid", payment_method: method } : o,
        ),
      );
    } catch (err) {
      console.error("Failed to mark as paid", err);
    }
  };

  const showQR = async (order) => {
    setQrLoading(order.id);
    try {
      const res = await api.post(`/pager/generate/${order.id}`);
      setQrModal(res.data);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, pager_token: res.data.token, pager_status: o.pager_status === "ready" ? "ready" : "waiting" }
            : o
        )
      );
    } catch (err) {
      console.error("Failed to load QR", err);
    } finally {
      setQrLoading(null);
    }
  };

  const buildReceiptHTML = (ord, qrCode) => {
    const subtotal = ord.total_amount || calcSubtotal(ord);
    const discPct  = Number(ord.discount_percent || 0);
    const discAmt  = ord.discount_amount || (discPct > 0 ? (subtotal * discPct) / 100 : 0);
    const grand    = ord.final_amount || Math.max(0, subtotal - discAmt);
    const vatIncl  = calcIncluded(grand, 20);
    const svcIncl  = calcIncluded(grand, 8);

    const itemRows = (ord.items || []).map((it) => {
      const qty   = Number(it.qty ?? it.quantity ?? 0);
      const price = Number(it.price ?? 0);
      const total = Number(it.total ?? price * qty);
      return `<div class="item-row"><span class="item-name">${qty}x ${it.name}</span><span class="item-price">£${total.toFixed(2)}</span></div>`;
    }).join("");

    return `
      <div class="bill-section">
        <div class="receipt-header">
          <h2>Mirchi Mafiya</h2>
          <p class="light">Cumberland Street, LU1 3BW, Luton</p>
          <p class="light">Phone: +447440086046</p>
          <p class="light">dtsretaillimited@gmail.com</p>
        </div>
        <hr/>
        <p class="bold-lg">ORDER #${ord.order_number}</p>
        <p class="bold">${ord.customer_name || "N/A"}</p>
        ${ord.customer_phone ? `<p class="bold">📞 ${ord.customer_phone}</p>` : ""}
        <p class="light">Type: ${ord.order_type || "—"}</p>
        <p class="bold" style="font-size:11px">Date: ${ord.date || "—"}</p>
        <hr/>
        <p class="items-label">Items</p>
        <div class="items-block">${itemRows}</div>
        <hr/>
        <div class="summary">
          <div class="sum-row light"><span>Sub Total</span><span>£${subtotal.toFixed(2)}</span></div>
          ${discPct > 0 ? `<div class="sum-row light"><span>Discount (${discPct}%)</span><span>-£${discAmt.toFixed(2)}</span></div>` : ""}
          <div class="sum-row light"><span>VAT (20%)</span><span>£${vatIncl.toFixed(2)}</span></div>
          <div class="sum-row light"><span>Service (8%)</span><span>£${svcIncl.toFixed(2)}</span></div>
          <hr/>
          <div class="sum-row grand"><span>TOTAL</span><span>£${grand.toFixed(2)}</span></div>
          <div class="sum-row bold" style="margin-top:3px"><span>Payment</span><span>${ord.payment_method}</span></div>
          <div class="sum-row light" style="margin-top:2px"><span>Staff</span><span>${ord.server_name || "—"}</span></div>
        </div>
        ${ord.customer_notes ? `<hr/><p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin:3px 0 1px">Special Requests:</p><p style="font-size:10px;font-style:italic;margin:0 0 3px">${ord.customer_notes}</p>` : ""}
        ${qrCode ? `
        <div style="text-align:center;margin-top:4mm;padding-top:3mm;border-top:1px dashed #bbb">
          <p style="font-size:10px;margin-bottom:2mm;font-weight:700">📱 Scan to track your order</p>
          <img src="${qrCode}" style="width:120px;height:120px;" />
          <p style="font-size:9px;margin-top:2mm">We'll notify you when it's ready!</p>
        </div>` : ""}
        <p style="text-align:center;margin-top:4mm;font-size:9px">Thank you for visiting Mirchi Mafiya!</p>
      </div>`;
  };

  const printReceiptWindow = (html) => {
    const styles = `<style>
      @page { size: 72mm auto; margin: 0; }
      html, body { margin: 0; padding: 0; width: 72mm; height: auto; overflow: visible; background: #fff; }
      body { font-family: 'Courier New', monospace; background: #fff; color: #000; }
      .bill-section { width: 72mm; max-width: 72mm; padding: 5mm 4mm; margin: 0 auto; font-size: 11px; line-height: 1.4; }
      .receipt-header { text-align: center; margin-bottom: 2mm; }
      .receipt-header h2 { font-size: 15px; margin: 0 0 1mm; font-weight: 900; letter-spacing: 1px; }
      .light { font-weight: 400; font-size: 10px; color: #222; margin: 0.5mm 0; }
      .bold { font-weight: 800; font-size: 12px; margin: 1mm 0; }
      .bold-lg { font-weight: 900; font-size: 14px; margin: 2mm 0 1mm; letter-spacing: .5px; }
      .items-label { font-size: 9px; font-weight: 700; color: #333; text-transform: uppercase; letter-spacing: .8px; margin: 1.5mm 0 1mm; }
      .items-block { display: flex; flex-direction: column; gap: 1mm; margin-bottom: 1mm; }
      .item-row { display: flex; justify-content: space-between; align-items: baseline; gap: 4px; }
      .item-name { font-size: 12px; font-weight: 900; flex: 1; }
      .item-price { font-size: 12px; font-weight: 900; white-space: nowrap; }
      .summary { margin-top: 1mm; }
      .sum-row { display: flex; justify-content: space-between; margin: 0.6mm 0; font-size: 11px; }
      .grand { font-size: 13px; font-weight: 900; padding-top: 1mm; margin-top: 1mm; }
      hr { border: 0; border-top: 1px dashed #555; margin: 2mm 0; }
    </style>`;
    const w = window.open("", "_blank", "width=420,height=700");
    if (!w) return;
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Receipt</title>${styles}</head><body>${html}</body></html>`);
    w.document.close();
    const imgs = w.document.getElementsByTagName("img");
    const doPrint = () => { try { w.focus(); w.print(); } finally { setTimeout(() => w.close(), 500); } };
    if (imgs.length === 0) { setTimeout(doPrint, 80); return; }
    let loaded = 0;
    const onLoad = () => { if (++loaded >= imgs.length) setTimeout(doPrint, 80); };
    Array.from(imgs).forEach((img) => { if (img.complete) onLoad(); else { img.onload = onLoad; img.onerror = onLoad; } });
  };

  const openReceipt = async (ord) => {
    let qr = null;
    if (ord.source !== "online") {
      try {
        const res = await api.post(`/pager/generate/${ord.id}`);
        qr = res.data.qrCode;
        setOrders((prev) =>
          prev.map((o) =>
            o.id === ord.id
              ? { ...o, pager_token: res.data.token, pager_status: o.pager_status === "ready" ? "ready" : "waiting" }
              : o
          )
        );
      } catch (_) {}
    }
    printReceiptWindow(buildReceiptHTML(ord, qr));
  };


  /* Pagination pages */
  const pages = [];
  for (let i = 1; i <= pageCount; i++) pages.push(i);
  const visiblePages = pages.filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1);

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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <input
            className="po-date"
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
          />
          <select
            className="po-filter-select"
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All sources</option>
            <option value="online">🌐 Online</option>
            <option value="counter">🖥️ Counter</option>
          </select>
          <select
            className="po-filter-select"
            value={payFilter}
            onChange={(e) => { setPayFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All payments</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Pay at Collection">Pay at Collection</option>
          </select>
          <button
            className="po-clear"
            onClick={() => { setSearch(""); setDate(""); setSourceFilter("all"); setPayFilter("all"); setPage(1); }}
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
                  <th>Source</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Pay Status</th>
                  <th>Total</th>
                  <th>Pager</th>
                  <th>Print</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="po-empty">Loading orders…</td></tr>
                ) : pageData.length === 0 ? (
                  <tr><td colSpan={9} className="po-empty">No orders found.</td></tr>
                ) : (
                  pageData.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <div className="po-order-num">#{o.order_number}</div>
                        <div className="po-order-sub">{o.date ? String(o.date) : "—"}</div>
                      </td>
                      <td>
                        <span className={`po-src-badge ${o.source === "online" ? "po-src-online" : "po-src-counter"}`}>
                          {o.source === "online" ? "🌐 Online" : "🖥️ Counter"}
                        </span>
                      </td>
                      <td>
                        <div className="po-cust-name">{o.customer_name}</div>
                        <div className="po-cust-type">{o.order_type || "—"}</div>
                      </td>
                      <td>
                        <span className="po-items-pill">{o.items?.length ?? 0} items</span>
                      </td>
                      <td>
                        <span className={`po-pay ${o.payment_method?.toLowerCase() === "card" ? "card" : "cash"}`}>
                          {o.payment_method?.toLowerCase() === "card" ? "💳" : "💵"}{" "}
                          {o.payment_method}
                        </span>
                      </td>
                      <td>
                        {o.payment_status === "paid"    && <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "0.78rem" }}>✅ Paid</span>}
                        {o.payment_status === "failed"  && <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "0.78rem" }}>❌ Failed</span>}
                        {o.payment_status === "pending" && o.payment_method === "Pay on Collection" && (
                          <button
                            onClick={() => setMarkPaidModal(o.id)}
                            style={{ background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa", borderRadius: 7, padding: "4px 10px", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}
                          >
                            💰 Mark Paid
                          </button>
                        )}
                        {o.payment_status === "pending" && o.payment_method !== "Pay on Collection" && <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: "0.78rem" }}>⏳ Pending</span>}
                        {!o.payment_status              && <span style={{ color: "#ccc", fontSize: "0.78rem" }}>—</span>}
                      </td>
                      <td>
                        <span className="po-amount">
                          £{(o.final_amount || calcSubtotal(o)).toFixed(2)}
                        </span>
                      </td>

                      {/* ── Pager cell — only for counter orders ── */}
                      <td>
                        {o.source === "online" ? (
                          <span style={{ fontSize: "0.72rem", color: "#ccc" }}>—</span>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 120 }}>
                            {/* Status pill */}
                            {!o.pager_status && (
                              <span style={{ fontSize: "0.72rem", color: "#bbb", fontStyle: "italic" }}>No pager</span>
                            )}
                            {o.pager_status === "waiting" && (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "3px 9px", borderRadius: 20, fontSize: "0.73rem", fontWeight: 700,
                                background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa",
                                width: "fit-content",
                              }}>
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f97316", display: "inline-block", animation: "pagerPulse 1.2s ease-in-out infinite" }} />
                                Waiting
                              </span>
                            )}
                            {o.pager_status === "ready" && (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "3px 9px", borderRadius: 20, fontSize: "0.73rem", fontWeight: 700,
                                background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0",
                                width: "fit-content",
                              }}>
                                🔔 Notified{o.ring_count > 1 ? ` ×${o.ring_count}` : ""}
                              </span>
                            )}
                            {o.pager_status === "done" && (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "3px 9px", borderRadius: 20, fontSize: "0.73rem", fontWeight: 700,
                                background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe",
                                width: "fit-content",
                              }}>
                                ✅ Delivered
                              </span>
                            )}

                            {/* Action buttons */}
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              <button
                                onClick={() => showQR(o)}
                                disabled={qrLoading === o.id}
                                title="Show / print pager QR"
                                style={{
                                  background: qrLoading === o.id ? "#e5e7eb" : "#ede9fe",
                                  color: qrLoading === o.id ? "#aaa" : "#7c3aed",
                                  border: "1px solid #ddd6fe", borderRadius: 7,
                                  padding: "4px 8px", fontWeight: 700, fontSize: "0.75rem",
                                  cursor: qrLoading === o.id ? "not-allowed" : "pointer",
                                }}
                              >
                                {qrLoading === o.id ? "…" : "📱 QR"}
                              </button>

                              {(o.pager_status === "waiting" || o.pager_status === "ready") && (
                                <button
                                  onClick={() => markPagerReady(o)}
                                  disabled={markingReady === o.id}
                                  style={{
                                    background: markingReady === o.id ? "#e5e7eb" : o.pager_status === "ready" ? "#dcfce7" : "#fff7ed",
                                    color: markingReady === o.id ? "#aaa" : o.pager_status === "ready" ? "#16a34a" : "#ea580c",
                                    border: `1px solid ${o.pager_status === "ready" ? "#bbf7d0" : "#fed7aa"}`,
                                    borderRadius: 7, padding: "4px 8px",
                                    fontWeight: 700, fontSize: "0.75rem",
                                    cursor: markingReady === o.id ? "not-allowed" : "pointer",
                                  }}
                                >
                                  {markingReady === o.id ? "…" : o.pager_status === "ready" ? "🔔 Again" : "🔔 Ring"}
                                </button>
                              )}

                              {(o.pager_status === "waiting" || o.pager_status === "ready") && (
                                <button
                                  onClick={() => completePagerOrder(o)}
                                  disabled={completing === o.id}
                                  style={{
                                    background: completing === o.id ? "#e5e7eb" : "#f0fdf4",
                                    color: completing === o.id ? "#aaa" : "#15803d",
                                    border: "1px solid #bbf7d0", borderRadius: 7,
                                    padding: "4px 8px", fontWeight: 700, fontSize: "0.75rem",
                                    cursor: completing === o.id ? "not-allowed" : "pointer",
                                  }}
                                >
                                  {completing === o.id ? "…" : "✓ Done"}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
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
              {Math.min(page * pageSize, filtered.length)} of {filtered.length} orders
            </span>
            <div className="po-foot-right">
              <select
                className="po-page-size"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
              <div className="po-pages">
                <button className="po-pg" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                {visiblePages.map((p, i, arr) => (
                  <React.Fragment key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && (
                      <span style={{ padding: "0 4px", color: "#ccc", lineHeight: "32px" }}>…</span>
                    )}
                    <button className={`po-pg${page === p ? " active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                  </React.Fragment>
                ))}
                <button className="po-pg" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount || pageCount === 0}>›</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── QR Modal ── */}
      {qrModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}
          onClick={() => setQrModal(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 20, padding: "32px 28px",
              maxWidth: 360, width: "90%", textAlign: "center",
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>📱</div>
            <h3 style={{ margin: "0 0 4px", color: "#1a1a1a", fontSize: "1.1rem" }}>
              Pager QR — Order #{qrModal.orderNumber}
            </h3>
            <p style={{ color: "#888", fontSize: "0.83rem", marginBottom: 14 }}>{qrModal.customerName}</p>
            <img
              src={qrModal.qrCode}
              alt="Pager QR"
              style={{ width: 210, height: 210, borderRadius: 10, border: "1px solid #eee" }}
            />
            <p style={{ fontSize: "0.72rem", color: "#bbb", marginTop: 8, wordBreak: "break-all" }}>
              {qrModal.pagerUrl}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                onClick={() => {
                  const w = window.open("", "_blank");
                  w.document.write(`<img src="${qrModal.qrCode}" style="width:280px;display:block;margin:20px auto"/><p style="text-align:center;font-family:sans-serif;color:#555">Order #${qrModal.orderNumber} · ${qrModal.customerName}</p>`);
                  w.print();
                }}
                style={{
                  flex: 1, padding: "10px 0", background: "#f3f4f6",
                  border: "none", borderRadius: 8, fontWeight: 600,
                  cursor: "pointer", fontSize: "0.88rem",
                }}
              >
                🖨️ Print
              </button>
              <button
                onClick={() => setQrModal(null)}
                style={{
                  flex: 1, padding: "10px 0", background: "#7c3aed", color: "#fff",
                  border: "none", borderRadius: 8, fontWeight: 700,
                  cursor: "pointer", fontSize: "0.88rem",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark as Paid modal ── */}
      {markPaidModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          onClick={() => setMarkPaidModal(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, padding: "28px 24px", width: 300, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>💰</div>
            <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>How did the customer pay?</h3>
            <p style={{ color: "#9ca3af", fontSize: "0.82rem", marginBottom: 20 }}>Select the payment method used at collection</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => handleMarkPaid(markPaidModal, "Cash")}
                style={{ flex: 1, padding: "12px 0", background: "#f0fdf4", color: "#16a34a", border: "1.5px solid #bbf7d0", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}
              >
                💵 Cash
              </button>
              <button
                onClick={() => handleMarkPaid(markPaidModal, "Card on Collection")}
                style={{ flex: 1, padding: "12px 0", background: "#eff6ff", color: "#2563eb", border: "1.5px solid #bfdbfe", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}
              >
                💳 Card
              </button>
            </div>
            <button
              onClick={() => setMarkPaidModal(null)}
              style={{ marginTop: 14, width: "100%", padding: "10px 0", background: "#f3f4f6", border: "none", borderRadius: 10, color: "#6b7280", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PreviousOrders;
