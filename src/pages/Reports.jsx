import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../services/api';
import './Reports.css';
import { DateTime } from 'luxon';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

const Reports = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [reports, setReports] = useState([]);
  const [tooltipCache, setTooltipCache] = useState({});
  const [tooltipLoading, setTooltipLoading] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('clock_in_uk');
  const [sortDirection, setSortDirection] = useState('asc');
  const [dailySummary, setDailySummary] = useState({});
  const ITEMS_PER_PAGE = 10;

  const sortData = useCallback((data) => {
    return data.sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      if (sortDirection === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });
  }, [sortField, sortDirection]);

  const fetchReports = useCallback(async () => {
    try {
      // Fetch individual reports
      const reportsRes = await api.get('/reports/reports', {
        params: {
          employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
          from: fromDate ? fromDate.toISOString() : undefined,
          to: toDate ? toDate.toISOString() : undefined,
        }
      });
      
      // Fetch daily summary for break times
      const summaryRes = await api.get('/reports/summary', {
        params: {
          employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
          from: fromDate ? fromDate.toISOString() : undefined,
          to: toDate ? toDate.toISOString() : undefined,
        }
      });

      const sorted = sortData(reportsRes.data || []);
      setReports(sorted);
      
      // Create a lookup for daily summary data
      const summaryLookup = {};
      (summaryRes.data || []).forEach(summary => {
        // Use the same date format as in reports (DD-MM-YYYY)
        const key = `${summary.employee?.id}_${summary.date}`;
        summaryLookup[key] = summary;
      });
      setDailySummary(summaryLookup);
      
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  }, [selectedEmployee, fromDate, toDate, sortData]);

  useEffect(() => {
    const init = async () => {
      await fetchEmployees();
      await fetchReports();
    };
    init();
  }, [fetchReports]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const handleTooltipContent = async (employeeId, date, key) => {
    // If already cached, return it
    if (tooltipCache[key]) return tooltipCache[key];
    
    // If currently loading, return loading text
    if (tooltipLoading[key]) return 'Loading...';
    
    // Set loading state
    setTooltipLoading(prev => ({ ...prev, [key]: true }));
    
    try {
      // Convert date from DD-MM-YYYY to YYYY-MM-DD format for API
      const [day, month, year] = date.split('-');
      const isoDate = `${year}-${month}-${day}`;
      
      console.log('Fetching sessions for:', { employeeId, date, isoDate });
      
      const res = await api.get('/reports/sessions', {
        params: {
          employee_id: employeeId,
          date: isoDate
        }
      });
      
      console.log('Sessions response:', res.data);
      
      const { sessions, total_sessions } = res.data;
      
      // If no sessions, return message
      if (!sessions || sessions.length === 0 || total_sessions === 0) {
        const content = 'No detailed sessions found for this date.';
        setTooltipCache(prev => ({ ...prev, [key]: content }));
        setTooltipLoading(prev => ({ ...prev, [key]: false }));
        return content;
      }
      
      // Format the tooltip content
      let tooltipText = `Sessions for ${date}:\n\n`;
      
      sessions.forEach((session, index) => {
        if (session.type === 'break') {
          tooltipText += `⏸️ Break: ${session.duration} (${session.break_time})\n`;
        } else {
          tooltipText += `🕐 Work: ${session.clock_in} - ${session.clock_out} (${session.duration})\n`;
        }
      });
      
      // Add summary from daily summary data
      const summaryKey = `${employeeId}_${date}`;
      const summary = dailySummary[summaryKey];
      if (summary) {
        tooltipText += `\n📊 Summary:\n`;
        tooltipText += `Total Work: ${summary.total_work_hours}\n`;
        tooltipText += `Total Break: ${summary.break_time}`;
      }
      
      setTooltipCache(prev => ({ ...prev, [key]: tooltipText }));
      setTooltipLoading(prev => ({ ...prev, [key]: false }));
      return tooltipText;
      
    } catch (err) {
      console.error('Error fetching session details:', err);
      const content = 'Error loading session details.';
      setTooltipCache(prev => ({ ...prev, [key]: content }));
      setTooltipLoading(prev => ({ ...prev, [key]: false }));
      return content;
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const paginatedReports = () => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return sortData(reports).slice(start, end);
  };

  const totalPages = Math.ceil(reports.length / ITEMS_PER_PAGE);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await api.delete(`/reports/${id}`);
        fetchReports();
      } catch (err) {
        alert('Failed to delete entry');
      }
    }
  };

  const handleDownload = async (type) => {
    const params = new URLSearchParams({
      employee_id: selectedEmployee !== 'all' ? selectedEmployee : '',
      from: fromDate ? fromDate.toISOString() : '',
      to: toDate ? toDate.toISOString() : ''
    });
    try {
      const res = await api.get(`/reports/export/${type}?${params}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: type === 'csv' ? 'text/csv' : 'application/pdf',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `attendance_report.${type}`;
      link.click();
    } catch (err) {
      alert(`Failed to download ${type.toUpperCase()} file`);
    }
  };

  // Custom tooltip component that updates when content changes
  const TooltipContent = ({ tooltipKey, employeeId, date }) => {
    const [content, setContent] = useState('Click to load details');
    const [isLoading, setIsLoading] = useState(false);

    const loadContent = async () => {
      if (!tooltipCache[tooltipKey] && !isLoading) {
        setIsLoading(true);
        setContent('Loading...');
        const result = await handleTooltipContent(employeeId, date, tooltipKey);
        setContent(result);
        setIsLoading(false);
      } else if (tooltipCache[tooltipKey]) {
        setContent(tooltipCache[tooltipKey]);
      }
    };

    useEffect(() => {
      if (tooltipCache[tooltipKey]) {
        setContent(tooltipCache[tooltipKey]);
      }
    }, [tooltipCache[tooltipKey], tooltipKey]);

    return (
      <div style={{ 
        whiteSpace: 'pre-line', 
        fontSize: '12px', 
        lineHeight: '1.4',
        maxWidth: '300px',
        padding: '8px'
      }}>
        {content}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="report-container">
        <div className="filter-section">
          <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
            <option value="all">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
            ))}
          </select>
          <DatePicker selected={fromDate} onChange={(date) => setFromDate(date)} placeholderText="From Date" className="date-picker" dateFormat="yyyy-MM-dd" />
          <DatePicker selected={toDate} onChange={(date) => setToDate(date)} placeholderText="To Date" className="date-picker" dateFormat="yyyy-MM-dd" />
          <button className="search-btn" onClick={fetchReports}>🔍 Search</button>
        </div>

        <div className="export-section">
          <button onClick={() => handleDownload('csv')}>⬇ CSV</button>
          <button onClick={() => handleDownload('pdf')}>⬇ PDF</button>
        </div>

        <div className="report-table">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th onClick={() => handleSort('clock_in_uk')}>Clock In</th>
                <th onClick={() => handleSort('clock_out_uk')}>Clock Out</th>
                <th onClick={() => handleSort('total_work_hours')}>Total Work Hours</th>
                <th>Break Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports().length > 0 ? (
                paginatedReports().map((r) => {
                  const key = `${r.employee?.id}_${r.date}`;
                  const summaryData = dailySummary[key];
                  
                  return (
                    <tr key={r.id}>
                      <td>{r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : '—'}</td>
                      <td>{r.date || '—'}</td>
                      <td>{r.clock_in_uk || '—'}</td>
                      <td>{r.clock_out_uk || '—'}</td>
                      <td>{r.total_work_hours ?? '—'}</td>
                      <td>
                        {summaryData?.break_time && summaryData.break_time !== '00:00' ? (
                          <Tippy
                            content={
                              <TooltipContent 
                                tooltipKey={key}
                                employeeId={r.employee?.id}
                                date={r.date}
                              />
                            }
                            delay={[300, 0]}
                            placement="top"
                            interactive={true}
                            theme="light-border"
                            maxWidth={350}
                            trigger="mouseenter focus"
                            onShow={async () => {
                              // Trigger content loading when tooltip shows
                              if (!tooltipCache[key] && !tooltipLoading[key]) {
                                await handleTooltipContent(r.employee?.id, r.date, key);
                              }
                            }}
                          >
                            <span
                              className="clickable"
                              style={{ 
                                cursor: 'pointer', 
                                textDecoration: 'underline',
                                color: '#007bff'
                              }}
                            >
                              {summaryData?.break_time || '—'}
                            </span>
                          </Tippy>
                        ) : (
                          <span>{summaryData?.break_time || '—'}</span>
                        )}
                      </td>
                      <td><button className="delete-btn" onClick={() => handleDelete(r.id)}>🗑️</button></td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center' }}>No records found</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="pagination">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={i + 1 === currentPage ? 'active' : ''}
              >{i + 1}</button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;