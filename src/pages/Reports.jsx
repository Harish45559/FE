import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../services/api';
import './Reports.css';
import { format } from 'date-fns';

const Reports = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [reports, setReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('clock_in_uk');
  const [sortDirection, setSortDirection] = useState('asc');

  const ITEMS_PER_PAGE = 10;

  // Fetch employees list on mount
 // Fetch employees list on mount
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

// Fetch reports on mount
useEffect(() => {
  fetchReports();
}, []);


  // Fetch reports with filters applied
  const fetchReports = async () => {
    try {
     const res = await api.get('/reports', {

        params: {
          employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
          from: fromDate ? fromDate.toISOString() : undefined,
          to: toDate ? toDate.toISOString() : undefined,
        },
      });
      const sorted = sortData(res.data || []);
      setReports(sorted);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  // Sort the data by selected column & direction
  const sortData = (data) => {
    return data.sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      if (sortField === 'total_work_hours') {
        // Sort time duration HH:mm properly
        const [aH, aM] = valA.split(':').map(Number);
        const [bH, bM] = valB.split(':').map(Number);
        const aTotal = aH * 60 + aM;
        const bTotal = bH * 60 + bM;
        return sortDirection === 'asc' ? aTotal - bTotal : bTotal - aTotal;
      } else {
        if (sortDirection === 'asc') {
          return valA > valB ? 1 : -1;
        }
        return valA < valB ? 1 : -1;
      }
    });
  };

  // Handle header click for sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get current page records
  const paginatedReports = () => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortData(reports).slice(start, start + ITEMS_PER_PAGE);
  };

  const totalPages = Math.ceil(reports.length / ITEMS_PER_PAGE);

  // Delete record handler
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await api.delete(`/reports/${id}`);
        fetchReports();
      } catch {
        alert('Failed to delete entry');
      }
    }
  };

  // Export reports handler (CSV/PDF)
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

          <button className="search-btn" onClick={fetchReports}>
            🔍 Search
          </button>
        </div>

        <div className="export-section">
          <button onClick={() => handleDownload('csv')}>⬇ CSV</button>
          <button onClick={() => handleDownload('pdf')}>⬇ PDF</button>
        </div>

        <div className="report-table">
          <table>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th
                  onClick={() => handleSort('clock_in_uk')}
                  style={{ cursor: 'pointer' }}
                >
                  Clocking In Date &amp; Time {sortField === 'clock_in_uk' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('clock_out_uk')}
                  style={{ cursor: 'pointer' }}
                >
                  Clock Out Date &amp; Time {sortField === 'clock_out_uk' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('total_work_hours')}
                  style={{ cursor: 'pointer' }}
                >
                  Hours Worked {sortField === 'total_work_hours' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports().length > 0 ? (
                paginatedReports().map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.employee
                        ? `${r.employee.first_name} ${r.employee.last_name}`
                        : '—'}
                    </td>
                    {/* clock_in_uk / clock_out_uk stored as "dd/MM/yyyy HH:mm", parsing to Date for formatting */}
                    <td>
                      {r.clock_in_uk
                        ? format(parseDateString(r.clock_in_uk), 'yyyy-MM-dd HH:mm')
                        : '—'}
                    </td>
                    <td>
                      {r.clock_out_uk
                        ? format(parseDateString(r.clock_out_uk), 'yyyy-MM-dd HH:mm')
                        : '—'}
                    </td>
                    <td>{r.total_work_hours ?? '—'}</td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(r.id)}
                        title="Delete record"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={i + 1 === currentPage ? 'active' : ''}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Helper to parse "dd/MM/yyyy HH:mm" format to JS Date for date-fns formatting
function parseDateString(dateStr) {
  const [datePart, timePart] = dateStr.split(' ');
  const [day, month, year] = datePart.split('/');
  return new Date(`${year}-${month}-${day}T${timePart}:00`);
}

export default Reports;
