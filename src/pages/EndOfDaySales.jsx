import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../services/api';
import { DateTime } from 'luxon';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import './EndOfDaySales.css'; 

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const EndOfDaySales = () => {
  const [tab, setTab] = useState('summary');
  const [summary, setSummary] = useState({});
  const [topItems, setTopItems] = useState([]);
  const [totalOrders, setTotalOrders] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterMode, setFilterMode] = useState('today');

  const today = DateTime.now().toISODate();

  useEffect(() => {
    fetchData();
  }, [filterMode]);

  const fetchData = async () => {
    try {
      let from = '', to = '';
      if (filterMode === 'today') {
        from = today;
        to = today;
      } else if (filterMode === 'weekly') {
        from = DateTime.now().minus({ days: 6 }).toISODate();
        to = today;
      } else if (filterMode === 'monthly') {
        from = DateTime.now().startOf('month').toISODate();
        to = today;
      }

      const [summaryRes, topItemsRes, totalSalesRes] = await Promise.all([
        api.get(`/sales/summary?fromDate=${from}&toDate=${to}`),
        api.get('/sales/topselling'),
        api.get(`/sales/totalsales?fromDate=${from}&toDate=${to}`)
      ]);

      setSummary(summaryRes.data);
      setTopItems(topItemsRes.data);
      setTotalOrders(totalSalesRes.data);
    } catch (err) {
      console.error('Failed to fetch sales data', err);
    }
  };

  const handleApplyFilter = async () => {
    try {
      const [summaryRes, topItemsRes, totalSalesRes] = await Promise.all([
        api.get(`/sales/summary?fromDate=${fromDate}&toDate=${toDate}`),
        api.get('/sales/topselling'),
        api.get(`/sales/totalsales?fromDate=${fromDate}&toDate=${toDate}`)
      ]);

      setSummary(summaryRes.data);
      setTopItems(topItemsRes.data);
      setTotalOrders(totalSalesRes.data);
    } catch (err) {
      console.error('Failed to apply filter', err);
    }
  };

  return (
    <DashboardLayout>
      <div className="eods-container">
        <h1 className="page-title">End of Day Sales Report</h1>

        {/* Filters */}
        <div className="filters-bar">
          <button onClick={() => setFilterMode('today')} className="filter-btn">Today</button>
          <button onClick={() => setFilterMode('weekly')} className="filter-btn">Weekly</button>
          <button onClick={() => setFilterMode('monthly')} className="filter-btn">Monthly</button>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="date-input" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="date-input" />
          <button onClick={handleApplyFilter} className="filter-btn">Apply</button>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          <button onClick={() => setTab('summary')} className={tab === 'summary' ? 'tab-btn active' : 'tab-btn'}>Summary</button>
          <button onClick={() => setTab('top')} className={tab === 'top' ? 'tab-btn active' : 'tab-btn'}>Top Selling Items</button>
          <button onClick={() => setTab('graphs')} className={tab === 'graphs' ? 'tab-btn active' : 'tab-btn'}>Graphs</button>
          <button onClick={() => setTab('total')} className={tab === 'total' ? 'tab-btn active' : 'tab-btn'}>Total Sales</button>
        </div>

        {/* Tab content */}
        {tab === 'summary' && (
          <div className="summary-grid">
            <div className="summary-card">Total Sales: £{summary.totalSales?.toFixed(2) || 0}</div>
            <div className="summary-card">Cash Sales: £{summary.cashSales?.toFixed(2) || 0}</div>
            <div className="summary-card">Card Sales: £{summary.cardSales?.toFixed(2) || 0}</div>
          </div>
        )}

        {tab === 'top' && (
          <div className="overflow-x-auto">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity Sold</th>
                </tr>
              </thead>
              <tbody>
                {topItems.length > 0 ? (
                  topItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="2">No top items found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'graphs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-2">Sales Split (Cash vs Card)</h3>
              <Pie
                data={{
                  labels: ['Cash', 'Card'],
                  datasets: [{
                    data: [summary.cashSales || 0, summary.cardSales || 0],
                    backgroundColor: ['#34d399', '#60a5fa']
                  }],
                }}
              />
            </div>
            <div>
              <h3 className="font-bold mb-2">Sales Summary (Bar)</h3>
              <Bar
                data={{
                  labels: ['Total Sales', 'Cash Sales', 'Card Sales'],
                  datasets: [{
                    label: '£ Amount',
                    backgroundColor: '#fb923c',
                    data: [summary.totalSales || 0, summary.cashSales || 0, summary.cardSales || 0]
                  }],
                }}
              />
            </div>
          </div>
        )}

        {tab === 'total' && (
          <div className="overflow-x-auto">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Total Amount (£)</th>
                  <th>Payment Method</th>
                </tr>
              </thead>
              <tbody>
                {totalOrders.length > 0 ? (
                  totalOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.display_number || order.id}</td>
                      <td>{DateTime.fromISO(order.created_at).toFormat('dd/MM/yyyy')}</td>
                      <td>{order.customer_name || '-'}</td>
                      <td>£{order.total_amount.toFixed(2)}</td>
                      <td>{order.payment_method}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5">No sales found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EndOfDaySales;
