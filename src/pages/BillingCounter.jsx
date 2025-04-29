import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { DateTime } from 'luxon';
import './BillingCounter.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import imageMapping from "./imageMapping";


const BillingCounter = () => {
  const printRef = useRef();
  const user = JSON.parse(localStorage.getItem('user'));
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vegFilter, setVegFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [serverName] = useState(user?.first_name || user?.username || 'Cozy_Cup');
  const [orderType, setOrderType] = useState('Eat In');
  const [customerName, setCustomerName] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [nextTempOrderNumber, setNextTempOrderNumber] = useState(null);
  const [orderDate, setOrderDate] = useState(null);
  const [isTillOpen, setIsTillOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [tillActionType, setTillActionType] = useState(null);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [tillOpenedBy, setTillOpenedBy] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [userRole, setUserRole] = useState('');

  

  useEffect(() => {
    const storedTillStatus = localStorage.getItem('isTillOpen');
    if (storedTillStatus === 'true') {
      setIsTillOpen(true);
    }
  
    const storedTillUser = localStorage.getItem('tillOpenedBy');
    if (storedTillUser) {
      setTillOpenedBy(storedTillUser);
    }

    const storedRole = localStorage.getItem('userRole');
if (storedRole) setUserRole(storedRole);

  
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
    setDiscountPercent(0); // 🔁 Reset discount input
  };
  

  {isTillOpen && tillOpenedBy && (
    <div className="till-user">
      🧑‍💼 Opened by: <strong>{tillOpenedBy}</strong>
    </div>
  )}
  


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
  
  // 💸 Discount Calculations
  const getDiscountAmount = () => (getTotal() * discountPercent) / 100;
  const getGrandTotal = () => getTotal() - getDiscountAmount();
  
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
      discount_percent: discountPercent,
      discount_amount: getDiscountAmount(),
      final_amount: getGrandTotal(),
      payment_method: paymentMethod,
      created_at: DateTime.now().toUTC().toISO(),
      date: getDateTime()
    };

    try {
      const res = await api.post('/orders', payload);
      setOrderNumber(res.data.order.order_number);
      setOrderDate(res.data.order.date);
      setShowReceipt(true);
    } catch (err) {
      console.error('Order placement failed:', err);
      alert('Failed to place order');
    }
  };

  const holdCurrentOrder = () => {
    if (selectedItems.length === 0) return alert('No items to hold');
    const existing = JSON.parse(localStorage.getItem('heldOrders')) || [];
    const nextDisplayNumber = existing.length ? Math.max(...existing.map(o => parseInt(o.displayNumber?.replace('H', '') || 0))) + 1 : 1001;
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

  const confirmTillAction = async () => {
    try {
      const res = await api.post('/auth/login', {
        username: authUsername,
        password: authPassword
      });
      if (res.status === 200 && res.data.token) {
        const role = res.data.role || 'staff';
        setUserRole(role);
        localStorage.setItem('userRole', role);

        if (tillActionType === 'open') {
          setIsTillOpen(true);
          localStorage.setItem('isTillOpen', 'true');
          setTillOpenedBy(authUsername);
          localStorage.setItem('tillOpenedBy', authUsername);
        } else {
          setIsTillOpen(false);
          localStorage.setItem('isTillOpen', 'false');
          toast.info('Till closed.');
          setTillOpenedBy('');
          localStorage.removeItem('tillOpenedBy');

        }
        setShowAuthModal(false);
        setAuthUsername('');
        setAuthPassword('');
      } else {
        toast.error('Invalid credentials');
      }
    } catch (err) {
      console.error('Order placement failed:', err);
      alert('Failed to place order');
    }
    
  };

  


  return (
    <DashboardLayout>

            {/* Auth Modal */}
            {showAuthModal && (
        <div className="auth-modal-overlay">
          <div className="auth-modal">
            <h3>{tillActionType === 'open' ? 'Open Till' : 'Close Till'} - Authentication</h3>
            <input type="text" placeholder="Username" value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} />
            <input type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
            <div className="auth-buttons">
              <button onClick={confirmTillAction}>✅ Confirm</button>
              <button onClick={() => setShowAuthModal(false)}>✖ Cancel</button>
            </div>
          </div>
        </div>
      )}
      <>
        <div className="billing-wrapper">
          <div className="menu-left">
            <div className="billing-header">
              <h2>Billing Counter</h2>
             
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


              <div className="menu-search-bar"> 
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="menu-grid">
  {menuItems.filter(item =>
    (categoryFilter === 'all' || item.category === categoryFilter) &&
    (
      vegFilter === 'all' ||
      (vegFilter === 'veg' && item.veg) ||
      (vegFilter === 'nonveg' && !item.veg)
    ) &&
    (item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  ).map(item => (
    <div key={item.id} className="menu-card" onClick={() => handleAddItem(item)}>
      <img 
        src={imageMapping[item.name] || "/images/default-food.jpg"} 
        alt={item.name} 
        className="menu-item-image" 
      />
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

            {isTillOpen && tillOpenedBy && (
              <div className="till-user">
                🧑‍💼 Opened by: <strong>{tillOpenedBy}</strong>
              </div>
            )}

            <div className="order-panel">       
              <h3 className="order-title">
                Current Order{' '}
                {(orderNumber || nextTempOrderNumber) && (
                  <span style={{ fontSize: '14px', color: '#888' }}>
                    # {orderNumber || nextTempOrderNumber}
                  </span>
                )}

                  {isTillOpen ? (
                    <div className="till-banner open">
                      🟢 Till is Open
                    </div>
                  ) : (
                    <div className="till-banner closed">
                      🔴 Till is Closed
                    </div>
                  )}




                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button
  onClick={() => {
    setTillActionType('open');
    setShowAuthModal(true);
  }}
  className="order-btn"
  style={{ backgroundColor: '#10b981', color: '#fff' }}
>
  🟢 Open Till
</button>

<button
  onClick={() => {
    setTillActionType('close');
    setShowAuthModal(true);
  }}
  className="order-btn"
  style={{ backgroundColor: '#ef4444', color: '#fff' }}
>
  🔴 Close Till
</button>

                </div>


                <div className="order-type-selector">
                <label><strong>Order Type:</strong></label>
                <select value={orderType} onChange={e => setOrderType(e.target.value)}>
                  <option value="Eat In">Eat In</option>
                  <option value="Take Away">Take Away</option>
                </select>
                </div>
              </h3>

              <input
  type="text"
  placeholder="Customer Name"
  value={customerName}
  onChange={e => setCustomerName(e.target.value)}
  style={{
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    backgroundColor: '#f9f9f9',
    marginBottom: '12px'
  }}
/>


              <div className="order-items">
                {selectedItems.map((item, index) => (
                  <div key={index} className="order-item">
                    <div className="item-info">
  <span><strong>{index + 1}.</strong> {item.name} £{item.price}</span>
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

  {discountPercent > 0 && (
    <div className="line">
      <span>Discount ({discountPercent}%)</span>
      <span>-£{getDiscountAmount().toFixed(2)}</span>
    </div>
  )}

  <div className="line total"><strong>Total</strong><strong>£{getGrandTotal().toFixed(2)}</strong></div>
</div>

              <div className="order-buttons">
              <div className="order-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
  {isTillOpen && userRole === 'admin' && (
    <>
      <input
        type="number"
        value={discountPercent === 0 ? '' : discountPercent}
        onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
        placeholder="0–100%"
        className="discount-input"
      />
      <button className="action-btn btn-apply" onClick={() => toast.success(`Discount ${discountPercent}% applied`)}>
        🎁 Apply
      </button>
    </>
  )}
  <button className="action-btn btn-place" onClick={handlePlaceOrder} disabled={!isTillOpen}>
    ✅ Place Order
  </button>
  <button className="action-btn btn-hold" onClick={holdCurrentOrder} disabled={!isTillOpen}>
    ⏱ Hold Order
  </button>
  <button className="action-btn btn-clear" onClick={clearCurrentOrder} disabled={!isTillOpen}>
    ❌
  </button>
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
            <div className="receipt-header-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
  <button className="print-btn" onClick={() => window.print()} style={{ alignSelf: 'flex-start' }}>
    🖨️ print
  </button>
  <button className="close-preview-btn" onClick={startNewOrder} style={{ alignSelf: 'flex-end' }}>
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
                {discountPercent > 0 && (
  <p><strong>Discount ({discountPercent}%):</strong> -£{getDiscountAmount().toFixed(2)}</p>
)}
<p className="grand-total"><strong>Grand Total:</strong> £ {getGrandTotal().toFixed(2)}</p>

                <p className="server-name">Staff:{tillOpenedBy && `(${tillOpenedBy})`}
</p>

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