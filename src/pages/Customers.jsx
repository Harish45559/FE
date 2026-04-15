import React, { useEffect, useState, useMemo } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import "./Customers.css";

/* Derive initials from a full name */
function getInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* Deterministic hue from name string */
function nameHue(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return h % 360;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name",   label: "Name A–Z" },
];

const Customers = () => {
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [sort, setSort]             = useState("newest");
  const [view, setView]             = useState("grid"); // "grid" | "table"

  useEffect(() => {
    api.get("/customer/auth/list")
      .then((res) => setCustomers(res.data.customers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = customers.filter((c) =>
      [c.name, c.email, c.phone, c.city, c.postcode]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
    if (sort === "newest") list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sort === "oldest") list = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sort === "name") list = [...list].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    return list;
  }, [customers, search, sort]);

  /* Stats */
  const now = new Date();
  const thisMonth = customers.filter((c) => {
    const d = new Date(c.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  return (
    <DashboardLayout>
      {/* ── Header ── */}
      <div className="cx-header">
        <div>
          <h1 className="cx-title">Customers</h1>
          <p className="cx-subtitle">All registered online customers</p>
        </div>
        <div className="cx-header-right">
          {/* View toggle */}
          <div className="cx-view-toggle">
            <button
              className={`cx-vbtn${view === "grid" ? " active" : ""}`}
              onClick={() => setView("grid")}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              className={`cx-vbtn${view === "table" ? " active" : ""}`}
              onClick={() => setView("table")}
              title="Table view"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="cx-stats">
        <div className="cx-stat">
          <span className="cx-stat-val">{customers.length}</span>
          <span className="cx-stat-lbl">Total customers</span>
        </div>
        <div className="cx-stat-divider" />
        <div className="cx-stat">
          <span className="cx-stat-val cx-stat-green">{thisMonth}</span>
          <span className="cx-stat-lbl">Joined this month</span>
        </div>
        <div className="cx-stat-divider" />
        <div className="cx-stat">
          <span className="cx-stat-val">{filtered.length}</span>
          <span className="cx-stat-lbl">Showing</span>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="cx-controls">
        <div className="cx-search-wrap">
          <span className="cx-search-icon">🔍</span>
          <input
            className="cx-search"
            placeholder="Search by name, email, phone, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="cx-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>
        <select
          className="cx-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="cx-empty">Loading customers…</div>
      ) : filtered.length === 0 ? (
        <div className="cx-empty">No customers found.</div>
      ) : view === "grid" ? (
        <div className="cx-grid">
          {filtered.map((c) => {
            const hue = nameHue(c.name);
            return (
              <div className="cx-card" key={c.id}>
                <div
                  className="cx-avatar"
                  style={{
                    background: `hsl(${hue},60%,88%)`,
                    color: `hsl(${hue},55%,32%)`,
                  }}
                >
                  {getInitials(c.name)}
                </div>
                <div className="cx-card-body">
                  <div className="cx-card-name">{c.name || "—"}</div>
                  <div className="cx-card-email">{c.email || "—"}</div>
                  {c.phone && (
                    <div className="cx-card-row">
                      <span className="cx-card-icon">📞</span>
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {(c.city || c.postcode) && (
                    <div className="cx-card-row">
                      <span className="cx-card-icon">📍</span>
                      <span>{[c.city, c.postcode].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  {c.address_line1 && (
                    <div className="cx-card-row cx-card-addr">
                      <span className="cx-card-icon">🏠</span>
                      <span>{c.address_line1}</span>
                    </div>
                  )}
                </div>
                <div className="cx-card-footer">
                  <span className="cx-joined">
                    Joined {c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table view */
        <div className="cx-table-card">
          <div className="cx-table-wrap">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Postcode</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const hue = nameHue(c.name);
                  return (
                    <tr key={c.id}>
                      <td className="cx-td-num">{i + 1}</td>
                      <td>
                        <div className="cx-td-cust">
                          <div
                            className="cx-avatar cx-avatar-sm"
                            style={{
                              background: `hsl(${hue},60%,88%)`,
                              color: `hsl(${hue},55%,32%)`,
                            }}
                          >
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <div className="cx-td-name">{c.name || "—"}</div>
                            <div className="cx-td-email">{c.email || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td>{c.phone || "—"}</td>
                      <td>{c.address_line1 || "—"}</td>
                      <td>{c.city || "—"}</td>
                      <td>{c.postcode || "—"}</td>
                      <td className="cx-td-date">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Customers;
