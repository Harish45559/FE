import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../services/api';
import { DateTime } from 'luxon';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import './EndOfDaySales.css';

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

const EndOfDaySales = () => {
  const [tab, setTab] = useState('summary');
  const [summary, setSummary] = useState({ totalSales: 0, cashSales: 0, cardSales: 0 });
  const [topItems, setTopItems] = useState([]);
  const [orders, setOrders] = useState([]);

  const [filterMode, setFilterMode] = useState('today'); // today | weekly | monthly | custom
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // all | Cash | Card

  // NEW: chart type toggle for Daily Sales
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line'

  const todayISO = DateTime.now().toISODate();

  const activeRange = useMemo(() => {
    if (filterMode === 'today') return { from: todayISO, to: todayISO };
    if (filterMode === 'weekly') return { from: DateTime.now().minus({ days: 6 }).toISODate(), to: todayISO };
    if (filterMode === 'monthly') return { from: DateTime.now().startOf('month').toISODate(), to: todayISO };
    if (filterMode === 'custom' && fromDate && toDate) return { from: fromDate, to: toDate };
    return { from: todayISO, to: todayISO };
  }, [filterMode, fromDate, toDate, todayISO]);

  useEffect(() => {
    const load = async () => {
      try {
        const params = { fromDate: activeRange.from, toDate: activeRange.to };
        const [s, t, o] = await Promise.all([
          api.get('/sales/summary', { params }),
          api.get('/sales/topselling', { params }),
          api.get('/sales/totalsales', { params }),
        ]);
        setSummary({
          totalSales: Number(s.data?.totalSales ?? 0),
          cashSales: Number(s.data?.cashSales ?? 0),
          cardSales: Number(s.data?.cardSales ?? 0),
        });
        setTopItems(Array.isArray(t.data) ? t.data : []);
        setOrders(Array.isArray(o.data) ? o.data : []);
      } catch (e) {
        console.error('Failed to fetch sales data:', e);
        setSummary({ totalSales: 0, cashSales: 0, cardSales: 0 });
        setTopItems([]);
        setOrders([]);
      }
    };
    load();
  }, [activeRange]);

  const filteredOrders = useMemo(() => {
    if (paymentFilter === 'all') return orders;
    return orders.filter((o) => o.payment_method === paymentFilter);
  }, [orders, paymentFilter]);

  const headerDateLabel = useMemo(() => {
    const { from, to } = activeRange;
    return from === to
      ? `(${DateTime.fromISO(from).toFormat('dd LLL yyyy')})`
      : `(${DateTime.fromISO(from).toFormat('dd LLL yyyy')} – ${DateTime.fromISO(to).toFormat('dd LLL yyyy')})`;
  }, [activeRange]);

  const applyCustom = () => {
    if (!fromDate || !toDate) return;
    setFilterMode('custom');
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setPaymentFilter('all');
    setFilterMode('today');
    setTab('summary');
  };

  
  const dailySeries = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      const iso = o.created_at || o.date || o.createdAt;
      if (!iso) continue;
      const day = DateTime.fromISO(iso).toISODate(); 
      const amt = Number(o.final_amount ?? o.total_amount ?? o.amount ?? 0);
      map.set(day, (map.get(day) || 0) + (isNaN(amt) ? 0 : amt));
    }

   
    const entries = Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    
    if (entries.length === 0) {
      const { from, to } = activeRange;
      const start = DateTime.fromISO(from);
      const end = DateTime.fromISO(to);
      const days = [];
      for (let d = start; d <= end; d = d.plus({ days: 1 })) {
        days.push([d.toISODate(), 0]);
      }
      return {
        labels: days.map(([d]) => DateTime.fromISO(d).toFormat('dd LLL')),
        data: days.map(([, v]) => v),
      };
    }

    return {
      labels: entries.map(([d]) => DateTime.fromISO(d).toFormat('dd LLL')),
      data: entries.map(([, v]) => v),
    };
  }, [orders, activeRange]);

  // ChartJS common options (currency formatting)
  const moneyTick = (value) => `£${Number(value).toFixed(0)}`;
  const commonOpts = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `£${Number(ctx.parsed.y ?? ctx.parsed).toFixed(2)}` } } },
    scales: { y: { ticks: { callback: moneyTick } } },
  };

  // Data for Sales Split pie (Cash vs Card)
  const pieData = {
    labels: ['Cash', 'Card'],
    datasets: [{ data: [summary.cashSales || 0, summary.cardSales || 0] }],
  };

  // Data for Daily Sales (bar/line)
  const dailyData = {
    labels: dailySeries.labels,
    datasets: [
      {
        label: 'Daily Sales (£)',
        data: dailySeries.data,
        tension: 0.35, // nice curve for line
      },
    ],
  };

  return (
    <DashboardLayout>
      <div className="eods-container">
        <div className="page-header">
          <h1 className="page-title">End of Day Sales {headerDateLabel}</h1>

          <div className="filters-row">
            {/* Quick presets */}
            <div className="quick-filters">
              <button className={`chip ${filterMode === 'today' ? 'active' : ''}`} onClick={() => setFilterMode('today')}>
                Today
              </button>
              <button className={`chip ${filterMode === 'weekly' ? 'active' : ''}`} onClick={() => setFilterMode('weekly')}>
                Last 7 Days
              </button>
              <button className={`chip ${filterMode === 'monthly' ? 'active' : ''}`} onClick={() => setFilterMode('monthly')}>
                This Month
              </button>
            </div>

            {/* Custom range */}
            <div className="custom-range">
              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <span className="to-sep">to</span>
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button className="filter-btn" onClick={applyCustom} disabled={!fromDate || !toDate}>
                Apply
              </button>
              <button className="filter-btn reset" onClick={resetFilters}>
                Reset
              </button>
            </div>

            {/* Payment filter (orders table only) */}
            <div className="payment-filter">
              <label className="pf-label">Payment:</label>
              <select className="date-input" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          <button onClick={() => setTab('summary')} className={tab === 'summary' ? 'tab-btn active' : 'tab-btn'}>
            Summary
          </button>
          <button onClick={() => setTab('top')} className={tab === 'top' ? 'tab-btn active' : 'tab-btn'}>
            Top Selling Items
          </button>
          <button onClick={() => setTab('graphs')} className={tab === 'graphs' ? 'tab-btn active' : 'tab-btn'}>
            Graphs
          </button>
          <button onClick={() => setTab('total')} className={tab === 'total' ? 'tab-btn active' : 'tab-btn'}>
            Orders
          </button>
        </div>

        {/* Summary */}
        {tab === 'summary' && (
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-title">Total Sales</div>
              <div className="summary-value">£{summary.totalSales.toFixed(2)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-title">Cash Sales</div>
              <div className="summary-value">£{summary.cashSales.toFixed(2)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-title">Card Sales</div>
              <div className="summary-value">£{summary.cardSales.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Top Selling Items */}
        {tab === 'top' && (
          <div className="overflow-x-auto">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Qty Sold</th>
                </tr>
              </thead>
              <tbody>
                {topItems.length ? (
                  topItems.map((it, i) => (
                    <tr key={it.name + i}>
                      <td>{i + 1}</td>
                      <td>{it.name}</td>
                      <td>{it.quantity ?? 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3">No items for this range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Graphs */}
        {tab === 'graphs' && (
          <div className="charts-grid">
            <div className="chart-card">
              <h3 className="card-title">Sales Split (Cash vs Card)</h3>
              <Pie data={pieData} />
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3 className="card-title">Daily Sales</h3>
                <div className="chart-toggle" role="tablist" aria-label="Chart type">
                  <button
                    className={chartType === 'bar' ? 'ctab active' : 'ctab'}
                    onClick={() => setChartType('bar')}
                    role="tab"
                    aria-selected={chartType === 'bar'}
                  >
                    Bar
                  </button>
                  <button
                    className={chartType === 'line' ? 'ctab active' : 'ctab'}
                    onClick={() => setChartType('line')}
                    role="tab"
                    aria-selected={chartType === 'line'}
                  >
                    Line
                  </button>
                </div>
              </div>

              <div className="chart-body">
                {chartType === 'bar' ? (
                  <Bar data={dailyData} options={commonOpts} />
                ) : (
                  <Line data={dailyData} options={commonOpts} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orders */}
        {tab === 'total' && (
          <div className="overflow-x-auto">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Total (£)</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length ? (
                  filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td>{o.display_number || o.order_number || o.id}</td>
                      <td>{o.created_at ? DateTime.fromISO(o.created_at).toFormat('dd/MM/yyyy HH:mm') : '-'}</td>
                      <td>{o.customer_name || '-'}</td>
                      <td>£{Number(o.final_amount ?? o.total_amount ?? 0).toFixed(2)}</td>
                      <td>{o.payment_method || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">No orders for this range.</td>
                  </tr>
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
