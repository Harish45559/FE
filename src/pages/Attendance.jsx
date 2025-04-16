import React, { useEffect, useState } from 'react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import './Attendance.css';
import toast from 'react-hot-toast';

const Attendance = () => {
  const [employees, setEmployees] = useState([]);
  const [pin, setPin] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [action, setAction] = useState('clock-in');
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [refresh]);

  const fetchEmployees = async () => {
    try {
      const empRes = await api.get('/employees');
      const statusRes = await api.get('/attendance/status');

      const statusMap = statusRes.data.reduce((map, emp) => {
        map[emp.id] = emp.status;  // 'Clocked In', 'Clocked Out', etc.
        return map;
      }, {});

      const updated = empRes.data.map(emp => ({
        ...emp,
        attendance_status: statusMap[emp.id] || 'Not Clocked In',
      }));

      setEmployees(updated);
    } catch (err) {
      console.error('Fetch employees error:', err);
    }
  };

  const handleClockAction = async () => {
    if (!selectedEmployee) return;
    if (!pin) {
      toast.error('Enter your PIN');
      return;
    }

    try {
      const endpoint = action === 'clock-in' ? '/attendance/clock-in' : '/attendance/clock-out';
      await api.post(endpoint, {
        employee_id: selectedEmployee.id,
        pin,
      });

      toast.success(`${action === 'clock-in' ? 'Clocked In' : 'Clocked Out'} successfully!`);
      setPin('');
      setSelectedEmployee(null);
      setRefresh(!refresh);
    } catch (err) {
      console.error(`${action} error:`, err.response?.data || err.message);
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="attendance-container">
        <div className="employee-list">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className={`employee-card ${selectedEmployee?.id === emp.id ? 'selected' : ''}`}
              onClick={() => setSelectedEmployee(emp)}
            >
              <h3>{emp.first_name} {emp.last_name}</h3>
              <p>{emp.username}</p>
              <div style={{ marginTop: 4, fontWeight: 'bold' }}>
                {emp.attendance_status === 'Clocked In' && <span style={{ color: 'green' }}>🟢 Clocked In</span>}
                {emp.attendance_status === 'Clocked Out' && <span style={{ color: 'red' }}>🔴 Clocked Out</span>}
                {(!emp.attendance_status || emp.attendance_status === 'Not Clocked In') && <span style={{ color: 'gray' }}>⚪ Not Clocked In</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="clock-panel">
          <div className="action-toggle">
            <button
              className={action === 'clock-in' ? 'active' : ''}
              onClick={() => setAction('clock-in')}
            >
              Clock In
            </button>
            <button
              className={action === 'clock-out' ? 'active' : ''}
              onClick={() => setAction('clock-out')}
            >
              Clock Out
            </button>
          </div>

          <div className="pin-display">{pin.replace(/./g, '*')}</div>
          <div className="pin-pad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
              <button key={n} onClick={() => setPin(pin + n)}>{n}</button>
            ))}
            <button onClick={() => setPin('')}>Clear</button>
          </div>

          <button className="submit-button" onClick={handleClockAction}>
            Submit
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;