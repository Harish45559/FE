import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { DateTime } from 'luxon';
import './BillingCounter.css';

const BillingCounter = () => {
  const printRef = useRef();
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vegFilter, setVegFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [serverName] = useState('Cozy_Cup');
  const [orderType, setOrderType] = useState('Eat In');
  const [customerName, setCustomerName] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [nextTempOrderNumber, setNextTempOrderNumber] = useState(null);
  const [orderDate, setOrderDate] = useState(null); // ✅ UK formatted string

  useEffect(() => {
    fetchMenu();
    fetchCategories();
    fetchLastOrderNumber();

    const resumed = localStorage.getItem('resumedOrder');
    if (resumed) {
      const order = JSON.parse(resumed);
      setCustomerName(order.customer);
      setOrderType(order.orderType);
      setSelectedItems(order.items);
      localStorage.removeItem('resumedOrder');
    }
  }, []);

  const fetchMenu = async () => {
    const res = await api.get('/menu');
    const normalized = res.data.map(item => ({
      ...item,
      veg: item.veg === true || item.veg === 'true' || item.veg === 1 || String(item.veg).toLowerCase() === 'true',
      category: typeof item.category === 'object' ? item.category.name : item.category
    }));
    setMenuItems(normalized);
  };

  const fetchCategories = async () => {
    const res = await api.get('/categories');
    setCategories(res.data.map(c => c.name));
  };

  const fetchLastOrderNumber = async () => {
    try {
      const res = await api.get('/orders/all');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const maxOrder = Math.max(...res.data.map(o => o.order_number || 1000));
        setNextTempOrderNumber(maxOrder + 1);
      } else {
        setNextTempOrderNumber(1001);
      }
    } catch (err) {
      console.error('Failed to fetch last order:', err);
      setNextTempOrderNumber(1001);
    }
  };

  const clearCurrentOrder = () => {
    setSelectedItems([]);
    setCustomerName('');
  };

  const handleAddItem = (item) => {
    const index = selectedItems.findIndex(i => i.id === item.id);
    if (index !== -1) {
      const updated = [...selectedItems];
      updated[index].qty += 1;
      updated[index].total = updated[index].qty * updated[index].price;
      setSelectedItems(updated);
    } else {
      setSelectedItems([...selectedItems, { ...item, qty: 1, total: item.price }]);
    }
  };

  const handleRemoveItem = (index) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  const getTotal = () => selectedItems.reduce((sum, i) => sum + i.total, 0);
  const getIncludedTax = () => getTotal() * (5 / 105);
  const getIncludedService = () => getTotal() * (5 / 105);
  const getDateTime = () => DateTime.now().setZone('Europe/London').toFormat('dd/MM/yyyy HH:mm:ss');

  const startNewOrder = () => {
    setSelectedItems([]);
    setCustomerName('');
    setOrderNumber(null);
    setShowReceipt(false);
    setOrderDate(null);
    fetchLastOrderNumber();
  };

  const handlePlaceOrder = async () => {
    if (selectedItems.length === 0) return alert('Add items first.');

    const payload = {
      customer_name: customerName,
      server_name: serverName,
      order_type: orderType,
      items: selectedItems.map(item => ({
        name: item.name,
        price: item.price,
        qty: item.qty,
        total: item.total
      })),
      total_amount: getTotal(),
      payment_method: paymentMethod,
      created_at: DateTime.now().toUTC().toISO(), // UTC for DB
      date: getDateTime(), // UK time for display
    };

    try {
      const res = await api.post('/orders', payload);
      setOrderNumber(res.data.order.order_number);
      setOrderDate(res.data.order.date); // ✅ Set UK time string
      setShowReceipt(true);
    } catch (err) {
      console.error('Order placement failed:', err);
      alert('Failed to place order');
    }
  };

  const holdCurrentOrder = () => {
    if (selectedItems.length === 0) return alert('No items to hold');
    const existing = JSON.parse(localStorage.getItem('heldOrders')) || [];
    const nextDisplayNumber = existing.length
      ? Math.max(...existing.map(o => parseInt(o.displayNumber?.replace('H', '') || 0))) + 1
      : 1001;

    const heldOrder = {
      id: Date.now(),
      customer: customerName,
      server: serverName,
      orderType,
      items: selectedItems,
      date: getDateTime(),
      displayNumber: `H${nextDisplayNumber}`
    };

    existing.push(heldOrder);
    localStorage.setItem('heldOrders', JSON.stringify(existing));
    startNewOrder();
  };

  return (
    <DashboardLayout>
      <>
        <div className="billing-wrapper">
          <div className="menu-left">
            <div className="billing-header">
              <h2>Billing Counter</h2>
              <div className="order-type-selector">
                <label><strong>Order Type:</strong></label>
                <select value={orderType} onChange={e => setOrderType(e.target.value)}>
                  <option value="Eat In">Eat In</option>
                  <option value="Take Away">Take Away</option>
                </select>
              </div>
              <div className="filters">
                <button onClick={() => setCategoryFilter('all')} className={categoryFilter === 'all' ? 'active' : ''}>All</button>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setCategoryFilter(cat)} className={categoryFilter === cat ? 'active' : ''}>{cat}</button>
                ))}
                <select value={vegFilter} onChange={e => setVegFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="veg">Veg</option>
                  <option value="nonveg">Non-Veg</option>
                </select>
              </div>
            </div>

            <div className="menu-grid">
              {menuItems.filter(item =>
                (categoryFilter === 'all' || item.category === categoryFilter) &&
                (
                  vegFilter === 'all' ||
                  (vegFilter === 'veg' && item.veg) ||
                  (vegFilter === 'nonveg' && !item.veg)
                )
              ).map(item => (
                <div key={item.id} className="menu-card" onClick={() => handleAddItem(item)}>
                  <h4>{item.name}</h4>
                  <p>£{item.price}</p>
                  <div className="veg-status">
                    <span className={`dot ${item.veg ? 'veg' : 'non-veg'}`}></span>
                    <span>{item.veg ? 'Veg' : 'Non-Veg'}</span>
                  </div>
                  <small className="category-label">{item.category}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="summary-right">
            <div className="order-panel">
              <h3 className="order-title">
                Current Order{' '}
                {(orderNumber || nextTempOrderNumber) && (
                  <span style={{ fontSize: '14px', color: '#888' }}>
                    # {orderNumber || nextTempOrderNumber}
                  </span>
                )}
              </h3>

              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />

              <div className="order-items">
                {selectedItems.map((item, index) => (
                  <div key={index} className="order-item">
                    <div className="item-info">
                      <span>{item.name} £{item.price}</span>
                    </div>
                    <div className="item-controls">
                      <button onClick={() => {
                        const updated = [...selectedItems];
                        if (updated[index].qty > 1) {
                          updated[index].qty -= 1;
                          updated[index].total = updated[index].qty * updated[index].price;
                          setSelectedItems(updated);
                        }
                      }}>➖</button>
                      <span>{item.qty}</span>
                      <button onClick={() => {
                        const updated = [...selectedItems];
                        updated[index].qty += 1;
                        updated[index].total = updated[index].qty * updated[index].price;
                        setSelectedItems(updated);
                      }}>➕</button>
                      <button className="item-remove" onClick={() => handleRemoveItem(index)}>✖</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-summary">
                <div className="line"><span>Subtotal</span><span>£{getTotal().toFixed(2)}</span></div>
                <div className="line"><span>VAT (5%)</span><span>£{getIncludedTax().toFixed(2)}</span></div>
                <div className="line"><span>Service (5%)</span><span>£{getIncludedService().toFixed(2)}</span></div>
                <div className="line total"><strong>Total</strong><strong>£{getTotal().toFixed(2)}</strong></div>
              </div>

              <div className="order-buttons">
                <div className="order-row">
                  <button className="order-btn btn-clear" onClick={clearCurrentOrder}>❌</button>
                  <button className="order-btn btn-hold" onClick={holdCurrentOrder}>⏱ Hold Order</button>
                  <button className="order-btn btn-place" onClick={handlePlaceOrder}>✅ Place Order</button>
                </div>
                <div className="payment-row">
                  <button className="order-btn btn-cash" onClick={() => setPaymentMethod('Cash')}>💵 Cash</button>
                  <button className="order-btn btn-card" onClick={() => setPaymentMethod('Card')}>💳 Card</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showReceipt && (
          <div className="receipt-overlay">
            <div className="bill-section" ref={printRef}>
            <div className="receipt-header-actions">
  <button className="print-btn" onClick={() => window.print()}>
    🖨️
  </button>
  <button className="close-preview-btn" onClick={startNewOrder}>
    ✖
  </button>
</div>

              {/* Header */}
              <div className="receipt-header">
                <h2>Cozy Cup</h2>
                <p>Food Truck Lane, Flavor Town</p>
                <p>Phone: +91-9876543210</p>
                <p>www.cozycup.example.com</p>
                <p>Order Type: {orderType}</p>
                <p><strong>Customer:</strong> {customerName || 'N/A'}</p>
                <p><strong>Order No:</strong> #{orderNumber || '—'}</p>
                <p><strong>Paid By:</strong> {paymentMethod}</p>
                <hr />
                <p>Date: {orderDate || '—'}</p>
                <hr />
              </div>

              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td style={{ textAlign: 'right' }}>£{item.price.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{item.qty}</td>
                      <td style={{ textAlign: 'right' }}>£{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="receipt-summary">
                <p><strong>Total Qty:</strong> {selectedItems.reduce((sum, item) => sum + item.qty, 0)}</p>
                <p><strong>Sub Total:</strong> £ {getTotal().toFixed(2)}</p>
                <p><strong>Paid By:</strong> {paymentMethod}</p>
                <p className="includes-label">Includes:</p>
                <p>VAT (5%): £{getIncludedTax().toFixed(2)}</p>
                <p>Service Charge (5%): £{getIncludedService().toFixed(2)}</p>
                <hr />
                <p className="grand-total"><strong>Grand Total:</strong> £ {getTotal().toFixed(2)}</p>
                <p className="server-name">Staff: {serverName}</p>
                <hr />
              </div>
            </div>
          </div>
        )}
      </>
    </DashboardLayout>
  );
};

export default BillingCounter;
