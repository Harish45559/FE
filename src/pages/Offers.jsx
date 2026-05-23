import React, { useEffect, useState } from "react";
import api from "../services/api";
import "./Offers.css";

const EMPTY_FORM = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  applicable_to: "all",
  applicable_ids: [],
  min_order_value: "",
  max_uses: "",
  per_customer_limit: "",
  active: true,
  expires_at: "",
};

const TYPE_LABELS = {
  percentage: "% Off",
  fixed: "£ Off",
  bogo: "Buy 1 Get 1 Free",
};

export default function Offers() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [itemSearch, setItemSearch] = useState("");
  const [catSearch, setCatSearch] = useState("");

  const fetchPromos = async () => {
    try {
      const res = await api.get("/promos");
      setPromos(res.data.promos || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPromos();
    api.get("/categories").then(r => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get("/menu").then(r => setMenuItems(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      code: p.code,
      description: p.description || "",
      discount_type: p.discount_type,
      discount_value: String(p.discount_value),
      applicable_to: p.applicable_to,
      applicable_ids: p.applicable_ids || [],
      min_order_value: p.min_order_value !== null ? String(p.min_order_value) : "",
      max_uses: p.max_uses !== null ? String(p.max_uses) : "",
      per_customer_limit: p.per_customer_limit !== null ? String(p.per_customer_limit) : "",
      active: p.active,
      expires_at: p.expires_at ? p.expires_at.split("T")[0] : "",
    });
    setEditId(p.id);
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    setError("");
    if (!form.code.trim()) return setError("Code is required");
    if (!form.discount_value && form.discount_type !== "bogo") return setError("Discount value is required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase().trim(),
        discount_value: parseFloat(form.discount_value) || 0,
        min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        per_customer_limit: form.per_customer_limit ? parseInt(form.per_customer_limit) : null,
        expires_at: form.expires_at || null,
      };
      if (editId) {
        await api.patch(`/promos/${editId}`, payload);
      } else {
        await api.post("/promos", payload);
      }
      setShowForm(false);
      fetchPromos();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p) => {
    try {
      await api.patch(`/promos/${p.id}`, { active: !p.active });
      fetchPromos();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this promo code?")) return;
    try {
      await api.delete(`/promos/${id}`);
      fetchPromos();
    } catch {}
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleId = (id) => {
    setForm((f) => ({
      ...f,
      applicable_ids: f.applicable_ids.includes(id)
        ? f.applicable_ids.filter((x) => x !== id)
        : [...f.applicable_ids, id],
    }));
  };

  return (
    <div className="offers-page">
      <div className="offers-header">
        <div>
          <h1 className="offers-title">🏷️ Offers & Promo Codes</h1>
          <p className="offers-sub">Create discount codes for your customers</p>
        </div>
        <button className="offers-create-btn" onClick={openCreate}>+ New Offer</button>
      </div>

      {loading ? (
        <div className="offers-loading">Loading…</div>
      ) : promos.length === 0 ? (
        <div className="offers-empty">
          <div className="offers-empty-icon">🏷️</div>
          <p>No promo codes yet. Create your first one!</p>
          <button className="offers-create-btn" onClick={openCreate}>+ Create Promo Code</button>
        </div>
      ) : (
        <div className="offers-grid">
          {promos.map((p) => (
            <div key={p.id} className={`offer-card ${!p.active ? "inactive" : ""}`}>
              <div className="offer-card-top">
                <div className="offer-code">{p.code}</div>
                <span className={`offer-badge ${p.active ? "active" : "off"}`}>
                  {p.active ? "Active" : "Off"}
                </span>
              </div>

              {p.description && <div className="offer-desc">{p.description}</div>}

              <div className="offer-details">
                <div className="offer-detail-row">
                  <span>Discount</span>
                  <strong>
                    {p.discount_type === "percentage" && `${p.discount_value}% off`}
                    {p.discount_type === "fixed" && `£${p.discount_value} off`}
                    {p.discount_type === "bogo" && "Buy 1 Get 1 Free"}
                  </strong>
                </div>
                <div className="offer-detail-row">
                  <span>Applies to</span>
                  <strong>{p.applicable_to === "all" ? "All items" : p.applicable_to}</strong>
                </div>
                {p.min_order_value && (
                  <div className="offer-detail-row">
                    <span>Min order</span>
                    <strong>£{parseFloat(p.min_order_value).toFixed(2)}</strong>
                  </div>
                )}
                <div className="offer-detail-row">
                  <span>Uses</span>
                  <strong>{p.uses_count} / {p.max_uses ?? "∞"}</strong>
                </div>
                <div className="offer-detail-row">
                  <span>Per customer</span>
                  <strong>{p.per_customer_limit ?? "Unlimited"}</strong>
                </div>
                {p.expires_at && (
                  <div className="offer-detail-row">
                    <span>Expires</span>
                    <strong>{new Date(p.expires_at).toLocaleDateString("en-GB")}</strong>
                  </div>
                )}
              </div>

              <div className="offer-card-actions">
                <button className="offer-toggle-btn" onClick={() => handleToggle(p)}>
                  {p.active ? "Disable" : "Enable"}
                </button>
                <button className="offer-edit-btn" onClick={() => openEdit(p)}>Edit</button>
                <button className="offer-delete-btn" onClick={() => handleDelete(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="offers-overlay" onClick={() => setShowForm(false)}>
          <div className="offers-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="offers-modal-title">{editId ? "Edit Offer" : "New Offer"}</h2>

            {error && <div className="offers-error">{error}</div>}

            <div className="form-row">
              <label>Promo Code *</label>
              <input
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="e.g. MIRCHI10"
                disabled={!!editId}
              />
            </div>

            <div className="form-row">
              <label>Description</label>
              <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Launching day special" />
            </div>

            <div className="form-row-2">
              <div className="form-row">
                <label>Discount Type *</label>
                <select value={form.discount_type} onChange={(e) => set("discount_type", e.target.value)}>
                  <option value="percentage">% Off (Percentage)</option>
                  <option value="fixed">£ Off (Fixed Amount)</option>
                  <option value="bogo">Buy 1 Get 1 Free (BOGO)</option>
                </select>
              </div>
              {form.discount_type !== "bogo" && (
                <div className="form-row">
                  <label>{form.discount_type === "percentage" ? "Percentage (%)" : "Amount (£)"} *</label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => set("discount_value", e.target.value)}
                    placeholder={form.discount_type === "percentage" ? "e.g. 10" : "e.g. 5"}
                    min="0"
                    max={form.discount_type === "percentage" ? "100" : undefined}
                  />
                </div>
              )}
            </div>

            <div className="form-row">
              <label>Applies To</label>
              <select value={form.applicable_to} onChange={(e) => { set("applicable_to", e.target.value); set("applicable_ids", []); setCatSearch(""); setItemSearch(""); }}>
                <option value="all">All Items</option>
                <option value="categories">Specific Categories</option>
                <option value="items">Specific Items</option>
              </select>
            </div>

            {form.applicable_to === "categories" && (
              <div className="form-row">
                <label>Search &amp; Select Categories</label>
                <input
                  className="item-search"
                  placeholder="Search categories…"
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                />
                <div className="id-picker">
                  {categories
                    .filter((c) => c.name.toLowerCase().includes(catSearch.toLowerCase()))
                    .map((c) => (
                      <label key={c.id} className={`id-chip ${form.applicable_ids.includes(c.id) ? "selected" : ""}`}>
                        <input type="checkbox" checked={form.applicable_ids.includes(c.id)} onChange={() => toggleId(c.id)} />
                        {c.name}
                      </label>
                    ))}
                  {categories.filter((c) => c.name.toLowerCase().includes(catSearch.toLowerCase())).length === 0 && (
                    <span style={{ color: "#aaa", fontSize: 13 }}>No categories found</span>
                  )}
                </div>
                {form.applicable_ids.length > 0 && (
                  <p className="id-selected-note">✓ {form.applicable_ids.length} categor{form.applicable_ids.length > 1 ? "ies" : "y"} selected</p>
                )}
              </div>
            )}

            {form.applicable_to === "items" && (
              <div className="form-row">
                <label>Search &amp; Select Items</label>
                <input
                  className="item-search"
                  placeholder="Search menu items…"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
                <div className="id-picker id-picker--items">
                  {menuItems
                    .filter((it) => it.name.toLowerCase().includes(itemSearch.toLowerCase()))
                    .map((it) => (
                      <label key={it.id} className={`id-chip ${form.applicable_ids.includes(it.id) ? "selected" : ""}`}>
                        <input type="checkbox" checked={form.applicable_ids.includes(it.id)} onChange={() => toggleId(it.id)} />
                        {it.name}
                      </label>
                    ))}
                  {menuItems.filter((it) => it.name.toLowerCase().includes(itemSearch.toLowerCase())).length === 0 && (
                    <span style={{ color: "#aaa", fontSize: 13 }}>No items found</span>
                  )}
                </div>
                {form.applicable_ids.length > 0 && (
                  <p className="id-selected-note">✓ {form.applicable_ids.length} item{form.applicable_ids.length > 1 ? "s" : ""} selected</p>
                )}
              </div>
            )}

            <div className="form-row">
              <label>Minimum Cart Value (£)</label>
              <input
                type="number"
                value={form.min_order_value}
                onChange={(e) => set("min_order_value", e.target.value)}
                placeholder="Leave blank for no minimum"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-row-2">
              <div className="form-row">
                <label>Max Total Uses</label>
                <input
                  type="number"
                  value={form.max_uses}
                  onChange={(e) => set("max_uses", e.target.value)}
                  placeholder="Leave blank for unlimited"
                  min="1"
                />
              </div>
              <div className="form-row">
                <label>Per Customer Limit</label>
                <input
                  type="number"
                  value={form.per_customer_limit}
                  onChange={(e) => set("per_customer_limit", e.target.value)}
                  placeholder="Leave blank for unlimited"
                  min="1"
                />
              </div>
            </div>

            <div className="form-row">
              <label>Expiry Date</label>
              <input type="date" value={form.expires_at} onChange={(e) => set("expires_at", e.target.value)} />
            </div>

            <div className="form-row form-row-toggle">
              <label>Active</label>
              <button
                className={`toggle-switch ${form.active ? "on" : "off"}`}
                onClick={() => set("active", !form.active)}
              >
                {form.active ? "ON" : "OFF"}
              </button>
            </div>

            <div className="offers-modal-footer">
              <button className="offers-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="offers-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editId ? "Save Changes" : "Create Promo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
