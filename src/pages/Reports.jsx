import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../services/api';
import './Reports.css';

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

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports/reports', {
        params: {
          employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
          from: fromDate ? fromDate.toISOString() : undefined,
          to: toDate ? toDate.toISOString() : undefined,
        }
      });
      const sorted = sortData(res.data || []);
      setReports(sorted);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  const sortData = (data) => {
    return data.sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      if (sortDirection === 'asc') {
        return valA > valB ? 1 : -1;
      }
      return valA < valB ? 1 : -1;
    });
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
          />
          <DatePicker
            selected={toDate}
            onChange={(date) => setToDate(date)}
            placeholderText="To Date"
            className="date-picker"
            dateFormat="yyyy-MM-dd"
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
    <th>Employee</th>
    <th onClick={() => handleSort('date')}>Date</th>
    <th onClick={() => handleSort('clock_in_uk')}>Clock In</th>
    <th onClick={() => handleSort('clock_out_uk')}>Clock Out</th>
    <th onClick={() => handleSort('total_work_hours')}>Total Hours</th>
    <th>Action</th>
  </tr>
</thead>


            <tbody>
              {paginatedReports().length > 0 ? (
                paginatedReports().map((r) => (
                 <tr key={r.id}>
  <td>{r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : '—'}</td>
  <td>{r.date || '—'}</td>
  <td>{r.clock_in_uk || '—'}</td>
  <td>{r.clock_out_uk || '—'}</td>
  <td>{r.total_work_hours ?? '—'}</td>
  <td>
    <button className="delete-btn" onClick={() => handleDelete(r.id)}>🗑️</button>
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
