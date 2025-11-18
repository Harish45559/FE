// Reports.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../services/api';
import './Reports.css';

import usePagination from '../hooks/usePagination';
import PaginationBar from '../components/PaginationBar';

/* ========================= Helpers ========================= */

const safe = (v) => (v == null ? '' : String(v));

// extract first HH:MM in a string
const firstHHMM = (s) => {
  if (!s) return null;
  const m = String(s).match(/\b(\d{1,2}:\d{2})(?::\d{2})?\b/);
  return m ? m[1] : null;
};
// extract last HH:MM in a string (useful if a stray "11:00 - 14:00" leaks in)
const lastHHMM = (s) => {
  if (!s) return null;
  const matches = String(s).match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g);
  if (!matches) return firstHHMM(s);
  return matches[matches.length - 1];
};

// convert HH:MM to minutes since midnight
const timeToMin = (s) => {
  const t = firstHHMM(s);
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

// "xh ym" / "HH:MM" -> minutes
const durationToMin = (val) => {
  if (!val) return 0;
  const str = String(val).trim();
  if (str.includes(':')) {
    const [h, m] = str.split(':').map(Number);
    return (Number(h) || 0) * 60 + (Number(m) || 0);
  }
  const h = (/\b(\d+)\s*h/i.exec(str)?.[1]) || 0;
  const m = (/\b(\d+)\s*m/i.exec(str)?.[1]) || 0;
  return Number(h) * 60 + Number(m);
};

// minutes -> "HH:MM"
const minToHHMM = (mins) => {
  const m = Math.max(0, Math.round(mins || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${String(h).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

/* ========================= Component ========================= */

export default function Reports() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rawRows, setRawRows] = useState([]);

  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('asc');

  const [hoverOpen, setHoverOpen] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [hoverSessions, setHoverSessions] = useState([]);
  const hoverTimerRef = useRef(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  /* -------- Load employees -------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/employees');
        setEmployees(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error('Failed to load employees:', e);
      }
    })();
  }, []);

  /* -------- Load reports (raw) -------- */
  const fetchReports = async () => {
    try {
      const res = await api.get('/reports', {
        params: {
          employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
          from: fromDate || undefined,
          to: toDate || undefined
        }
      });
      setRawRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to fetch reports:', e);
      setRawRows([]);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ========================= AUTO REFRESH ========================= */
  useEffect(() => {
    // Polling interval (only when visible)
    const POLL_MS = 10000;
    let pollId = null;

    const startPoll = () => {
      if (pollId) return;
      pollId = setInterval(() => {
        if (document.visibilityState === 'visible') fetchReports();
      }, POLL_MS);
    };

    const stopPoll = () => {
      if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }
    };

    startPoll();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchReports();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onReportsUpdated = () => fetchReports();
    window.addEventListener('reportsUpdated', onReportsUpdated);

    const onStorage = (e) => {
      if (e.key === 'reportsUpdated') fetchReports();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      stopPoll();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('reportsUpdated', onReportsUpdated);
      window.removeEventListener('storage', onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchReports();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  /* ========================= Group & Sum ========================= */

  const grouped = useMemo(() => {
    const map = new Map();

    for (const r of rawRows) {
      const emp = r.employee || {};
      const empId = emp.id ?? emp.employee_id ?? safe(emp.code);
      const empName = `${safe(emp.first_name)} ${safe(emp.last_name)}`.trim() || '—';
      const date = r.date || r.day || r.attendance_date;
      if (!empId || !date) continue;

      const key = `${empId}__${date}`;
      if (!map.has(key)) {
        map.set(key, {
          employeeId: empId,
          employeeName: empName,
          date,
          firstInMin: null,
          lastOutMin: null,
          workTotalMin: 0,
          breakTotalMin: 0,
          sessions: []
        });
      }
      const g = map.get(key);

      // STRICT: only use API's clean fields to avoid strings like "04:23 - 14:38"
      const clockIn = r.clock_in_uk || '';
      const clockOut = r.clock_out_uk || '';

      const inMin = timeToMin(clockIn);
      const outMinRaw = timeToMin(clockOut);

      // Track earliest in and latest out (normalize overnight when comparing)
      if (inMin != null) g.firstInMin = g.firstInMin == null ? inMin : Math.min(g.firstInMin, inMin);
      let outMin = outMinRaw;
      if (inMin != null && outMin != null && outMin < inMin) outMin += 1440; // crossed midnight
      if (outMin != null) g.lastOutMin = g.lastOutMin == null ? outMin : Math.max(g.lastOutMin, outMin);

      // Prefer explicit duration from backend: total_work_hhmm or total_work_hours
      let durMin = durationToMin(r.total_work_hhmm ?? r.total_work_hours);

      // If not available, derive from in/out with overnight handling
      if (!durMin && inMin != null && outMinRaw != null) {
        let outAdj = outMinRaw;
        if (outAdj < inMin) outAdj += 1440;
        durMin = Math.max(0, outAdj - inMin);
      }

      g.workTotalMin += durMin;

      g.sessions.push({
        type: 'Work',
        in: firstHHMM(clockIn) || '',
        out: lastHHMM(clockOut) || '',
        duration: minToHHMM(durMin)
      });
    }

    return Array.from(map.values()).map((g) => {
      // Derive break from span if no explicit break rows
      const derivedBreakMin =
        g.firstInMin != null && g.lastOutMin != null
          ? Math.max(0, (g.lastOutMin - g.firstInMin) - g.workTotalMin)
          : 0;
      const totalBreakMin = g.breakTotalMin > 0 ? g.breakTotalMin : derivedBreakMin;

      return {
        ...g,
        firstIn:
          g.firstInMin != null
            ? `${String(Math.floor(g.firstInMin / 60) % 24).padStart(2, '0')}:${String(g.firstInMin % 60).padStart(2, '0')}`
            : '—',
        lastOut:
          g.lastOutMin != null
            ? `${String(Math.floor(g.lastOutMin / 60) % 24).padStart(2, '0')}:${String(g.lastOutMin % 60).padStart(2, '0')}`
            : '—',
        workTotal: minToHHMM(g.workTotalMin),
        breakTotal: minToHHMM(totalBreakMin)
      };
    });
  }, [rawRows]);

  /* -------- Sorting (unchanged) -------- */
  const sorted = useMemo(() => {
    const arr = [...grouped];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortField) {
        case 'employee':
          return safe(a.employeeName).localeCompare(safe(b.employeeName)) * dir;
        case 'total':
          return (a.workTotalMin - b.workTotalMin) * dir;
        case 'firstIn':
          return ((a.firstInMin ?? 1e9) - (b.firstInMin ?? 1e9)) * dir;
        case 'lastOut':
          return ((a.lastOutMin ?? -1e9) - (b.lastOutMin ?? -1e9)) * dir;
        case 'break':
          return (a.breakTotalMin - b.breakTotalMin) * dir;
        case 'date':
        default: {
          const toKey = (d) => {
            if (!d) return 0;
            const [dd, mm, yyyy] = d.split('-').map(Number);
            return new Date(yyyy, (mm || 1) - 1, dd || 1).getTime();
          };
          return (toKey(a.date) - (toKey(b.date))) * dir;
        }
      }
    });
    return arr;
  }, [grouped, sortField, sortDir]);

  // Global pagination (shared hook)
  const {
    page, setPage,
    pageSize, setPageSize,
    pageCount, pageRows
  } = usePagination(sorted);

  const onSort = (field) => {
    if (field === sortField) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  /* -------- Hover helpers -------- */
  const cancelClose = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };
  const scheduleClose = () => {
    hoverTimerRef.current = setTimeout(() => setHoverOpen(false), 120);
  };

  /* -------- Export -------- */
  const handleDownload = async (type) => {
    const params = new URLSearchParams({
      employee_id: selectedEmployee !== 'all' ? selectedEmployee : '',
      from: fromDate || '',
      to: toDate || ''
    });
    try {
      const res = await api.get(`/reports/export/${type}?${params.toString()}`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], {
        type: type === 'csv' ? 'text/csv' : 'application/pdf'
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = type === 'csv' ? 'report.csv' : 'report.pdf';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  /* -------- Hover detail fetch (detailed sessions) -------- */
  const fetchDetailedSessions = async (employeeId, date) => {
    try {
      const res = await api.get('/reports/detailed-sessions', {
        params: { employee_id: employeeId, date }
      });
      return res.data?.sessions ?? [];
    } catch (err) {
      console.error('Failed to fetch detailed sessions', err);
      return [];
    }
  };

  /* -------- Render UI -------- */
  return (
    <DashboardLayout>
      <div className="reports-container">
        <div className="reports-header">
          <h2>Reports</h2>
          <div className="reports-actions">
            <label>
              Employee:
              <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                <option value="all">All</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              From:
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>

            <label>
              To:
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>

            <button type="button" onClick={fetchReports}>Apply Filters</button>

            <button
              onClick={handleManualRefresh}
              className="refresh-btn"
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>

            <div className="export-buttons">
              <button onClick={() => handleDownload('csv')}>Export CSV</button>
              <button onClick={() => handleDownload('pdf')}>Export PDF</button>
            </div>
          </div>
        </div>

        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th onClick={() => onSort('employee')}>Employee {sortField === 'employee' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => onSort('date')}>Date {sortField === 'date' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => onSort('firstIn')}>First In {sortField === 'firstIn' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => onSort('lastOut')}>Last Out {sortField === 'lastOut' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => onSort('total')}>Work Total {sortField === 'total' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => onSort('break')}>Break {sortField === 'break' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                <th>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows && pageRows.length ? pageRows.map((row) => (
                <tr key={`${row.employeeId}_${row.date}`}>
                  <td>{row.employeeName}</td>
                  <td>{row.date}</td>
                  <td>{row.firstIn}</td>
                  <td>{row.lastOut}</td>
                  <td>{row.workTotal}</td>
                  <td>{row.breakTotal}</td>
                  <td>
                    <div
                      onMouseEnter={async (e) => {
                        cancelClose();
                        hoverTimerRef.current && clearTimeout(hoverTimerRef.current);
                        setHoverPos({ x: e.clientX, y: e.clientY });
                        setHoverOpen(true);
                        const sessions = await fetchDetailedSessions(row.employeeId, row.date);
                        setHoverSessions(sessions);
                      }}
                      onMouseLeave={() => {
                        scheduleClose();
                      }}
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {row.sessions.length} sessions
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar page={page} pageCount={pageCount} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} />

        {/* Hover card */}
        {hoverOpen && (
          <div
            className="hover-card"
            style={{
              position: 'fixed',
              left: hoverPos.x + 8,
              top: hoverPos.y + 8,
              background: '#fff',
              border: '1px solid #ddd',
              padding: 8,
              zIndex: 9999,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Sessions</div>
            {hoverSessions && hoverSessions.length ? hoverSessions.map((s, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div>{s.type === 'Work' ? `${s.clock_in} — ${s.clock_out}` : s.break_time}</div>
                <div style={{ fontSize: 12, color: '#444' }}>{s.duration}</div>
              </div>
            )) : <div style={{ color: '#666' }}>No details</div>}
          </div>
        )}

        <div style={{ marginTop: 8, color: '#666' }}>
          <small>Auto-refresh: this view polls every 10s while visible. To trigger an immediate refresh from other parts of the app: <code>window.dispatchEvent(new Event('reportsUpdated'))</code> or <code>localStorage.setItem('reportsUpdated', Date.now().toString())</code>.</small>
        </div>
      </div>
    </DashboardLayout>
  );
}
