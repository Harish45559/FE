import React, { useEffect, useMemo, useState, useRef } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { DateTime } from "luxon";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import "./EndOfDaySales.css";

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

const PAGE_SIZE = 10;
const PAGE_SIZES = [10, 20, 50];

const fmt = (n) => "£" + Number(n || 0).toFixed(2);
const fmtDate = (iso) => {
  if (!iso) return "—";
  return DateTime.fromISO(iso).toFormat("dd/MM/yyyy HH:mm");
};

const EndOfDaySales = () => {
  const [tab, setTab] = useState("summary");
  const [summary, setSummary] = useState({
    totalSales: 0,
    cashSales: 0,
    cardSales: 0,
  });
  const [topItems, setTopItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterMode, setFilterMode] = useState("today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [chartType, setChartType] = useState("bar");

  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(PAGE_SIZE);

  const activeRange = useMemo(() => {
    const today = DateTime.now().toISODate();
    if (filterMode === "today") return { from: today, to: today };
    if (filterMode === "weekly")
      return {
        from: DateTime.now().minus({ days: 6 }).toISODate(),
        to: today,
      };
    if (filterMode === "monthly")
      return {
        from: DateTime.now().startOf("month").toISODate(),
        to: today,
      };
    if (filterMode === "custom" && fromDate && toDate)
      return { from: fromDate, to: toDate };
    return { from: today, to: today };
  }, [filterMode, fromDate, toDate]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { fromDate: activeRange.from, toDate: activeRange.to };
        const [s, t, o] = await Promise.all([
          api.get("/sales/summary", { params }),
          api.get("/sales/topselling", { params }),
          api.get("/sales/totalsales", { params }),
        ]);
        setSummary({
          totalSales: Number(s.data?.totalSales ?? 0),
          cashSales: Number(s.data?.cashSales ?? 0),
          cardSales: Number(s.data?.cardSales ?? 0),
        });
        setTopItems(Array.isArray(t.data) ? t.data : []);
        setOrders(Array.isArray(o.data) ? o.data : []);
      } catch (e) {
        console.error("Failed to fetch sales data:", e);
        setSummary({ totalSales: 0, cashSales: 0, cardSales: 0 });
        setTopItems([]);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeRange]);

  useEffect(() => {
    setOrdersPage(1);
  }, [paymentFilter, activeRange, ordersPageSize]);

  const headerDateLabel = useMemo(() => {
    const { from, to } = activeRange;
    return from === to
      ? DateTime.fromISO(from).toFormat("dd LLL yyyy")
      : `${DateTime.fromISO(from).toFormat("dd LLL yyyy")} – ${DateTime.fromISO(to).toFormat("dd LLL yyyy")}`;
  }, [activeRange]);

  const avgOrder = orders.length > 0 ? summary.totalSales / orders.length : 0;
  const cashPct =
    summary.totalSales > 0
      ? Math.round((summary.cashSales / summary.totalSales) * 100)
      : 0;
  const cardPct =
    summary.totalSales > 0
      ? Math.round((summary.cardSales / summary.totalSales) * 100)
      : 0;
  const topItem = topItems[0] || null;

  const filteredOrders = useMemo(() => {
    if (paymentFilter === "all") return orders;
    return orders.filter((o) => o.payment_method === paymentFilter);
  }, [orders, paymentFilter]);

  const ordersPageCount = Math.max(
    1,
    Math.ceil(filteredOrders.length / ordersPageSize),
  );
  const ordersPageRows = useMemo(() => {
    const start = (ordersPage - 1) * ordersPageSize;
    return filteredOrders.slice(start, start + ordersPageSize);
  }, [filteredOrders, ordersPage, ordersPageSize]);

  const dailySeries = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      const iso = o.created_at || o.date || o.createdAt;
      if (!iso) continue;
      const day = DateTime.fromISO(iso).toISODate();
      const amt = Number(o.final_amount ?? o.total_amount ?? 0);
      map.set(day, (map.get(day) || 0) + (isNaN(amt) ? 0 : amt));
    }
    const entries = [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
    if (!entries.length) {
      return { labels: [headerDateLabel], data: [0] };
    }
    return {
      labels: entries.map(([d]) => DateTime.fromISO(d).toFormat("dd LLL")),
      data: entries.map(([, v]) => Number(v.toFixed(2))),
    };
  }, [orders, headerDateLabel]);

  const applyCustom = () => {
    if (!fromDate || !toDate) return;
    setFilterMode("custom");
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setPaymentFilter("all");
    setFilterMode("today");
    setTab("summary");
    setOrdersPage(1);
  };

  const pieData = {
    labels: ["Cash", "Card"],
    datasets: [
      {
        data: [summary.cashSales || 0, summary.cardSales || 0],
        backgroundColor: ["#378ADD", "#1D9E75"],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const dailyData = {
    labels: dailySeries.labels,
    datasets: [
      {
        label: "Daily Sales (£)",
        data: dailySeries.data,
        backgroundColor: "rgba(55,138,221,0.15)",
        borderColor: "#378ADD",
        borderWidth: 2,
        pointBackgroundColor: "#378ADD",
        tension: 0.35,
        fill: chartType === "line",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => `£${Number(ctx.parsed.y).toFixed(2)}` },
      },
    },
    scales: {
      y: {
        ticks: { callback: (v) => `£${v}` },
        grid: { color: "rgba(128,128,128,0.08)" },
      },
      x: {
        grid: { display: false },
        ticks: { autoSkip: false, maxRotation: 0 },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => `${ctx.label}: ${fmt(ctx.parsed)}` },
      },
    },
  };

  const maxQty = topItems[0]?.quantity || 1;

  return (
    <DashboardLayout>
      <div className="eod-container">
        {/* ── Header ── */}
        <div className="eod-header">
          <div>
            <h1 className="eod-title">End of day sales</h1>
            <p className="eod-subtitle">{headerDateLabel}</p>
          </div>
          {loading && <div className="eod-loading">Loading…</div>}
        </div>

        {/* ── Filters ── */}
        <div className="eod-filter-row">
          <div className="eod-chips">
            {[
              { key: "today", label: "Today" },
              { key: "weekly", label: "Last 7 days" },
              { key: "monthly", label: "This month" },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`eod-chip${filterMode === key ? " active" : ""}`}
                onClick={() => setFilterMode(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="eod-custom-range">
            <input
              type="date"
              className="eod-date-inp"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <span className="eod-sep">to</span>
            <input
              type="date"
              className="eod-date-inp"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
            <button className="eod-apply-btn" onClick={applyCustom}>
              Apply
            </button>
            <button className="eod-apply-btn" onClick={resetFilters}>
              Reset
            </button>
          </div>
        </div>

        {/* ── Metric Cards ── */}
        <div className="eod-metrics">
          <div className="eod-metric-card">
            <div className="eod-metric-label">Total sales</div>
            <div className="eod-metric-value">{fmt(summary.totalSales)}</div>
            <div className="eod-metric-sub">
              {orders.length} orders · avg {fmt(avgOrder)}
            </div>
          </div>
          <div className="eod-metric-card">
            <div className="eod-metric-label">Cash sales</div>
            <div className="eod-metric-value">{fmt(summary.cashSales)}</div>
            <div className="eod-metric-sub">{cashPct}% of total</div>
            <span className="eod-badge eod-badge-green">Cash</span>
          </div>
          <div className="eod-metric-card">
            <div className="eod-metric-label">Card sales</div>
            <div className="eod-metric-value">{fmt(summary.cardSales)}</div>
            <div className="eod-metric-sub">{cardPct}% of total</div>
            <span className="eod-badge eod-badge-blue">Card</span>
          </div>
          <div className="eod-metric-card">
            <div className="eod-metric-label">Best seller</div>
            <div className="eod-metric-value eod-metric-value--sm">
              {topItem ? topItem.name : "—"}
            </div>
            <div className="eod-metric-sub">
              {topItem ? `${topItem.quantity} sold` : "No data"}
            </div>
            <span className="eod-badge eod-badge-amber">Top item</span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="eod-tab-bar">
          {[
            { key: "summary", label: "Summary" },
            { key: "top", label: "Top items" },
            { key: "graphs", label: "Graphs" },
            { key: "orders", label: "Orders" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`eod-tab${tab === key ? " active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Summary Tab ── */}
        {tab === "summary" && (
          <div className="eod-charts-grid">
            <div className="eod-chart-card">
              <div className="eod-chart-title">Sales breakdown</div>
              {[
                { label: "Total revenue", value: fmt(summary.totalSales) },
                { label: "Cash payments", value: fmt(summary.cashSales) },
                { label: "Card payments", value: fmt(summary.cardSales) },
                { label: "Total orders", value: orders.length },
                { label: "Average order value", value: fmt(avgOrder) },
              ].map(({ label, value }) => (
                <div key={label} className="eod-stat-row">
                  <span className="eod-stat-label">{label}</span>
                  <span className="eod-stat-value">{value}</span>
                </div>
              ))}
            </div>

            <div className="eod-chart-card">
              <div className="eod-chart-title">Cash vs card split</div>
              <div className="eod-legend">
                <span className="eod-legend-item">
                  <span
                    className="eod-legend-dot"
                    style={{ background: "#378ADD" }}
                  />
                  Cash
                </span>
                <span className="eod-legend-item">
                  <span
                    className="eod-legend-dot"
                    style={{ background: "#1D9E75" }}
                  />
                  Card
                </span>
              </div>
              <div style={{ position: "relative", width: "100%", height: 200 }}>
                <Pie data={pieData} options={pieOptions} />
              </div>
            </div>
          </div>
        )}

        {/* ── Top Items Tab ── */}
        {tab === "top" && (
          <div className="eod-chart-card">
            <div className="eod-chart-title">Top selling items</div>
            {topItems.length === 0 ? (
              <div className="eod-empty">No items for this range</div>
            ) : (
              <table className="eod-top-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Qty sold</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((it, i) => {
                    const pct = Math.round((it.quantity / maxQty) * 100);
                    return (
                      <tr key={it.name + i}>
                        <td>
                          <span
                            className={`eod-rank eod-rank-${Math.min(i + 1, 4)}`}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="eod-item-name">{it.name}</td>
                        <td>{it.quantity ?? 0}</td>
                        <td>
                          <div className="eod-bar-row">
                            <div
                              className="eod-bar-fill"
                              style={{ width: `${pct}%` }}
                            />
                            <span className="eod-bar-pct">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Graphs Tab ── */}
        {tab === "graphs" && (
          <div className="eod-chart-card">
            <div className="eod-chart-header">
              <div className="eod-chart-title" style={{ margin: 0 }}>
                Daily sales
              </div>
              <div className="eod-chart-toggle">
                <button
                  className={`eod-ctab${chartType === "bar" ? " active" : ""}`}
                  onClick={() => setChartType("bar")}
                >
                  Bar
                </button>
                <button
                  className={`eod-ctab${chartType === "line" ? " active" : ""}`}
                  onClick={() => setChartType("line")}
                >
                  Line
                </button>
              </div>
            </div>
            <div style={{ position: "relative", width: "100%", height: 300 }}>
              {chartType === "bar" ? (
                <Bar data={dailyData} options={chartOptions} />
              ) : (
                <Line data={dailyData} options={chartOptions} />
              )}
            </div>
          </div>
        )}

        {/* ── Orders Tab ── */}
        {tab === "orders" && (
          <div
            className="eod-chart-card"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <div className="eod-orders-header">
              <span className="eod-chart-title" style={{ margin: 0 }}>
                All orders
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  className="eod-date-inp"
                  value={paymentFilter}
                  onChange={(e) => {
                    setPaymentFilter(e.target.value);
                    setOrdersPage(1);
                  }}
                >
                  <option value="all">All payments</option>
                  <option value="Cash">Cash only</option>
                  <option value="Card">Card only</option>
                </select>
                <select
                  className="eod-date-inp"
                  value={ordersPageSize}
                  onChange={(e) => {
                    setOrdersPageSize(Number(e.target.value));
                    setOrdersPage(1);
                  }}
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s} per page
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="eod-orders-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date / time</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersPageRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="eod-empty">
                        No orders for this range
                      </td>
                    </tr>
                  ) : (
                    ordersPageRows.map((o) => (
                      <tr key={o.id}>
                        <td className="eod-order-num">
                          #{o.order_number || o.id}
                        </td>
                        <td className="eod-muted">{fmtDate(o.created_at)}</td>
                        <td>{o.customer_name || "—"}</td>
                        <td className="eod-order-total">
                          {fmt(o.final_amount ?? o.total_amount ?? 0)}
                        </td>
                        <td>
                          <span
                            className={`eod-pay-badge ${o.payment_method === "Cash" ? "eod-pay-cash" : "eod-pay-card"}`}
                          >
                            {o.payment_method}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="eod-pagination">
              <span className="eod-muted">
                {filteredOrders.length} order
                {filteredOrders.length !== 1 ? "s" : ""}
              </span>
              <div className="eod-pag-btns">
                <button
                  className="eod-pag-btn"
                  onClick={() => setOrdersPage(1)}
                  disabled={ordersPage === 1}
                >
                  ⏮
                </button>
                <button
                  className="eod-pag-btn"
                  onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                  disabled={ordersPage === 1}
                >
                  ◀
                </button>
                <span className="eod-pag-label">
                  Page {ordersPage} / {ordersPageCount}
                </span>
                <button
                  className="eod-pag-btn"
                  onClick={() =>
                    setOrdersPage((p) => Math.min(ordersPageCount, p + 1))
                  }
                  disabled={ordersPage === ordersPageCount}
                >
                  ▶
                </button>
                <button
                  className="eod-pag-btn"
                  onClick={() => setOrdersPage(ordersPageCount)}
                  disabled={ordersPage === ordersPageCount}
                >
                  ⏭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EndOfDaySales;
