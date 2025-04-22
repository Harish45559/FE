import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../services/api';
import { DateTime } from 'luxon';
import DashboardLayout from '../components/DashboardLayout';
import { saveAs } from 'file-saver';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import './EndOfDaySales.css';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const EndOfDaySales = () => {
  const [tab, setTab] = useState('summary');
  const [sales, setSales] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [orderType, setOrderType] = useState('All');
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [category, setCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [categories, setCategories] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [tillCash, setTillCash] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchSales = useCallback(async () => {
    try {
      const res = await api.get('/sales/report', {
        params: { from, to, search, orderType, category, item: selectedItem, paymentMethod }
      });
      setSales(res.data.sales || []);
    } catch (err) {
      console.error('Error fetching sales:', err);
    }
  }, [from, to, search, orderType, category, selectedItem, paymentMethod]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Category load error:', err);
    }
  };

  const fetchTopItems = async () => {
    try {
      const res = await api.get('/sales/top-items');
      setTopItems(res.data);
    } catch (err) {
      console.error('Top items error:', err);
    }
  };

  const fetchTillCash = async () => {
    try {
      const res = await api.get(`/sales/till-cash`, { params: { from, to } });
      setTillCash(res.data.totalCash);
    } catch (err) {
      console.error('Till cash fetch error:', err);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchCategories();
    fetchTopItems();
    fetchTillCash();
  }, [fetchSales]);

  const handleExportCSV = () => {
    const csvContent = [
      ['Date', 'Order #', 'Customer', 'Type', 'Total'],
      ...sales.map(order => [
        DateTime.fromISO(order.created_at).setZone('Europe/London').toFormat('dd/MM/yyyy'),
        order.order_number,
        order.customer_name,
        order.order_type,
        `£${parseFloat(order.total_amount || 0).toFixed(2)}`
      ])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'sales_report.csv');
  };

  const handleClearFilters = () => {
    setFrom('');
    setTo('');
    setSearch('');
    setSelectedItem('');
    setCategory('');
    setOrderType('All');
    setPaymentMethod('All');
    setCurrentPage(1);
    fetchSales();
  };

  const totalSales = sales.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const totalVAT = totalSales * 0.05;
  const totalService = totalSales * 0.05;

  const revenueData = useMemo(() => ({
    labels: ['Sales', 'VAT', 'Service Charges'],
    datasets: [{
      label: 'Amount (£)',
      data: [totalSales, totalVAT, totalService],
      backgroundColor: ['#4CAF50', '#2196F3', '#FFC107'],
    }],
  }), [totalSales, totalVAT, totalService]);

  return (
    <DashboardLayout>
      <div className="sales-wrapper">
        <h2>End of Day Sales Report</h2>

        <div className="tabs">
          <button className={tab === 'summary' ? 'active' : ''} onClick={() => setTab('summary')}>Summary</button>
          <button className={tab === 'top' ? 'active' : ''} onClick={() => setTab('top')}>Top Selling Items</button>
          <button className={tab === 'chart' ? 'active' : ''} onClick={() => setTab('chart')}>Revenue Charts</button>
          <button className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')}>Total Sales</button>
          <button className={tab === 'till' ? 'active' : ''} onClick={() => setTab('till')}>💰 Till Cash Summary</button>
        </div>

        <div className="filters">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
            <option value="All">All</option>
            <option value="Eat In">Eat In</option>
            <option value="Take Away">Take Away</option>
          </select>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="All">All Payments</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
          </select>
          <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)}>
            <option value="">All Items</option>
          </select>
          <button onClick={fetchSales}>Apply</button>
          <button onClick={handleExportCSV}>Export CSV</button>
          <button onClick={handleClearFilters}>Clear</button>
        </div>

        {tab === 'summary' && (
          <div className="summary">
            <p><strong>Total Sales:</strong> £{totalSales.toFixed(2)}</p>
            <p><strong>VAT (5%):</strong> £{totalVAT.toFixed(2)}</p>
            <p><strong>Service Charges (5%):</strong> £{totalService.toFixed(2)}</p>
          </div>
        )}

        {tab === 'top' && (
          <div className="top-items">
            <h3>Top Selling Items</h3>
            <ul>
              {topItems.map(item => (
                <li key={item.name}>{item.name} – {item.total_sold} sold</li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'chart' && (
          <div className="chart-section">
            <div className="chart-wrapper"><Bar data={revenueData} /></div>
            <div className="chart-wrapper"><Pie data={revenueData} /></div>
          </div>
        )}

        {tab === 'table' && (
          <div className="sales-table-wrapper">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Order Type</th>
                  <th>Pay By</th>
                  <th>Total (£)</th>
                </tr>
              </thead>
              <tbody>
                {sales
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map(order => (
                    <tr key={order.id}>
                      <td>{DateTime.fromISO(order.created_at).setZone('Europe/London').toFormat('dd/MM/yyyy')}</td>
                      <td>{order.order_number}</td>
                      <td>{order.customer_name}</td>
                      <td>{order.order_type}</td>
                      <td>{order.payment_method}</td>
                      <td>£{parseFloat(order.total_amount).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="pagination-controls">
              {Array.from({ length: Math.ceil(sales.length / itemsPerPage) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={currentPage === i + 1 ? 'active' : ''}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'till' && (
          <div className="till-cash-tab">
            <div className="till-tab-content">
              <p><strong>Opening Cash:</strong> £100.00</p>
              <p><strong>Cash Sales:</strong> £{tillCash.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EndOfDaySales;
