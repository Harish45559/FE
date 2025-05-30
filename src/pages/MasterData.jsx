import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const catRes = await api.get('/categories');
      const itemRes = await api.get('/menu');
      setCategories(catRes.data);
      setMenuItems(itemRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return alert("Category name is required");
    try {
      await api.post('/categories', { name: newCategory });
      setNewCategory('');
      fetchData();
    } catch (err) {
      console.error('Category save error:', err);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
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
    if (!editingCategoryName.trim()) return alert("Category name is required");
    try {
      await api.put(`/categories/${id}`, { name: editingCategoryName });
      setEditingCategoryId(null);
      fetchData();
    } catch (err) {
      console.error('Update category error:', err);
    }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const { name, price, categoryId, veg } = newItem;

    if (!name.trim() || !price || !categoryId) {
      alert("Please fill all fields.");
      return;
    }

    try {
      await api.post('/menu', {
        name,
        price: parseFloat(price),
        is_veg: veg,
        categoryId,
      });
      setNewItem({ name: '', price: '', categoryId: '', veg: true });
      fetchData();
    } catch (err) {
      console.error('Item save error:', err);
      alert("Failed to add item. Please check backend logs.");
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
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
      alert("Please fill all fields.");
      return;
    }
    try {
      await api.put(`/menu/${id}`, {
        name,
        price: parseFloat(price),
        is_veg: veg,
        categoryId,
      });
      setEditingItemId(null);
      fetchData();
    } catch (err) {
      console.error('Update item error:', err);
    }
  };

  return (
    <DashboardLayout>
      <div className="master-data-wrapper">
        <h2>Master Data</h2>

        {/* CATEGORIES */}
        <div className="category-panel">
          <h3>Categories</h3>
          <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New Category"
              required
            />
            <button type="submit">Add</button>

            
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
                      <button onClick={() => handleSaveCategory(cat.id)}>
                        <svg width="16" height="16" fill="green" viewBox="0 0 24 24"><path d="M20.3 5.71L9 17l-5.3-5.3L5.41 10 9 13.59 18.89 3.7z" /></svg>
                      </button>
                      <button onClick={() => setEditingCategoryId(null)}>
                        <svg width="16" height="16" fill="gray" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {cat.name}
                    <div className="actions">
                      <button onClick={() => handleEditCategory(cat)}>
                        <svg width="16" height="16" fill="blue" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteCategory(cat.id)}>
                        <svg width="16" height="16" fill="red" viewBox="0 0 24 24"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-4.5l-1-1z" /></svg>
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          <form onSubmit={handleCategorySubmit}>
            
          </form>
        </div>

        {/* MENU ITEMS */}
        <div className="menu-panel">
          <h3>Menu Items</h3>
          <form onSubmit={handleItemSubmit}>
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
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select
              value={newItem.veg ? "veg" : "nonveg"}
              onChange={(e) => setNewItem({ ...newItem, veg: e.target.value === "veg" })}
              required
            >
              <option value="veg">Veg</option>
              <option value="nonveg">Non-Veg</option>
            </select>
            <button type="submit">Add Item</button>
          </form>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map((item) => (
                <tr key={item.id}>
                  {editingItemId === item.id ? (
                    <>
                      <td><input value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} /></td>
                      <td><input value={editingItem.price} onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })} /></td>
                      <td>
                        <select value={editingItem.categoryId} onChange={(e) => setEditingItem({ ...editingItem, categoryId: e.target.value })}>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="actions">
                        <button onClick={() => handleSaveItem(item.id)}>
                          <svg width="16" height="16" fill="green" viewBox="0 0 24 24"><path d="M20.3 5.71L9 17l-5.3-5.3L5.41 10 9 13.59 18.89 3.7z" /></svg>
                        </button>
                        <button onClick={() => setEditingItemId(null)}>
                          <svg width="16" height="16" fill="gray" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
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
                        />
                        <span>{item.name}</span>
                      </td>
                      <td>£{item.price}</td>
                      <td>{item.category?.name}</td>
                      <td className="actions">
                        <button onClick={() => handleEditItem(item)}>
                          <svg width="16" height="16" fill="blue" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)}>
                          <svg width="16" height="16" fill="red" viewBox="0 0 24 24"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-4.5l-1-1z" /></svg>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MasterData;
