import React, { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import "./MasterData.css";
import DashboardLayout from "../components/DashboardLayout";
import usePagination from "../hooks/usePagination";
import PaginationBar from "../components/PaginationBar";

const MasterData = () => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    categoryId: "",
    veg: true,
  });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItem, setEditingItem] = useState({});
  const [filters, setFilters] = useState({
    q: "",
    category: "all",
    veg: "all",
    minPrice: "",
    maxPrice: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get("/categories"),
        api.get("/menu"),
      ]);
      setCategories(catRes.data || []);
      setMenuItems(itemRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCategory.trim())
      return setCategoryError("Category name is required");
    try {
      await api.post("/categories", { name: newCategory });
      setNewCategory("");
      setCategoryError("");
      fetchData();
    } catch (err) {
      setCategoryError(err?.response?.data?.error || "Failed to add category");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;
    try {
      await api.delete(`/categories/${id}`);
      fetchData();
    } catch (err) {
      setCategoryError(
        err?.response?.data?.error || "Failed to delete category",
      );
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const handleSaveCategory = async (id) => {
    if (!editingCategoryName.trim()) return;
    try {
      await api.put(`/categories/${id}`, { name: editingCategoryName });
      setEditingCategoryId(null);
      fetchData();
    } catch (err) {
      console.error("Update category error:", err);
    }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const { name, price, categoryId, veg } = newItem;
    if (!name.trim() || !price || !categoryId)
      return alert("Please fill all fields.");
    try {
      await api.post("/menu", {
        name,
        price: parseFloat(price),
        is_veg: veg,
        categoryId: Number(categoryId),
      });
      setNewItem({ name: "", price: "", categoryId: "", veg: true });
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to add item");
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await api.delete(`/menu/${id}`);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete item");
    }
  };

  const handleEditItem = (item) => {
    setEditingItemId(item.id);
    setEditingItem({ ...item, veg: item.is_veg });
  };

  const handleSaveItem = async (id) => {
    const { name, price, categoryId, veg } = editingItem;
    if (!name.trim() || !price || !categoryId)
      return alert("Please fill all fields.");
    try {
      await api.put(`/menu/${id}`, {
        name,
        price: parseFloat(price),
        is_veg: veg,
        categoryId: Number(categoryId),
      });
      setEditingItemId(null);
      fetchData();
    } catch (err) {
      console.error("Update item error:", err);
    }
  };

  const filteredMenuItems = useMemo(() => {
    const q = (filters.q || "").trim().toLowerCase();
    const min = filters.minPrice !== "" ? Number(filters.minPrice) : null;
    const max = filters.maxPrice !== "" ? Number(filters.maxPrice) : null;
    return (menuItems || []).filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const catId =
        item.categoryId ?? item.category_id ?? item.CategoryId ?? "";
      const isVeg =
        typeof item.is_veg === "boolean"
          ? item.is_veg
          : typeof item.veg === "boolean"
            ? item.veg
            : String(item.is_veg ?? item.veg ?? "").toLowerCase() === "true";
      const priceNum = Number(item.price);
      return (
        (q === "" || name.includes(q)) &&
        (filters.category === "all" ||
          String(catId) === String(filters.category)) &&
        (filters.veg === "all" || (filters.veg === "veg" ? isVeg : !isVeg)) &&
        (min === null || (!Number.isNaN(priceNum) && priceNum >= min)) &&
        (max === null || (!Number.isNaN(priceNum) && priceNum <= max))
      );
    });
  }, [menuItems, filters]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    pageRows: pagedMenuItems,
  } = usePagination(filteredMenuItems);

  const clearFilters = () => {
    setFilters({
      q: "",
      category: "all",
      veg: "all",
      minPrice: "",
      maxPrice: "",
    });
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="md-wrapper">
        <div className="md-header">
          <h1 className="md-title">Master data</h1>
          <p className="md-subtitle">Manage categories and menu items</p>
        </div>

        <div className="md-layout">
          {/* ── Categories ── */}
          <div className="md-card">
            <div className="md-card-header">
              <span className="md-card-title">Categories</span>
              <span className="md-count-badge">{categories.length}</span>
            </div>

            <form className="md-add-form" onSubmit={handleCategorySubmit}>
              <input
                id="md-cat-input"
                className="md-input md-input--flex"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setCategoryError("");
                }}
                placeholder="New category name"
              />
              <button id="md-cat-add-btn" type="submit" className="md-add-btn">
                Add
              </button>
            </form>

            {categoryError && <div className="md-error">{categoryError}</div>}

            <ul className="md-cat-list">
              {categories.length === 0 && (
                <li className="md-cat-empty">No categories yet</li>
              )}
              {categories.map((cat) => (
                <li key={cat.id} id={`md-cat-row-${cat.id}`} className="md-cat-item">
                  {editingCategoryId === cat.id ? (
                    <>
                      <input
                        id={`md-cat-edit-input-${cat.id}`}
                        className="md-input md-input--flex"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        autoFocus
                      />
                      <div className="md-row-actions">
                        <button
                          id={`md-cat-save-${cat.id}`}
                          className="md-action-btn md-action-btn--save"
                          type="button"
                          onClick={() => handleSaveCategory(cat.id)}
                        >
                          ✓
                        </button>
                        <button
                          id={`md-cat-cancel-${cat.id}`}
                          className="md-action-btn md-action-btn--cancel"
                          type="button"
                          onClick={() => setEditingCategoryId(null)}
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="md-cat-name">{cat.name}</span>
                      <div className="md-row-actions">
                        <button
                          id={`md-cat-edit-${cat.id}`}
                          className="md-action-btn md-action-btn--edit"
                          type="button"
                          onClick={() => handleEditCategory(cat)}
                        >
                          Edit
                        </button>
                        <button
                          id={`md-cat-del-${cat.id}`}
                          className="md-action-btn md-action-btn--del"
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          Del
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* ── Menu Items ── */}
          <div className="md-card md-card--wide">
            <div className="md-card-header">
              <span className="md-card-title">Menu items</span>
              <span className="md-count-badge">{menuItems.length}</span>
            </div>

            {/* Add item form — single row */}
            <form className="md-item-form" onSubmit={handleItemSubmit}>
              <input
                id="md-item-name-input"
                className="md-input md-input--flex"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                placeholder="Item name"
                required
              />
              <input
                id="md-item-price-input"
                className="md-input md-input--price"
                type="number"
                value={newItem.price}
                onChange={(e) =>
                  setNewItem({ ...newItem, price: e.target.value })
                }
                placeholder="Price £"
                required
              />
              <select
                id="md-item-category-select"
                className="md-input md-input--cat"
                value={newItem.categoryId}
                onChange={(e) =>
                  setNewItem({ ...newItem, categoryId: e.target.value })
                }
                required
              >
                <option value="">Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                id="md-item-veg-select"
                className="md-input md-input--veg"
                value={newItem.veg ? "veg" : "nonveg"}
                onChange={(e) =>
                  setNewItem({ ...newItem, veg: e.target.value === "veg" })
                }
              >
                <option value="veg">Veg</option>
                <option value="nonveg">Non-Veg</option>
              </select>
              <button id="md-item-add-btn" type="submit" className="md-add-btn">
                Add item
              </button>
            </form>

            {/* Filters — single row */}
            <div className="md-filters">
              <input
                id="md-filter-search"
                className="md-input md-input--flex"
                placeholder="Search by name…"
                value={filters.q}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, q: e.target.value }));
                  setPage(1);
                }}
              />
              <select
                id="md-filter-category"
                className="md-input md-input--cat"
                value={filters.category}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, category: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                id="md-filter-veg"
                className="md-input md-input--veg"
                value={filters.veg}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, veg: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="all">Veg & non-veg</option>
                <option value="veg">Veg only</option>
                <option value="nonveg">Non-veg only</option>
              </select>
              <input
                id="md-filter-min-price"
                className="md-input md-input--price"
                type="number"
                placeholder="Min £"
                value={filters.minPrice}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, minPrice: e.target.value }));
                  setPage(1);
                }}
              />
              <input
                id="md-filter-max-price"
                className="md-input md-input--price"
                type="number"
                placeholder="Max £"
                value={filters.maxPrice}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, maxPrice: e.target.value }));
                  setPage(1);
                }}
              />
              <button
                id="md-filter-clear"
                className="md-clear-btn"
                type="button"
                onClick={clearFilters}
              >
                Clear
              </button>
              <span className="md-results-count">
                {filteredMenuItems.length} of {menuItems.length}
              </span>
            </div>

            {/* Table */}
            <div className="md-table-wrap">
              <table className="md-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th style={{ textAlign: "center", width: 110 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedMenuItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="md-empty">
                        No items match your filters
                      </td>
                    </tr>
                  ) : (
                    pagedMenuItems.map((item) => (
                      <tr key={item.id} id={`md-item-row-${item.id}`}>
                        {editingItemId === item.id ? (
                          <>
                            <td>
                              <input
                                className="md-input md-input--flex"
                                value={editingItem.name}
                                onChange={(e) =>
                                  setEditingItem({
                                    ...editingItem,
                                    name: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="md-input md-input--price"
                                type="number"
                                value={editingItem.price}
                                onChange={(e) =>
                                  setEditingItem({
                                    ...editingItem,
                                    price: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <select
                                className="md-input md-input--flex"
                                value={editingItem.categoryId}
                                onChange={(e) =>
                                  setEditingItem({
                                    ...editingItem,
                                    categoryId: e.target.value,
                                  })
                                }
                              >
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <div className="md-row-actions md-row-actions--center">
                                <button
                                  id={`md-item-save-${item.id}`}
                                  className="md-action-btn md-action-btn--save"
                                  type="button"
                                  onClick={() => handleSaveItem(item.id)}
                                >
                                  ✓
                                </button>
                                <button
                                  id={`md-item-cancel-${item.id}`}
                                  className="md-action-btn md-action-btn--cancel"
                                  type="button"
                                  onClick={() => setEditingItemId(null)}
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>
                              <div className="md-item-name-cell">
                                <span
                                  className={`md-veg-dot ${item.is_veg ? "veg" : "nonveg"}`}
                                  title={item.is_veg ? "Veg" : "Non-Veg"}
                                />
                                <span>{item.name}</span>
                              </div>
                            </td>
                            <td className="md-price-cell">
                              £{Number(item.price).toFixed(2)}
                            </td>
                            <td className="md-muted">
                              {item.category?.name ||
                                categories.find(
                                  (c) =>
                                    String(c.id) === String(item.categoryId),
                                )?.name ||
                                "—"}
                            </td>
                            <td>
                              <div className="md-row-actions md-row-actions--center">
                                <button
                                  id={`md-item-edit-${item.id}`}
                                  className="md-action-btn md-action-btn--edit"
                                  type="button"
                                  onClick={() => handleEditItem(item)}
                                >
                                  Edit
                                </button>
                                <button
                                  id={`md-item-del-${item.id}`}
                                  className="md-action-btn md-action-btn--del"
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  Del
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              onChangePage={setPage}
              onChangePageSize={setPageSize}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MasterData;
