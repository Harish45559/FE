import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../services/api';
import './Reports.css';

/* ---------- Helpers ---------- */

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

// "7h 30m" / "7h" / "30m" -> minutes
function toMinutesFromHSpaceM(val) {
  if (!val || typeof val !== 'string') return null;
  const hMatch = /(\d+)\s*h/i.exec(val);
  const mMatch = /(\d+)\s*m/i.exec(val);
  const h = hMatch ? Number(hMatch[1]) : 0;
  const m = mMatch ? Number(mMatch[1]) : 0;
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Try both; fall back to 0
function toMinutesFlexible(val) {
  return toMinutesFromHColonM(val) ?? toMinutesFromHSpaceM(val) ?? 0;
}

// dd-MM-yyyy -> yyyy-MM-dd
function ddmmyyyyToISO(dmy) {
  const [dd, mm, yyyy] = (dmy || '').split('-');
  if (!yyyy || !mm || !dd) return null;
  return `${yyyy}-${mm}-${dd}`;
}

const ITEMS_PER_PAGE = 10;

export default function Reports() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reports, setReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');

  // Hover card
  const [hoverOpen, setHoverOpen] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [hoverLoading, setHoverLoading] = useState(false);
  const [hoverData, setHoverData] = useState([]);
  const hoverTimerRef = useRef(null);

  const cancelCloseHover = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };
  const scheduleCloseHover = () => {
    hoverTimerRef.current = setTimeout(() => setHoverOpen(false), 150);
  };

  async function fetchDayDetails(employeeId, dmy, x, y) {
    const iso = ddmmyyyyToISO(dmy);
    if (!iso) return;
    setHoverPos({ x, y });
    setHoverOpen(true);
    setHoverLoading(true);
    try {
      const res = await api.get('/reports/detailed-sessions', {
        params: { employee_id: employeeId, date: iso }
      });
      setHoverData(res.data?.sessions || []);
    } catch (e) {
      setHoverData([{ type: 'error', duration: '—' }]);
    } finally {
      setHoverLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/employees');
        setEmployees(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load employees:', err);
      }
    })();
  }, []);

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports', {
        params: {
          employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
          from: fromDate ? new Date(fromDate).toISOString() : undefined,
          to: toDate ? new Date(toDate).toISOString() : undefined
        }
      });
      const incoming = Array.isArray(res.data) ? res.data : [];
      setReports(sortData(incoming));
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  const sortData = (data) => {
    const arr = [...data];
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

  const paginatedReports = () => {
    const sorted = sortData(reports);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  };

  const totalPages = Math.ceil(reports.length / ITEMS_PER_PAGE) || 1;

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.delete(`/reports/${id}`);
      fetchReports();
    } catch {
      alert('Failed to delete entry');
    }
  };

  const handleDownload = async (type) => {
    const params = new URLSearchParams({
      employee_id: selectedEmployee !== 'all' ? selectedEmployee : '',
      from: fromDate || '',
      to: toDate || '',
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

          <input
            type="date"
            className="date-picker"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            placeholder="From Date"
          />

          <input
            type="date"
            className="date-picker"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            placeholder="To Date"
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
                <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                  Date {sortField === 'date' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('clock_in_uk')} style={{ cursor: 'pointer' }}>
                  Clock In {sortField === 'clock_in_uk' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('clock_out_uk')} style={{ cursor: 'pointer' }}>
                  Clock Out {sortField === 'clock_out_uk' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('total_work_hours')} style={{ cursor: 'pointer' }}>
                  Hours Worked {sortField === 'total_work_hours' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedReports().length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>No records found</td>
                </tr>
              ) : (
                paginatedReports().map((r) => (
                  <tr
                    key={r.id}
                    onMouseEnter={(e) => {
                      cancelCloseHover();
                      const x = e.clientX + 10;
                      const y = e.clientY + 10;
                      const empId = r.employee?.id;
                      if (empId && r.date) fetchDayDetails(empId, r.date, x, y);
                    }}
                    onMouseLeave={scheduleCloseHover}
                    style={{ cursor: 'default' }}
                    title="Hover to see day details"
                  >
                    <td>{r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : '—'}</td>
                    <td>{r.date ?? '—'}</td>
                    <td>{r.clock_in_uk ?? '—'}</td>
                    <td>{r.clock_out_uk ?? '—'}</td>
                    <td>{r.total_work_hours ?? '—'}</td>
                    <td>
                      <button className="delete-btn" onClick={() => handleDelete(r.id)} title="Delete this entry">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}>
              Prev
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {hoverOpen && (
        <div
          onMouseEnter={cancelCloseHover}
          onMouseLeave={scheduleCloseHover}
          className="hover-card"
          style={{ position: 'fixed', left: hoverPos.x, top: hoverPos.y, zIndex: 9999 }}
        >
          <div className="hover-card-title">Day details</div>
          {hoverLoading ? (
            <div className="hover-card-row">Loading…</div>
          ) : hoverData.length === 0 ? (
            <div className="hover-card-row">No completed sessions</div>
          ) : (
            <div className="hover-card-body">
              {hoverData.map((row, i) => (
                <div key={i} className={`hover-card-row ${row.type === 'break' ? 'is-break' : 'is-work'}`}>
                  <div className="col type">{row.type}</div>
                  <div className="col in">
                    {row.type === 'break' ? (row.break_time || '') : (row.clock_in || '')}
                  </div>
                  <div className="col out">
                    {row.type === 'break' ? row.duration : `${row.clock_out || ''} • ${row.duration}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
