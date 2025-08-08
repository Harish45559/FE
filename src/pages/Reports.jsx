// src/pages/Reports.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../services/api';
import './Reports.css';

/** ---------- Helpers ---------- **/

// Parse "dd-MM-yyyy" -> timestamp (for sorting)
function parseDDMMYYYY(str) {
  if (!str || typeof str !== 'string') return 0;
  const [dd, mm, yyyy] = str.split('-').map(Number);
  if (!yyyy || !mm || !dd) return 0;
  return new Date(yyyy, mm - 1, dd, 0, 0, 0, 0).getTime();
}

// "HH:MM" -> minutes
function toMinutesFromHColonM(val) {
  if (!val || typeof val !== 'string' || !val.includes(':')) return null;
  const [h, m] = val.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// "7h 30m" (or "8h" / "30m") -> minutes
function toMinutesFromHSpaceM(val) {
  if (!val || typeof val !== 'string') return null;
  // Matches "7h 30m", "7h", "30m" (case-insensitive, spaces optional)
  const hMatch = /(\d+)\s*h/i.exec(val);
  const mMatch = /(\d+)\s*m/i.exec(val);
  const h = hMatch ? Number(hMatch[1]) : 0;
  const m = mMatch ? Number(mMatch[1]) : 0;
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Try both formats; fall back to 0
function toMinutesFlexible(val) {
  return (
    toMinutesFromHColonM(val) ??
    toMinutesFromHSpaceM(val) ??
    0
  );
}

const ITEMS_PER_PAGE = 10;

const Reports = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [reports, setReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Default sort by "date" because API returns date separately
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  // Load employees once
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/employees');
        setEmployees(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load employees:', err);
      }
    };
    fetchEmployees();
  }, []);

  // Initial reports load
  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch reports with current filters
  const fetchReports = async () => {
    try {
      const res = await api.get('/reports', {
        params: {
          employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
          from: fromDate ? fromDate.toISOString() : undefined,
          to: toDate ? toDate.toISOString() : undefined,
        },
      });
      // Defensive: ensure array
      const incoming = Array.isArray(res.data) ? res.data : [];
      setReports(sortData(incoming)); // keep current sort applied
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  // Sort with robust handlers for date + durations
  const sortData = (data) => {
    const arr = [...data]; // do not mutate original
    arr.sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;

      if (sortField === 'total_work_hours') {
        const aMin = toMinutesFlexible(a.total_work_hours);
        const bMin = toMinutesFlexible(b.total_work_hours);
        return (aMin - bMin) * dir;
      }

      if (sortField === 'date') {
        const aT = parseDDMMYYYY(a.date);
        const bT = parseDDMMYYYY(b.date);
        return (aT - bT) * dir;
      }

      // String fallback (clock_in_uk / clock_out_uk are "HH:mm")
      const valA = (a?.[sortField] ?? '').toString();
      const valB = (b?.[sortField] ?? '').toString();
      if (valA === valB) return 0;
      return valA > valB ? 1 * dir : -1 * dir;
    });
    return arr;
  };

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      setReports((prev) => sortData(prev));
    } else {
      setSortField(field);
      setSortDirection('asc');
      setReports((prev) => sortData(prev));
    }
  };

  // Current page slice (sorted)
  const paginatedReports = () => {
    const sorted = sortData(reports);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  };

  const totalPages = Math.ceil(reports.length / ITEMS_PER_PAGE);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.delete(`/reports/${id}`);
      fetchReports();
    } catch (err) {
      alert('Failed to delete entry');
    }
  };

  const handleDownload = async (type) => {
    const params = new URLSearchParams({
      employee_id: selectedEmployee !== 'all' ? selectedEmployee : '',
      from: fromDate ? fromDate.toISOString() : '',
      to: toDate ? toDate.toISOString() : '',
    });
    try {
      const res = await api.get(`/reports/export/${type}?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: type === 'csv' ? 'text/csv' : 'application/pdf',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `attendance_report.${type}`;
      link.click();
    } catch {
      alert(`Failed to download ${type.toUpperCase()} file`);
    }
  };

  return (
    <DashboardLayout>
      <div className="report-container">
        <div className="filter-section">
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="all">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </option>
            ))}
          </select>

          <DatePicker
            selected={fromDate}
            onChange={(date) => setFromDate(date)}
            placeholderText="From Date"
            className="date-picker"
            dateFormat="yyyy-MM-dd"
            isClearable
          />

          <DatePicker
            selected={toDate}
            onChange={(date) => setToDate(date)}
            placeholderText="To Date"
            className="date-picker"
            dateFormat="yyyy-MM-dd"
            isClearable
          />

          <button className="apply-filter-btn" onClick={fetchReports}>
            Apply Filters
          </button>

          <div className="export-buttons">
            <button onClick={() => handleDownload('csv')}>Export CSV</button>
            <button onClick={() => handleDownload('pdf')}>Export PDF</button>
          </div>
        </div>

        <div className="table-section">
          <table className="report-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th
                  onClick={() => handleSort('date')}
                  style={{ cursor: 'pointer' }}
                  title="Sort by Date (dd-MM-yyyy)"
                >
                  Date {sortField === 'date' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('clock_in_uk')}
                  style={{ cursor: 'pointer' }}
                  title="Sort by Clock In (HH:mm)"
                >
                  Clock In {sortField === 'clock_in_uk' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('clock_out_uk')}
                  style={{ cursor: 'pointer' }}
                  title="Sort by Clock Out (HH:mm)"
                >
                  Clock Out {sortField === 'clock_out_uk' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('total_work_hours')}
                  style={{ cursor: 'pointer' }}
                  title='Sort by Hours Worked ("HH:MM" or "7h 30m")'
                >
                  Hours Worked {sortField === 'total_work_hours' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedReports().length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>
                    No records found
                  </td>
                </tr>
              ) : (
                paginatedReports().map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : '—'}
                    </td>
                    <td>{r.date ?? '—'}</td>
                    <td>{r.clock_in_uk ?? '—'}</td>
                    <td>{r.clock_out_uk ?? '—'}</td>
                    <td>{r.total_work_hours ?? '—'}</td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(r.id)}
                        title="Delete this entry"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="pagination">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
              disabled={currentPage >= (totalPages || 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
