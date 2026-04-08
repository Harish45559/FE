import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { DateTime } from "luxon";
import "./Dashboard.css";

const AVATAR_COLORS = [
  "#dd3a00",
  "#6c63ff",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#8b5cf6",
  "#14b8a6",
  "#ec4899",
  "#3b82f6",
];

const getInitials = (first = "", last = "") =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [heldOrders, setHeldOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(DateTime.now().setZone("Europe/London"));

  const tillOpen = localStorage.getItem("isTillOpen") === "true";
  const tillOpenedBy = localStorage.getItem("tillOpenedBy") || "—";

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [ordersRes, empRes, heldRes] = await Promise.allSettled([
          api.get("/orders/all"),
          api.get("/attendance/dashboard"),
          api.get("/orders/held"),
        ]);
        if (ordersRes.status === "fulfilled") {
          const raw = Array.isArray(ordersRes.value.data)
            ? ordersRes.value.data
            : (ordersRes.value.data?.orders ?? []);
          setOrders(
            raw.map((o) => ({
              id: o.id ?? o._id,
              order_number: o.order_number ?? "—",
              customer_name: o.customer_name ?? "N/A",
              order_type: o.order_type ?? "",
              payment_method: o.payment_method ?? "Cash",
              final_amount: Number(o.final_amount ?? o.total ?? 0),
              total_amount: Number(o.total_amount ?? 0),
              discount_amount: Number(o.discount_amount ?? 0),
              items: Array.isArray(o.items) ? o.items : [],
              date: o.date ?? o.created_at ?? "",
            })),
          );
        }
        if (empRes.status === "fulfilled") {
          setEmployees(
            Array.isArray(empRes.value.data) ? empRes.value.data : [],
          );
        }
        if (heldRes.status === "fulfilled") {
          const h = Array.isArray(heldRes.value.data)
            ? heldRes.value.data
            : (heldRes.value.data?.heldOrders ?? []);
          setHeldOrders(h);
        }
      } catch (e) {
        console.error("Dashboard fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Filter today's orders
  const todayStr = today.toFormat("dd/MM/yyyy");
  const todayOrders = orders.filter((o) => {
    const raw = String(o.date ?? "");
    if (raw.includes("/")) return raw.startsWith(todayStr);
    return raw.slice(0, 10) === today.toFormat("yyyy-MM-dd");
  });

  // Stats
  const totalRevenue = todayOrders.reduce((s, o) => s + o.final_amount, 0);
  const totalOrders = todayOrders.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const cashSales = todayOrders
    .filter((o) => o.payment_method?.toLowerCase() === "cash")
    .reduce((s, o) => s + o.final_amount, 0);
  const cardSales = todayOrders
    .filter((o) => o.payment_method?.toLowerCase() === "card")
    .reduce((s, o) => s + o.final_amount, 0);
  const totalDiscounts = todayOrders.reduce((s, o) => s + o.discount_amount, 0);
  const clockedIn = employees.filter(
    (e) => e.attendance_status === "Clocked In",
  ).length;

  // Recent orders (last 5)
  const recentOrders = [...todayOrders]
    .sort((a, b) =>
      String(b.order_number).localeCompare(String(a.order_number)),
    )
    .slice(0, 5);

  // Top selling items today
  const itemMap = {};
  todayOrders.forEach((o) => {
    (o.items || []).forEach((it) => {
      const name = it.name || "Unknown";
      itemMap[name] = (itemMap[name] || 0) + Number(it.qty || 1);
    });
  });
  const topItems = Object.entries(itemMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxQty = topItems[0]?.[1] || 1;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="dash-loading">
          <div className="dash-spinner" />
          <span>Loading dashboard…</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dash">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Dashboard</h1>
            <p className="dash-sub">
              {today.toFormat("cccc, dd MMMM yyyy")} — Today's summary
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="dash-stats">
          <div id="dash-stat-revenue" className="dash-stat">
            <div className="dash-stat-icon" style={{ background: "#fff1ee" }}>
              💰
            </div>
            <div className="dash-stat-label">Today's Revenue</div>
            <div id="dash-stat-revenue-value" className="dash-stat-value">£{totalRevenue.toFixed(2)}</div>
            <div className="dash-stat-sub">{totalOrders} orders placed</div>
          </div>
          <div id="dash-stat-orders" className="dash-stat">
            <div className="dash-stat-icon" style={{ background: "#f0fdf4" }}>
              🧾
            </div>
            <div className="dash-stat-label">Orders Today</div>
            <div id="dash-stat-orders-value" className="dash-stat-value">{totalOrders}</div>
            <div className="dash-stat-sub">
              {
                todayOrders.filter(
                  (o) => o.payment_method?.toLowerCase() === "cash",
                ).length
              }{" "}
              cash &nbsp;·&nbsp;
              {
                todayOrders.filter(
                  (o) => o.payment_method?.toLowerCase() === "card",
                ).length
              }{" "}
              card
            </div>
          </div>
          <div id="dash-stat-avg" className="dash-stat">
            <div className="dash-stat-icon" style={{ background: "#eff6ff" }}>
              🛒
            </div>
            <div className="dash-stat-label">Avg Order Value</div>
            <div id="dash-stat-avg-value" className="dash-stat-value">£{avgOrder.toFixed(2)}</div>
            <div className="dash-stat-sub">per order today</div>
          </div>
          <div id="dash-stat-staff" className="dash-stat">
            <div className="dash-stat-icon" style={{ background: "#fefce8" }}>
              👥
            </div>
            <div className="dash-stat-label">Staff Clocked In</div>
            <div id="dash-stat-staff-value" className="dash-stat-value">{clockedIn}</div>
            <div className="dash-stat-sub">of {employees.length} employees</div>
          </div>
        </div>

        {/* Middle row */}
        <div className="dash-mid">
          {/* Recent orders */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Recent Orders</span>
              <span className="dash-card-tag">today</span>
            </div>
            {recentOrders.length === 0 ? (
              <div className="dash-empty">No orders today yet</div>
            ) : (
              recentOrders.map((o) => (
                <div key={o.id} id={`dash-order-row-${o.id}`} className="dash-order-row">
                  <span className="dash-order-num">#{o.order_number}</span>
                  <span className="dash-order-cust">
                    {o.customer_name}
                    {o.order_type ? ` · ${o.order_type}` : ""}
                  </span>
                  <span
                    className={`dash-pay ${o.payment_method?.toLowerCase() === "card" ? "card" : "cash"}`}
                  >
                    {o.payment_method?.toLowerCase() === "card" ? "💳" : "💵"}{" "}
                    {o.payment_method}
                  </span>
                  <span className="dash-order-amt">
                    £{o.final_amount.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Top items */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Top Selling Items</span>
              <span className="dash-card-tag">today</span>
            </div>
            {topItems.length === 0 ? (
              <div className="dash-empty">No sales data yet</div>
            ) : (
              topItems.map(([name, qty], i) => (
                <div key={name} className="dash-item-row">
                  <div className="dash-item-rank">{i + 1}</div>
                  <div className="dash-item-name">{name}</div>
                  <div className="dash-item-bar-wrap">
                    <div
                      className="dash-item-bar"
                      style={{ width: `${(qty / maxQty) * 100}%` }}
                    />
                  </div>
                  <span className="dash-item-count">{qty}x</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="dash-bot">
          {/* Staff */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Staff Status</span>
              <span className="dash-card-tag">
                {clockedIn} in · {employees.length} total
              </span>
            </div>
            {employees.length === 0 ? (
              <div className="dash-empty">No employees found</div>
            ) : (
              <div className="dash-staff-scroll">
                {employees.map((emp, i) => (
                  <div key={emp.id} id={`dash-staff-row-${emp.id}`} className="dash-staff-row">
                    <div
                      className="dash-staff-av"
                      style={{
                        background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                      }}
                    >
                      {getInitials(emp.first_name, emp.last_name)}
                    </div>
                    <span className="dash-staff-name">
                      {emp.first_name} {emp.last_name}
                    </span>
                    <span
                      className={`dash-staff-status ${emp.attendance_status === "Clocked In" ? "in" : "out"}`}
                    >
                      {emp.attendance_status === "Clocked In" ? "In" : "Out"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Till summary */}
          <div id="dash-till-summary" className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Till Summary</span>
              <span className={`dash-card-tag ${tillOpen ? "green" : "red"}`}>
                {tillOpen ? "🟢 Open" : "🔴 Closed"}
              </span>
            </div>
            <div className="dash-till-row">
              <span className="dash-till-label">Opened by</span>
              <span className="dash-till-val">{tillOpenedBy}</span>
            </div>
            <div className="dash-till-row">
              <span className="dash-till-label">Cash sales</span>
              <span className="dash-till-val">£{cashSales.toFixed(2)}</span>
            </div>
            <div className="dash-till-row">
              <span className="dash-till-label">Card sales</span>
              <span className="dash-till-val">£{cardSales.toFixed(2)}</span>
            </div>
            <div className="dash-till-row">
              <span className="dash-till-label">Total discounts</span>
              <span className="dash-till-val" style={{ color: "#dd3a00" }}>
                {totalDiscounts > 0
                  ? `-£${totalDiscounts.toFixed(2)}`
                  : "£0.00"}
              </span>
            </div>
            <div className="dash-till-row">
              <span className="dash-till-label">Net revenue</span>
              <span
                className="dash-till-val"
                style={{ color: "#22c55e", fontWeight: 700 }}
              >
                £{totalRevenue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Held orders */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Held Orders</span>
              {heldOrders.length > 0 && (
                <span className="dash-card-tag orange">
                  {heldOrders.length} pending
                </span>
              )}
            </div>
            {heldOrders.length === 0 ? (
              <div className="dash-empty">No held orders</div>
            ) : (
              heldOrders.slice(0, 5).map((h, i) => (
                <div key={h.id ?? i} className="dash-held-row">
                  <span className="dash-held-num">#{i + 1}</span>
                  <span className="dash-held-cust">
                    {h.customer_name || "Walk-in"} · {h.items?.length ?? 0}{" "}
                    items
                  </span>
                  <span className="dash-held-amt">
                    £{Number(h.total_amount ?? 0).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
