import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import './MasterData.css';
import DashboardLayout from '../components/DashboardLayout';

const MasterData = () => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newItem, setNewItem] = useState({ name: '', price: '', categoryId: '', veg: true });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItem, setEditingItem] = useState({});
  const [filters, setFilters] = useState({
    q: '',
    category: 'all',
    veg: 'all',
    minPrice: '',
    maxPrice: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const catRes = await api.get('/categories');
      const itemRes = await api.get('/menu');
      setCategories(catRes.data || []);
      setMenuItems(itemRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  // ---------- Category handlers ----------
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return alert('Category name is required');
    try {
      await api.post('/categories', { name: newCategory });
      setNewCategory('');
      fetchData();
    } catch (err) {
      console.error('Category save error:', err);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchData();
    } catch (err) {
      console.error('Delete category error:', err);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const handleSaveCategory = async (id) => {
    if (!editingCategoryName.trim()) return alert('Category name is required');
    try {
      await api.put(`/categories/${id}`, { name: editingCategoryName });
      setEditingCategoryId(null);
      fetchData();
    } catch (err) {
      console.error('Update category error:', err);
    }
  };

  // ---------- Menu item handlers ----------
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const { name, price, categoryId, veg } = newItem;

    if (!name.trim() || !price || !categoryId) {
      alert('Please fill all fields.');
      return;
    }

    try {
      await api.post('/menu', {
        name,
        price: parseFloat(price),
        is_veg: veg,
        categoryId: Number(categoryId)
      });
      setNewItem({ name: '', price: '', categoryId: '', veg: true });
      fetchData();
    } catch (err) {
      console.error('Item save error:', err);
      alert('Failed to add item. Please check backend logs.');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/menu/${id}`);
      fetchData();
    } catch (err) {
      console.error('Delete item error:', err);
    }
  };

  const handleEditItem = (item) => {
    setEditingItemId(item.id);
    setEditingItem({ ...item, veg: item.is_veg });
  };

  const handleSaveItem = async (id) => {
    const { name, price, categoryId, veg } = editingItem;
    if (!name.trim() || !price || !categoryId) {
      alert('Please fill all fields.');
      return;
    }
    try {
      await api.put(`/menu/${id}`, {
        name,
        price: parseFloat(price),
        is_veg: veg,
        categoryId: Number(categoryId)
      });
      setEditingItemId(null);
      fetchData();
    } catch (err) {
      console.error('Update item error:', err);
    }
  };

  // ---------- Filters (defensive to handle minor field name differences) ----------
  const filteredMenuItems = useMemo(() => {
    const q = (filters.q || '').trim().toLowerCase();
    const min = filters.minPrice !== '' ? Number(filters.minPrice) : null;
    const max = filters.maxPrice !== '' ? Number(filters.maxPrice) : null;

    return (menuItems || []).filter((item) => {
      const name = String(item.name || '').toLowerCase();

      // Category id can be categoryId or category_id depending on backend
      const catId =
        item.categoryId ??
        item.category_id ??
        item.CategoryId ??
        item.CategoryID ??
        '';

      // Veg flag may be is_veg or veg; could be boolean or string
      const isVeg =
        typeof item.is_veg === 'boolean'
          ? item.is_veg
          : typeof item.veg === 'boolean'
          ? item.veg
          : String(item.is_veg ?? item.veg ?? '').toLowerCase() === 'true';

      const priceNum = Number(item.price);

      const matchesSearch = q === '' || name.includes(q);
      const matchesCategory =
        filters.category === 'all' ||
        String(catId) === String(filters.category);
      const matchesVeg =
        filters.veg === 'all' ||
        (filters.veg === 'veg' ? isVeg : !isVeg);
      const matchesMin = min === null || (!Number.isNaN(priceNum) && priceNum >= min);
      const matchesMax = max === null || (!Number.isNaN(priceNum) && priceNum <= max);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesVeg &&
        matchesMin &&
        matchesMax
      );
    });
  }, [menuItems, filters]);

  const clearFilters = () => {
    setFilters({ q: '', category: 'all', veg: 'all', minPrice: '', maxPrice: '' });
  };

  return (
    <DashboardLayout>
      <div className="master-data-wrapper">
        <h2>Master Data</h2>

        {/* CATEGORIES */}
        <div className="category-panel">
          <h3>Categories</h3>

          <form
            onSubmit={handleCategorySubmit}
            style={{ display: 'flex', gap: 8, marginBottom: 12 }}
          >
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New Category"
              required
            />
            <button type="submit">Add</button>
          </form>

          <ul>
            {categories.map((cat) => (
              <li key={cat.id}>
                {editingCategoryId === cat.id ? (
                  <>
                    <input
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                    />
                    <div className="actions">
                      <button type="button" onClick={() => handleSaveCategory(cat.id)}>
                        <svg width="16" height="16" fill="green" viewBox="0 0 24 24">
                          <path d="M20.3 5.71L9 17l-5.3-5.3L5.41 10 9 13.59 18.89 3.7z" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => setEditingCategoryId(null)}>
                        <svg width="16" height="16" fill="gray" viewBox="0 0 24 24">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {cat.name}
                    <div className="actions">
                      <button type="button" onClick={() => handleEditCategory(cat)}>
                        <svg width="16" height="16" fill="blue" viewBox="0 0 24 24">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => handleDeleteCategory(cat.id)}>
                        <svg width="16" height="16" fill="red" viewBox="0 0 24 24">
                          <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-4.5l-1-1z" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* MENU ITEMS */}
        <div className="menu-panel">
          <h3>Menu Items</h3>

          {/* Create New Item */}
          <form
            onSubmit={handleItemSubmit}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}
          >
            <input
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="Item name"
              required
            />
            <input
              type="number"
              value={newItem.price}
              onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
              placeholder="Price"
              required
            />
            <select
              value={newItem.categoryId}
              onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={newItem.veg ? 'veg' : 'nonveg'}
              onChange={(e) => setNewItem({ ...newItem, veg: e.target.value === 'veg' })}
              required
            >
              <option value="veg">Veg</option>
              <option value="nonveg">Non-Veg</option>
            </select>
            <button type="submit">Add Item</button>
          </form>

          {/* Filters */}
          <div className="menu-filters">
            <div className="row">
              <input
                className="grow"
                placeholder="Search by name…"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              />

              <select
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={filters.veg}
                onChange={(e) => setFilters((f) => ({ ...f, veg: e.target.value }))}
              >
                <option value="all">Veg & Non-Veg</option>
                <option value="veg">Veg only</option>
                <option value="nonveg">Non-Veg only</option>
              </select>
            </div>

            <div className="row">
              <input
                type="number"
                placeholder="Min Price"
                value={filters.minPrice}
                onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
              />
              <input
                type="number"
                placeholder="Max Price"
                value={filters.maxPrice}
                onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
              />
              <button type="button" className="secondary" onClick={clearFilters}>
                Clear Filters
              </button>

              <div className="results-count">
                Showing <b>{filteredMenuItems.length}</b> of {menuItems.length}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Category</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMenuItems.map((item) => (
                <tr key={item.id}>
                  {editingItemId === item.id ? (
                    <>
                      <td>
                        <input
                          value={editingItem.name}
                          onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editingItem.price}
                          onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          value={editingItem.categoryId}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, categoryId: e.target.value })
                          }
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="actions">
                        <button type="button" onClick={() => handleSaveItem(item.id)}>
                          <svg width="16" height="16" fill="green" viewBox="0 0 24 24">
                            <path d="M20.3 5.71L9 17l-5.3-5.3L5.41 10 9 13.59 18.89 3.7z" />
                          </svg>
                        </button>
                        <button type="button" onClick={() => setEditingItemId(null)}>
                          <svg width="16" height="16" fill="gray" viewBox="0 0 24 24">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            backgroundColor: item.is_veg ? 'green' : 'red',
                            display: 'inline-block'
                          }}
                          title={item.is_veg ? 'Veg' : 'Non-Veg'}
                        />
                        <span>{item.name}</span>
                      </td>
                      <td>£{item.price}</td>
                      <td>
                        {/* Prefer nested name if available, else look up by categoryId */}
                        {item.category?.name ||
                          categories.find((c) => String(c.id) === String(item.categoryId))?.name ||
                          ''}
                      </td>
                      <td className="actions">
                        <button type="button" onClick={() => handleEditItem(item)}>
                          <svg width="16" height="16" fill="blue" viewBox="0 0 24 24">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                        </button>
                        <button type="button" onClick={() => handleDeleteItem(item.id)}>
                          <svg width="16" height="16" fill="red" viewBox="0 0 24 24">
                            <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-4.5l-1-1z" />
                          </svg>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {filteredMenuItems.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: '#666' }}>
                    No items match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MasterData;
