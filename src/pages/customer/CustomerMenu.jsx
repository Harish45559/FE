import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../../services/appSocket";
import customerApi from "../../services/customerApi";
import CustomerLayout from "../../components/CustomerLayout";
import { useCart } from "../../hooks/useCart";
import "./CustomerMenu.css";

function getItemImage(item) {
  if (item.image_url) return item.image_url;
  const slug = item.name
    .toLowerCase()
    .replace(/[''']/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `/images/${slug}.jpg`;
}

const CustomerMenu = () => {
  const [categories, setCategories]   = useState([]);
  const [items, setItems]             = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [vegFilter, setVegFilter]     = useState("all");
  const [search, setSearch]           = useState("");
  const [loading, setLoading]         = useState(true);
  const [imgErrors, setImgErrors]     = useState({});
  const [favourites, setFavourites]   = useState([]);
  const { cart, addItem, updateQty, removeItem, total, itemCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const [catRes, itemRes] = await Promise.all([
          customerApi.get("/customer/menu/categories"),
          customerApi.get("/customer/menu"),
        ]);
        setCategories(catRes.data.categories || []);
        setItems(itemRes.data.items || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
    customerApi.get("/customer/profile/favourites")
      .then((r) => setFavourites(r.data.favourites || []))
      .catch(() => {});

    const handler = ({ id, available }) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, available } : item)),
      );
    };
    socket.on("menu:availability-changed", handler);
    return () => socket.off("menu:availability-changed", handler);
  }, []);

  const handleImgError = (id) =>
    setImgErrors((prev) => ({ ...prev, [id]: true }));

  const handleToggleFavourite = async (e, itemId) => {
    e.stopPropagation();
    const optimistic = favourites.includes(itemId)
      ? favourites.filter((id) => id !== itemId)
      : [...favourites, itemId];
    setFavourites(optimistic);
    try {
      const res = await customerApi.post(`/customer/profile/favourites/toggle/${itemId}`);
      setFavourites(res.data.favourites || []);
    } catch {
      setFavourites(favourites); // revert on error
    }
  };

  // Get qty of item in cart
  const getCartQty = (id) => {
    const found = cart.find((c) => c.id === id);
    return found ? found.qty : 0;
  };

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const catMatch    = activeCategory === "all"
        ? true
        : activeCategory === "favourites"
          ? favourites.includes(i.id)
          : i.categoryId === activeCategory;
      const vegMatch    = vegFilter === "all" || (vegFilter === "veg" && i.is_veg) || (vegFilter === "nonveg" && !i.is_veg);
      const searchMatch = !search.trim() || i.name.toLowerCase().includes(search.toLowerCase()) || (i.category?.name || "").toLowerCase().includes(search.toLowerCase());
      return catMatch && vegMatch && searchMatch;
    });
  }, [items, activeCategory, vegFilter, search, favourites]);

  const hasCart = itemCount > 0;

  return (
    <CustomerLayout>
      <div className={`cm-page ${hasCart ? "cm-split" : ""}`}>

        {/* ── Left: menu area ── */}
        <div className="cm-menu-area">

          {/* Search */}
          <div className="cm-search-wrap">
            <span className="cm-search-icon">🔍</span>
            <input
              data-testid="menu-search"
              className="cm-search"
              type="text"
              placeholder="Search dishes, categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="cm-search-clear" onClick={() => setSearch("")}>✕</button>
            )}
          </div>

          {/* Category tabs */}
          <div className="cm-tabs-row">
            <div className="cm-tabs" data-testid="menu-categories">
              <button
                className={`cm-tab ${activeCategory === "all" ? "active" : ""}`}
                onClick={() => setActiveCategory("all")}
              >
                All
              </button>
              <button
                className={`cm-tab cm-tab-fav ${activeCategory === "favourites" ? "active" : ""}`}
                onClick={() => setActiveCategory("favourites")}
              >
                ♥ Favourites {favourites.length > 0 && <span className="cm-fav-count">{favourites.length}</span>}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`cm-tab ${activeCategory === cat.id ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Veg toggle */}
            <div className="cm-veg-pills">
              {[
                { key: "all",    label: "All" },
                { key: "veg",    label: "🟢 Veg" },
                { key: "nonveg", label: "🔴 Non-Veg" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`cm-veg-pill ${vegFilter === key ? `active-${key}` : ""}`}
                  onClick={() => setVegFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {!loading && (
            <p className="cm-result-count">
              {filtered.length} {filtered.length === 1 ? "item" : "items"}
              {search && ` for "${search}"`}
            </p>
          )}

          {loading ? (
            <div className="cm-loading">
              <div className="cm-spinner" />
              Loading menu…
            </div>
          ) : filtered.length === 0 ? (
            <div className="cm-empty">
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔍</div>
              No items match your search.
            </div>
          ) : (
            <div className="cm-grid" data-testid="menu-grid">
              {filtered.map((item) => {
                const qty = getCartQty(item.id);
                const inCart = qty > 0;
                const soldOut = !item.available;
                return (
                  <div
                    key={item.id}
                    data-testid={`menu-item-${item.id}`}
                    className={`cm-card ${item.is_veg ? "cm-card-veg" : "cm-card-nonveg"} ${inCart ? "cm-card-incart" : ""} ${soldOut ? "cm-card-soldout" : ""}`}
                  >
                    {/* Image */}
                    <div className="cm-img-wrap">
                      <button
                        className={`cm-fav-btn ${favourites.includes(item.id) ? "cm-fav-btn--on" : ""}`}
                        onClick={(e) => handleToggleFavourite(e, item.id)}
                        title={favourites.includes(item.id) ? "Remove from favourites" : "Add to favourites"}
                      >
                        {favourites.includes(item.id) ? "♥" : "♡"}
                      </button>
                      {!imgErrors[item.id] ? (
                        <img
                          src={getItemImage(item)}
                          alt={item.name}
                          className="cm-img"
                          onError={() => handleImgError(item.id)}
                          loading="lazy"
                        />
                      ) : (
                        <div className="cm-img-placeholder">🌶️</div>
                      )}
                      <span className={`cm-veg-dot ${item.is_veg ? "veg" : "nonveg"}`}>
                        {item.is_veg ? "🟢" : "🔴"}
                      </span>
                      {soldOut && (
                        <span className="cm-soldout-badge">Sold Out</span>
                      )}
                      {!soldOut && inCart && (
                        <span className="cm-cart-badge">{qty}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="cm-info">
                      <div className="cm-name">{item.name}</div>
                      {item.category && (
                        <div className="cm-cat">{item.category.name}</div>
                      )}
                      <div className="cm-bottom">
                        <span className="cm-price">£{parseFloat(item.price).toFixed(2)}</span>

                        {soldOut ? (
                          <span className="cm-soldout-label">Unavailable</span>
                        ) : !inCart ? (
                          <button
                            data-testid={`add-btn-${item.id}`}
                            className="cm-add-btn"
                            onClick={() => addItem(item)}
                          >
                            + Add
                          </button>
                        ) : (
                          <div className="cm-qty-ctrl">
                            <button
                              className="cm-qty-btn cm-qty-minus"
                              onClick={() => updateQty(item.id, qty - 1)}
                              aria-label="Remove one"
                            >
                              −
                            </button>
                            <span className="cm-qty-num">{qty}</span>
                            <button
                              className="cm-qty-btn cm-qty-plus"
                              onClick={() => addItem(item)}
                              aria-label="Add one more"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right: cart panel (desktop sticky) ── */}
        {hasCart && (
          <aside className="cm-cart-panel" data-testid="cart-panel">
            <div className="cm-cart-header">
              <span className="cm-cart-title">🛒 Your Cart</span>
              <span className="cm-cart-count">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
            </div>

            <div className="cm-cart-items">
              {cart.map((item) => (
                <div key={item.id} className="cm-cart-row">
                  <div className="cm-cart-name" title={item.name}>{item.name}</div>
                  <div className="cm-cart-controls">
                    <button className="cm-qty-btn" onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                    <span className="cm-qty-val">{item.qty}</span>
                    <button className="cm-qty-btn" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                  </div>
                  <span className="cm-cart-price">£{(item.price * item.qty).toFixed(2)}</span>
                  <button className="cm-cart-remove" onClick={() => removeItem(item.id)}>✕</button>
                </div>
              ))}
            </div>

            <div className="cm-cart-divider" />

            <div className="cm-cart-total-row">
              <span>Subtotal</span>
              <span className="cm-cart-total">£{total.toFixed(2)}</span>
            </div>

            <button
              data-testid="checkout-btn"
              className="cm-checkout-btn"
              onClick={() => navigate("/customer/cart")}
            >
              Checkout — £{total.toFixed(2)}
            </button>
            <button className="cm-continue-btn" onClick={() => {}}>
              + Add more items
            </button>
          </aside>
        )}
      </div>

      {/* ── Mobile floating cart bar ── */}
      {hasCart && (
        <div className="cm-mobile-cart-bar" data-testid="mobile-cart-bar">
          <div className="cm-mobile-cart-info">
            <span className="cm-mobile-cart-count">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
            <span className="cm-mobile-cart-names">
              {cart.slice(0, 2).map((i) => i.name).join(", ")}{cart.length > 2 ? "…" : ""}
            </span>
          </div>
          <button
            className="cm-mobile-cart-btn"
            onClick={() => navigate("/customer/cart")}
          >
            View Cart · £{total.toFixed(2)}
          </button>
        </div>
      )}
    </CustomerLayout>
  );
};

export default CustomerMenu;
