// BillingCounter.jsx — 3-column POS layout
import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";
import DashboardLayout from "../components/DashboardLayout";
import { DateTime } from "luxon";
import "./BillingCounter.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import imageMapping from "./imageMapping";

const toVegBool = (raw) => {
  if (raw === true) return true;
  if (raw === false) return false;
  if (raw == null) return false;
  if (typeof raw === "number") return raw === 1;
  const s = String(raw).trim().toLowerCase();
  if (["true", "1", "yes", "y", "veg", "v"].includes(s)) return true;
  return false;
};

const BillingCounter = () => {
  const printRef = useRef();
  const user = JSON.parse(localStorage.getItem("user"));
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [vegFilter, setVegFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [serverName] = useState(user?.first_name || user?.username || "Staff");
  const [orderType, setOrderType] = useState("Eat In");
  const [customerName, setCustomerName] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [nextTempOrderNumber, setNextTempOrderNumber] = useState(null);
  const [orderDate, setOrderDate] = useState(null);
  const [isTillOpen, setIsTillOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [tillActionType, setTillActionType] = useState(null);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [tillOpenedBy, setTillOpenedBy] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [resumedHeldOrderId, setResumedHeldOrderId] = useState(null);
  const [userRole, setUserRole] = useState(
    () => localStorage.getItem("userRole") || "staff",
  );
  const [favourites, setFavourites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("favourites") || "[]");
    } catch {
      return [];
    }
  });

  const [customerNotes, setCustomerNotes] = useState("");

  // ── Pager QR ──
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);
  const [pagerModal, setPagerModal] = useState(false);
  const [pagerData, setPagerData] = useState(null);
  const [pagerLoading, setPagerLoading] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);

  useEffect(() => {
    // Optimistic local state while API loads
    if (localStorage.getItem("isTillOpen") === "true") setIsTillOpen(true);
    const tu = localStorage.getItem("tillOpenedBy");
    if (tu) setTillOpenedBy(tu);

    // Fetch authoritative till state from backend
    api
      .get("/till/status")
      .then((res) => {
        const open = !!res.data.open;
        setIsTillOpen(open);
        localStorage.setItem("isTillOpen", open ? "true" : "false");
        const by = res.data.opened_by || "";
        setTillOpenedBy(open ? by : "");
        if (open) localStorage.setItem("tillOpenedBy", by);
        else localStorage.removeItem("tillOpenedBy");
      })
      .catch(() => {
        // Silently fall back to localStorage value already set above
      });

    fetchMenu();
    fetchCategories();
    fetchLastOrderNumber();
    const resumed = localStorage.getItem("resumedOrder");
    if (resumed) {
      try {
        const order = JSON.parse(resumed);
        setCustomerName(order.customer_name || order.customer || "");
        setOrderType(order.order_type || order.orderType || "Eat In");
        setSelectedItems(Array.isArray(order.items) ? order.items : []);
        if (order.id) setResumedHeldOrderId(order.id);
        localStorage.removeItem("resumedOrder");
      } catch {
        localStorage.removeItem("resumedOrder");
      }
    }
  }, []);

  const fetchMenu = async () => {
    try {
      const res = await api.get("/menu");
      const normalized = (Array.isArray(res.data) ? res.data : []).map(
        (item) => {
          const rawVeg =
            item.veg ??
            item.isVeg ??
            item.is_veg ??
            item.type ??
            item.category_type;
          const categoryName =
            typeof item.category === "object" && item.category
              ? (item.category.name ??
                item.category.title ??
                String(item.category))
              : item.category;
          const priceNum =
            typeof item.price === "number"
              ? item.price
              : parseFloat(item.price) || 0;
          return {
            ...item,
            price: priceNum,
            veg: toVegBool(rawVeg),
            category: categoryName,
            available: !!item.available,
          };
        },
      );
      setMenuItems(normalized);
    } catch (err) {
      console.error("Failed to fetch menu:", err);
      toast.error("Failed to load menu");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      const names = (Array.isArray(res.data) ? res.data : []).map(
        (c) => c.name ?? c.title ?? String(c),
      );
      setCategories(names);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const fetchLastOrderNumber = () => {
    // Order number is generated by the backend on placement.
    // Show today's date prefix as a preview placeholder.
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    setNextTempOrderNumber(`${dd}${mm}-****`);
  };

  const clearCurrentOrder = () => {
    setSelectedItems([]);
    setCustomerName("");
    setCustomerNotes("");
    setDiscountPercent(0);
  };

  const handleAddItem = (item) => {
    const index = selectedItems.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      const updated = [...selectedItems];
      updated[index].qty += 1;
      updated[index].total = updated[index].qty * updated[index].price;
      setSelectedItems(updated);
    } else {
      setSelectedItems([
        ...selectedItems,
        { ...item, qty: 1, total: item.price },
      ]);
    }
  };

  const handleQtyChange = (index, delta) => {
    const updated = [...selectedItems];
    updated[index].qty += delta;
    if (updated[index].qty <= 0) updated.splice(index, 1);
    else updated[index].total = updated[index].qty * updated[index].price;
    setSelectedItems(updated);
  };

  const handleRemoveItem = (index) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  const getTotal = () => selectedItems.reduce((sum, i) => sum + i.total, 0);
  const getIncludedTax = () => getTotal() * (20 / 105);
  const getIncludedService = () => getTotal() * (8 / 105);
  const getDiscountAmount = () => (getTotal() * discountPercent) / 100;
  const getGrandTotal = () => getTotal() - getDiscountAmount();
  const getDateTime = () =>
    DateTime.now().setZone("Europe/London").toFormat("dd/MM/yyyy HH:mm:ss");

  const startNewOrder = () => {
    setSelectedItems([]);
    setCustomerName("");
    setCustomerNotes("");
    setOrderNumber(null);
    setShowReceipt(false);
    setOrderDate(null);
    setLastPlacedOrder(null);
    setPagerData(null);
    setPagerModal(false);
    fetchLastOrderNumber();
  };

  const generatePagerQR = async () => {
    // If already generated, just re-show the modal
    if (pagerData) { setPagerModal(true); return; }
    if (!lastPlacedOrder?.id) return toast.error("No order to generate pager for.");
    setPagerLoading(true);
    try {
      const res = await api.post(`/pager/generate/${lastPlacedOrder.id}`);
      setPagerData(res.data);
      setPagerModal(true);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to generate pager QR");
    } finally {
      setPagerLoading(false);
    }
  };

  const renderReceiptHTML = (data) => {
    const { orderNumber: onum, orderType: otype, customerName: cname, customerPhone: cphone, paymentMethod: pay, customerNotes: cnotes, orderDate: odate, items, totals, staffName, pagerQR } = data;

    // Items rows: "2x Punugulu  £5.00" — name left, price right
    const itemRows = items.map((it) => {
      const qty   = it.qty ?? it.quantity ?? 0;
      const price = Number(it.price ?? 0);
      const total = Number(it.total ?? price * qty);
      return `<div class="item-row"><span class="item-name">${qty}x ${it.name}</span><span class="item-price">£${total.toFixed(2)}</span></div>`;
    }).join("");

    // ── CUSTOMER COPY ──────────────────────────────────────────────
    const customerCopy = `
      <div class="bill-section">
        <div class="receipt-header">
          <h2>Mirchi Mafiya</h2>
          <p class="light">Cumberland Street, LU1 3BW, Luton</p>
          <p class="light">Phone: +447440086046</p>
          <p class="light">dtsretaillimited@gmail.com</p>
        </div>
        <hr/>
        <p class="highlight-row">ORDER #${onum ?? "—"}</p>
        <p class="highlight-row">${cname || "N/A"}</p>
        ${cphone ? `<p class="highlight-row">📞 ${cphone}</p>` : ""}
        <p class="light">Type: ${otype}</p>
        <p class="highlight-row" style="font-size:11px">Date: ${odate || "—"}</p>
        <hr/>
        <p class="items-label">Items</p>
        <div class="items-block">${itemRows}</div>
        <hr/>
        <div class="receipt-summary">
          <div class="summary-row light"><span>Sub Total</span><span>£${totals.subtotal.toFixed(2)}</span></div>
          ${totals.discount > 0 ? `<div class="summary-row light"><span>Discount (${totals.discountPct}%)</span><span>-£${totals.discount.toFixed(2)}</span></div>` : ""}
          <div class="summary-row light"><span>VAT (20%)</span><span>£${totals.vat.toFixed(2)}</span></div>
          <div class="summary-row light"><span>Service (8%)</span><span>£${totals.service.toFixed(2)}</span></div>
          <div class="summary-row grand-total"><span>TOTAL</span><span>£${totals.grand.toFixed(2)}</span></div>
          <div class="summary-row highlight-pay"><span>Payment</span><span>${pay}</span></div>
          <div class="summary-row light"><span>Staff</span><span>${staffName || "—"}</span></div>
        </div>
        ${cnotes ? `<hr/><p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin:0 0 1mm">Special Requests:</p><p style="font-size:10px;font-style:italic;margin:0 0 2mm">${cnotes}</p>` : ""}
        ${pagerQR ? `
        <div style="text-align:center;margin-top:4mm;padding-top:3mm;border-top:1px dashed #bbb">
          <p style="font-size:10px;margin-bottom:2mm;font-weight:700">📱 Scan to track your order</p>
          <img src="${pagerQR}" style="width:120px;height:120px;" />
          <p style="font-size:9px;margin-top:2mm;color:#111">We'll notify you when it's ready!</p>
        </div>` : ""}
        <p style="text-align:center;margin-top:3mm;font-size:9px;color:#111">Thank you for visiting Mirchi Mafiya!</p>
      </div>`;

    // ── KITCHEN COPY ───────────────────────────────────────────────
    const kitchenRows = items.map((it) => {
      const qty = it.qty ?? it.quantity ?? 0;
      return `<tr><td style="font-size:14px;font-weight:900;padding:2mm 0">${qty} X ${it.name.toUpperCase()}</td></tr>`;
    }).join("");

    const kitchenCopy = `
      <div class="bill-section kitchen">
        <div style="text-align:center;margin-bottom:3mm">
          <h2 style="font-size:14px;margin:0">KITCHEN</h2>
          <div style="font-size:22px;font-weight:900;letter-spacing:1px;margin:2mm 0">#${onum ?? "—"}</div>
          <div style="font-size:15px;font-weight:800">${(otype || "").toUpperCase()}</div>
          <div style="font-size:13px;font-weight:700;margin-top:1mm">${cname || ""}</div>
        </div>
        <hr/>
        <table class="receipt-table" style="width:100%">
          <tbody>${kitchenRows}</tbody>
        </table>
        <hr/>
        ${cnotes ? `<p style="font-size:12px;font-weight:900;margin:1mm 0">⚠ NOTES: ${cnotes}</p><hr/>` : ""}
        <p style="text-align:center;font-size:10px;color:#111">${odate || ""}</p>
      </div>`;

    return `${customerCopy}${kitchenCopy}`;
  };

  const receiptStyles = `<style>
    @page { size: 80mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; width: 80mm; height: auto; overflow: visible; }
    body { font-family: 'Courier New', monospace; background: #fff; color: #000; }
    .bill-section { width: 72mm; max-width: 72mm; padding: 5mm 4mm; margin: 0 auto; font-size: 11px; line-height: 1.4; }
    .receipt-header { text-align: center; margin-bottom: 2mm; }
    .receipt-header h2 { font-size: 15px; margin: 0 0 1mm; font-weight: 900; letter-spacing: 1px; }
    .light { font-weight: 400; font-size: 10px; color: #111; margin: 0.5mm 0; }
    .highlight-row { font-size: 13px; font-weight: 900; margin: 1mm 0; letter-spacing: 0.3px; }
    .items-label { font-size: 9px; font-weight: 700; color: #333; text-transform: uppercase; letter-spacing: .8px; margin: 1.5mm 0 1mm; }
    .items-block { display: flex; flex-direction: column; gap: 1mm; margin-bottom: 1mm; }
    .item-row { display: flex; justify-content: space-between; align-items: baseline; gap: 4px; }
    .item-name { font-size: 12px; font-weight: 900; flex: 1; }
    .item-price { font-size: 12px; font-weight: 900; white-space: nowrap; }
    .receipt-summary { margin-top: 1mm; }
    .summary-row { display: flex; justify-content: space-between; margin: 0.6mm 0; }
    .grand-total { font-size: 13px; font-weight: 900; border-top: 2px solid #000; padding-top: 1mm; margin-top: 1mm; }
    .highlight-pay { font-size: 12px; font-weight: 900; }
    .kitchen { page-break-before: always; break-before: page; }
    hr { border: 0; border-top: 1px dashed #333; margin: 2mm 0; }
    .page-break { page-break-after: always; break-after: page; height: 0; display: block; }
  </style>`;

  // Print via hidden iframe — no popup window, just the OS print dialog
  const printViaIframe = (html) => {
    const id = "bc-receipt-frame";
    const old = document.getElementById(id);
    if (old) old.remove();
    const f = document.createElement("iframe");
    f.id = id;
    f.style.cssText = "position:fixed;bottom:0;right:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(f);
    const doc = f.contentDocument || f.contentWindow.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"/>${receiptStyles}</head><body>${html}</body></html>`);
    doc.close();
    const doPrint = () => {
      try { f.contentWindow.focus(); f.contentWindow.print(); } catch (_) {}
      setTimeout(() => { try { f.remove(); } catch (_) {} }, 2000);
    };
    const imgs = doc.getElementsByTagName("img");
    if (!imgs.length) { setTimeout(doPrint, 150); return; }
    let loaded = 0;
    const tick = () => { if (++loaded >= imgs.length) setTimeout(doPrint, 150); };
    Array.from(imgs).forEach((img) => { if (img.complete) tick(); else { img.onload = tick; img.onerror = tick; } });
  };

  // Legacy alias used by any remaining callers
  const printReceipt = (html) => printViaIframe(html);

  const handlePlaceOrder = async () => {
    if (isPlacing) return; // prevent double-submit
    if (!isTillOpen) return toast.error("Open the till first.");
    if (!selectedItems.length) return toast.error("Add items first.");
    if (!paymentMethod) return toast.error("Select a payment method.");
    if (!customerName.trim()) return toast.error("Customer name is required.");

    setIsPlacing(true);
    const payload = {
      customer_name: customerName,
      server_name: tillOpenedBy || serverName,
      order_type: orderType,
      items: selectedItems.map((item) => ({
        name: item.name,
        price: item.price,
        qty: item.qty,
        total: item.total,
      })),
      total_amount: getTotal(),
      discount_percent: discountPercent,
      discount_amount: getDiscountAmount(),
      final_amount: getGrandTotal(),
      payment_method: paymentMethod,
      customer_notes: customerNotes.trim() || null,
      created_at: DateTime.now().toUTC().toISO(),
      date: getDateTime(),
    };
    try {
      const res = await api.post("/orders", payload);
      const placed = res?.data?.order || {};

      // Auto-generate pager QR so it prints on the receipt
      let autoPager = null;
      if (placed.id) {
        try {
          const pagerRes = await api.post(`/pager/generate/${placed.id}`);
          autoPager = pagerRes.data;
          setPagerData(pagerRes.data);
        } catch (_) {
          // Pager generation is optional — don't block the order
        }
      }

      setLastPlacedOrder({
        id: placed.id,
        order_number: placed.order_number ?? nextTempOrderNumber,
        customer_name: customerName,
      });

      const totals = {
        subtotal: getTotal(),
        vat: getIncludedTax(),
        service: getIncludedService(),
        discount: getDiscountAmount(),
        discountPct: discountPercent,
        grand: getGrandTotal(),
      };
      printViaIframe(
        renderReceiptHTML({
          orderNumber: placed.order_number ?? nextTempOrderNumber,
          orderType: placed.order_type || orderType,
          customerName,
          customerPhone: null,
          paymentMethod,
          customerNotes: customerNotes.trim() || null,
          orderDate: placed.date ?? getDateTime(),
          items: selectedItems,
          totals,
          staffName: tillOpenedBy,
          pagerQR: autoPager?.qrCode ?? null,
        })
      );
      if (resumedHeldOrderId) {
        try {
          await api.delete(`/orders/held/${resumedHeldOrderId}`);
        } catch (err) {
          console.error(err);
        }
        setResumedHeldOrderId(null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to place order");
    } finally {
      setIsPlacing(false);
    }
  };

  const holdCurrentOrder = async () => {
    if (!selectedItems.length) return toast.info("No items to hold");
    if (!isTillOpen) return toast.error("Open the till first.");
    try {
      await api.post("/orders/held", {
        customer_name: customerName || "N/A",
        server_name: serverName || "",
        order_type: orderType || "",
        items: selectedItems.map((item) => ({
          name: item.name,
          price: item.price,
          qty: item.qty,
          total: item.total,
        })),
        total_amount: getTotal(),
        discount_percent: discountPercent || 0,
        discount_amount: getDiscountAmount() || 0,
      });
      toast.success("Order held!");
      startNewOrder();
    } catch (err) {
      toast.error("Failed to hold order");
    }
  };

  const confirmTillAction = async () => {
    try {
      const res = await api.post("/auth/login", {
        username: authUsername,
        password: authPassword,
      });
      if (res.status === 200 && res.data.token) {
        const role = res.data.role || "staff";
        localStorage.setItem("userRole", role);
        setUserRole(role);

        if (tillActionType === "open") {
          await api.post("/till/open", { opened_by: authUsername });
          setIsTillOpen(true);
          localStorage.setItem("isTillOpen", "true");
          setTillOpenedBy(authUsername);
          localStorage.setItem("tillOpenedBy", authUsername);
          toast.success("Till opened.");
        } else {
          await api.post("/till/close", { closed_by: authUsername });
          setIsTillOpen(false);
          localStorage.setItem("isTillOpen", "false");
          toast.info("Till closed.");
          setTillOpenedBy("");
          localStorage.removeItem("tillOpenedBy");
        }

        setShowAuthModal(false);
        setAuthUsername("");
        setAuthPassword("");
      } else {
        toast.error("Invalid credentials");
      }
    } catch (err) {
      const msg = err?.response?.data?.error;
      if (msg) {
        toast.error(msg); // e.g. "Till is already open"
      } else {
        toast.error("Failed to authenticate");
      }
    }
  };

  const toggleFavourite = (itemId) => {
    setFavourites((prev) => {
      const next = prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId];
      localStorage.setItem("favourites", JSON.stringify(next));
      return next;
    });
  };

  const allCategories = ["All", "★ Favs", ...categories];

  const filteredMenu = menuItems.filter((item) => {
    const matchCat =
      activeCategory === "All"
        ? true
        : activeCategory === "★ Favs"
          ? favourites.includes(item.id)
          : (item.category ?? "").toString() === activeCategory;
    const matchVeg =
      vegFilter === "all" ||
      (vegFilter === "veg" && item.veg) ||
      (vegFilter === "nonveg" && !item.veg);
    const matchSearch = (item.name?.toLowerCase() || "").includes(
      searchQuery.toLowerCase(),
    );
    return matchCat && matchVeg && matchSearch;
  });

  const getCatCount = (cat) => {
    if (cat === "All") return menuItems.length;
    if (cat === "★ Favs") return favourites.length;
    return menuItems.filter((i) => (i.category ?? "").toString() === cat)
      .length;
  };

  const placeDisabled =
    isPlacing || !isTillOpen || !paymentMethod || selectedItems.length === 0;

  return (
    <DashboardLayout>
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="bc-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="bc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bc-modal-header">
              <span className="bc-modal-title">
                {tillActionType === "open" ? "Open till" : "Close till"}
              </span>
              <button
                className="bc-modal-close"
                onClick={() => setShowAuthModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="bc-modal-body">
              <div className="bc-field">
                <label className="bc-label">Username</label>
                <input
                  className="bc-input"
                  type="text"
                  placeholder="Enter username"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                />
              </div>
              <div className="bc-field">
                <label className="bc-label">Password</label>
                <input
                  className="bc-input"
                  type="password"
                  placeholder="Enter password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmTillAction()}
                />
              </div>
            </div>
            <div className="bc-modal-footer">
              <button
                className="bc-btn-sec"
                onClick={() => setShowAuthModal(false)}
              >
                Cancel
              </button>
              <button
                className={`bc-btn-pri ${tillActionType === "open" ? "green" : "red"}`}
                onClick={confirmTillAction}
              >
                {tillActionType === "open" ? "Open till" : "Close till"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bc-pos">
        {/* ── SIDEBAR ── */}
        <div className="bc-sidebar">
          <div className="bc-sidebar-logo">
            <div className="bc-sidebar-brand">🌶 Mirchi Mafiya</div>
            <div className="bc-sidebar-sub">Point of Sale</div>
          </div>
          <div className="bc-sidebar-cats">
            {allCategories.map((cat) => (
              <button
                key={cat}
                className={`bc-scat${activeCategory === cat ? " active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span className="bc-scat-name">{cat}</span>
                <span className="bc-scat-count">{getCatCount(cat)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── CENTER MENU ── */}
        <div className="bc-center">
          <div className="bc-ctopbar">
            <input
              className="bc-search"
              type="text"
              placeholder="Search menu items…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="bc-veg-btns">
              <button
                className={`bc-vbtn${vegFilter === "all" ? " active" : ""}`}
                onClick={() => setVegFilter("all")}
              >
                All
              </button>
              <button
                className={`bc-vbtn${vegFilter === "veg" ? " active" : ""}`}
                onClick={() => setVegFilter("veg")}
              >
                🟢 Veg
              </button>
              <button
                className={`bc-vbtn${vegFilter === "nonveg" ? " active" : ""}`}
                onClick={() => setVegFilter("nonveg")}
              >
                🔴 Non-Veg
              </button>
            </div>
          </div>

          <div className="bc-grid">
            {filteredMenu.length === 0 ? (
              <div className="bc-no-items">No items found</div>
            ) : (
              filteredMenu.map((item) => {
                const inCart = selectedItems.find((s) => s.id === item.id);
                const isUnavailable = !item.available;
                return (
                  <div
                    key={item.id}
                    className={`bc-card${isUnavailable ? " bc-card--soldout" : ""}`}
                    onClick={() => !isUnavailable && handleAddItem(item)}
                  >
                    {isUnavailable && (
                      <div className="bc-soldout-overlay">Sold Out</div>
                    )}
                    {!isUnavailable && inCart && (
                      <div className="bc-card-badge">{inCart.qty}</div>
                    )}
                    <button
                      className={`bc-fav${favourites.includes(item.id) ? " on" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavourite(item.id);
                      }}
                    >
                      {favourites.includes(item.id) ? "♥" : "♡"}
                    </button>
                    <img
                      className="bc-card-img"
                      src={
                        imageMapping[item.name] || "/images/default-food.jpg"
                      }
                      alt={item.name}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                    <div className="bc-card-img-fb" style={{ display: "none" }}>
                      🍽
                    </div>
                    <div className="bc-card-body">
                      <div className="bc-card-name">{item.name}</div>
                      <div className="bc-card-foot">
                        <span className="bc-card-price">
                          £{item.price.toFixed(2)}
                        </span>
                        <span
                          className={`bc-vdot ${item.veg ? "veg" : "nonveg"}`}
                          title={item.veg ? "Veg" : "Non-Veg"}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT ORDER PANEL ── */}
        <div className="bc-right">
          {/* Header */}
          <div className="bc-right-header">
            <div className="bc-right-header-left">
              <span className="bc-order-id">
                Order {nextTempOrderNumber ? `#${nextTempOrderNumber}` : ""}
              </span>
              <span
                className={`bc-till-status ${isTillOpen ? "open" : "closed"}`}
              >
                {isTillOpen
                  ? `🟢 Open · ${tillOpenedBy || ""}`
                  : "🔴 Till closed"}
              </span>
            </div>
            <div className="bc-till-btns">
              <button
                className="bc-till-btn open"
                onClick={() => {
                  setTillActionType("open");
                  setShowAuthModal(true);
                }}
              >
                Open
              </button>
              <button
                className="bc-till-btn close"
                onClick={() => {
                  setTillActionType("close");
                  setShowAuthModal(true);
                }}
              >
                Close
              </button>
            </div>
          </div>

          {/* Order type toggle */}
          <div className="bc-pay-row" style={{ marginBottom: 8 }}>
            <button
              className={`bc-pay-btn${orderType === "Eat In" ? " selected" : ""}`}
              onClick={() => setOrderType("Eat In")}
            >
              🍽️ Eat In
            </button>
            <button
              className={`bc-pay-btn${orderType === "Take Away" ? " selected" : ""}`}
              onClick={() => setOrderType("Take Away")}
            >
              🥡 Take Away
            </button>
          </div>

          {/* Customer */}
          <input
            className="bc-cust-inp"
            type="text"
            placeholder="Customer name *"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />

          {/* Special Requests */}
          <div className="bc-notes-wrap">
            <textarea
              className="bc-notes-inp"
              placeholder="Special requests (e.g. no onions, less spicy…)"
              maxLength={500}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
            />
            {customerNotes.length > 0 && (
              <span className="bc-notes-count">{customerNotes.length}/500</span>
            )}
          </div>

          {/* Cart */}
          <div className="bc-cart">
            {selectedItems.length === 0 ? (
              <div className="bc-cart-empty">
                <span className="bc-cart-empty-icon">🛒</span>
                <span>No items added yet</span>
                <small>Tap a menu item to add</small>
              </div>
            ) : (
              <div className="bc-cart-items">
                {selectedItems.map((item, index) => (
                  <div key={index} className="bc-cart-row">
                    <img
                      className="bc-cart-img"
                      src={
                        imageMapping[item.name] || "/images/default-food.jpg"
                      }
                      alt={item.name}
                      onError={(e) => {
                        e.target.style.background = "#f0eeff";
                        e.target.style.display = "flex";
                      }}
                    />
                    <div className="bc-cart-info">
                      <div className="bc-cart-name">{item.name}</div>
                      <div className="bc-cart-unit">
                        £{item.price.toFixed(2)} each
                      </div>
                    </div>
                    <div className="bc-qty-ctrl">
                      <button
                        className="bc-qty-btn"
                        onClick={() => handleQtyChange(index, -1)}
                      >
                        −
                      </button>
                      <span className="bc-qty-num">{item.qty}</span>
                      <button
                        className="bc-qty-btn"
                        onClick={() => handleQtyChange(index, 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="bc-line-total">
                      £{item.total.toFixed(2)}
                    </span>
                    <button
                      className="bc-remove-btn"
                      onClick={() => handleRemoveItem(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedItems.length > 0 && (
            <div className="bc-summary">
              <div className="bc-sum-row">
                <span>Subtotal</span>
                <span>£{getTotal().toFixed(2)}</span>
              </div>
              <div className="bc-sum-row muted">
                <span>VAT (20%)</span>
                <span>£{getIncludedTax().toFixed(2)}</span>
              </div>
              <div className="bc-sum-row muted">
                <span>Service (8%)</span>
                <span>£{getIncludedService().toFixed(2)}</span>
              </div>

              {userRole === "admin" && (
                <div className="bc-discount-row">
                  <span className="bc-discount-label">Discount %</span>
                  <div className="bc-discount-ctrl">
                    <button
                      className="bc-disc-btn"
                      onClick={() =>
                        setDiscountPercent((p) => Math.max(0, p - 5))
                      }
                    >
                      −
                    </button>
                    <input
                      className="bc-disc-input"
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) =>
                        setDiscountPercent(
                          Math.min(
                            100,
                            Math.max(0, Number(e.target.value) || 0),
                          ),
                        )
                      }
                    />
                    <span className="bc-disc-pct">%</span>
                    <button
                      className="bc-disc-btn"
                      onClick={() =>
                        setDiscountPercent((p) => Math.min(100, p + 5))
                      }
                    >
                      +
                    </button>
                  </div>
                  {discountPercent > 0 && (
                    <span className="bc-disc-saving">
                      −£{getDiscountAmount().toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              <div className="bc-sum-total">
                <span>Total</span>
                <span>£{getGrandTotal().toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bc-actions">
            <div className="bc-pay-row">
              <button
                className={`bc-pay-btn${paymentMethod === "Cash" ? " selected" : ""}`}
                onClick={() => setPaymentMethod("Cash")}
                disabled={!isTillOpen}
              >
                💵 Cash
              </button>
              <button
                className={`bc-pay-btn${paymentMethod === "Card" ? " selected" : ""}`}
                onClick={() => setPaymentMethod("Card")}
                disabled={!isTillOpen}
              >
                💳 Card
              </button>
            </div>
            <div className="bc-confirm-row">
              <button
                className="bc-place-btn"
                onClick={handlePlaceOrder}
                disabled={placeDisabled}
              >
                {isPlacing ? "Placing…" : "Place order"}
              </button>
              <button
                className="bc-hold-btn"
                onClick={holdCurrentOrder}
                disabled={!isTillOpen}
              >
                Hold
              </button>
              <button
                className="bc-clear-btn"
                onClick={clearCurrentOrder}
                disabled={!isTillOpen}
                title="Clear"
              >
                ✕
              </button>
            </div>
            {lastPlacedOrder && (
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button
                  onClick={generatePagerQR}
                  disabled={pagerLoading}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    background: pagerLoading ? "#ccc" : "#7c3aed",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: pagerLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {pagerLoading ? "…" : "📱 Show Pager QR"}
                </button>
                <button
                  onClick={startNewOrder}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    background: "#e5e7eb",
                    color: "#111",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                  }}
                >
                  ✓ New Order
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Receipt overlay */}
      {showReceipt && (
        <div className="bc-receipt-overlay">
          <div className="bill-section" ref={printRef}>
            <div className="receipt-header">
              <h2>Mirchi Mafiya</h2>
              <p>Cumberland Street, LU1 3BW, Luton</p>
              <p>Phone: +447440086046</p>
              <p>dtsretaillimited@gmail.com</p>
              <p>Order Type: {orderType}</p>
              <p>
                <strong>Customer:</strong> {customerName || "N/A"}
              </p>
              <p>
                <strong>Order No:</strong> #{orderNumber || "—"}
              </p>
              <p>
                <strong>Paid By:</strong> {paymentMethod}
              </p>
              <hr />
              <p>Date: {orderDate || "—"}</p>
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
                {selectedItems.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td style={{ textAlign: "right" }}>
                      £{item.price.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {item.qty ?? item.quantity ?? 0}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      £{item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="receipt-summary">
              <p>
                <strong>Sub Total:</strong> £ {getTotal().toFixed(2)}
              </p>
              <p>VAT (20%): £{getIncludedTax().toFixed(2)}</p>
              <p>Service (8%): £{getIncludedService().toFixed(2)}</p>
              {discountPercent > 0 && (
                <p>
                  <strong>Discount ({discountPercent}%):</strong> -£
                  {getDiscountAmount().toFixed(2)}
                </p>
              )}
              <p className="grand-total">
                <strong>Grand Total:</strong> £ {getGrandTotal().toFixed(2)}
              </p>
              <hr />
            </div>
          </div>
        </div>
      )}
      {/* ── Pager QR Modal ── */}
      {pagerModal && pagerData && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setPagerModal(false)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 20, padding: "32px 28px",
              maxWidth: 360, width: "90%", textAlign: "center",
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "1.8rem", marginBottom: 4 }}>📱</div>
            <h3 style={{ margin: "0 0 4px", color: "#1a1a1a", fontSize: "1.15rem" }}>
              Pager QR — Order #{pagerData.orderNumber}
            </h3>
            <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: 16 }}>
              Show this to <strong>{pagerData.customerName}</strong> to scan
            </p>
            <img
              src={pagerData.qrCode}
              alt="Pager QR Code"
              style={{ width: 220, height: 220, borderRadius: 12, border: "1px solid #eee" }}
            />
            <p style={{ fontSize: "0.75rem", color: "#aaa", marginTop: 10, wordBreak: "break-all" }}>
              {pagerData.pagerUrl}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => {
                  const w = window.open("", "_blank");
                  w.document.write(`<img src="${pagerData.qrCode}" style="width:300px"/>`);
                  w.print();
                }}
                style={{
                  flex: 1, padding: "10px 0", background: "#f3f4f6",
                  border: "none", borderRadius: 8, fontWeight: 600,
                  cursor: "pointer", fontSize: "0.9rem",
                }}
              >
                🖨️ Print QR
              </button>
              <button
                onClick={() => { setPagerModal(false); startNewOrder(); }}
                style={{
                  flex: 1, padding: "10px 0", background: "#7c3aed", color: "#fff",
                  border: "none", borderRadius: 8, fontWeight: 700,
                  cursor: "pointer", fontSize: "0.9rem",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default BillingCounter;
