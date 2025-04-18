import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../services/api';
import { DateTime } from 'luxon';
import './Attendance.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Attendance = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [pin, setPin] = useState('');
  const [actionType, setActionType] = useState(null);
  const [currentTime, setCurrentTime] = useState(DateTime.now().setZone('Europe/London'));

  useEffect(() => {
    fetchEmployees();

    const interval = setInterval(fetchEmployees, 30000);
    const clockInterval = setInterval(() => {
      setCurrentTime(DateTime.now().setZone('Europe/London'));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  const fetchEmployees = async () => {
    try {
      const [empRes, statusRes] = await Promise.all([
        api.get('/employees'),
        api.get('/attendance/status'),
      ]);

      const statusMap = statusRes.data.reduce((map, emp) => {
        map[emp.id] = emp.status;
        return map;
      }, {});

      const updated = empRes.data.map(emp => ({
        ...emp,
        attendance_status: statusMap[emp.id] || 'Not Clocked In',
      }));

      setEmployees(updated);
    } catch (err) {
      toast.error('Failed to fetch employees or status');
      console.error(err);
    }
  };

  const handleNumberClick = (num) => {
    if (pin.length < 4) setPin(prev => prev + num);
  };

  const handleClear = () => setPin('');
  const handleBackspace = () => setPin(pin.slice(0, -1));

  const handleSubmit = async () => {
    if (!selectedEmployee || !actionType || pin.length !== 4) {
      toast.warning('Select employee, action, and enter 4-digit PIN');
      return;
    }

    try {
      const endpoint = actionType === 'clock_in' ? '/attendance/clock-in' : '/attendance/clock-out';
      const res = await api.post(endpoint, {
        employee_id: selectedEmployee.id,
        pin,
      });

      const clockedAt = res.data.clock_in || res.data.clock_out;
      const totalHours = res.data.total_work_hours || '—';
      const timeFormatted = DateTime.fromISO(clockedAt).setZone('Europe/London').toFormat('dd/MM/yyyy HH:mm');

      toast.success(`✅ ${actionType.replace('_', ' ')} successful at ${timeFormatted}. Worked: ${totalHours}`);

      setPin('');
      setActionType(null);
      setSelectedEmployee(null);
      await fetchEmployees();
    } catch (err) {
      console.error('Attendance Error:', err);
      toast.error(err.response?.data?.error || 'Attendance failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="attendance-container">
        <div className="employee-list">
          <h4>Employees</h4>
          <div className="employee-grid">
            {employees.map(emp => {
              const initials = `${emp.first_name?.charAt(0) || ''}${emp.last_name?.charAt(0) || ''}`;
              const status = emp.attendance_status;
              let borderClass = 'border-gray';
              if (status === 'Clocked In') borderClass = 'border-green';
              else if (status === 'Clocked Out') borderClass = 'border-red';

              return (
                <div
                  key={emp.id}
                  className={`employee-card ${selectedEmployee?.id === emp.id ? 'selected' : ''} ${borderClass}`}
                  onClick={() => setSelectedEmployee(emp)}
                >
                  <div className="avatar-circle">{initials}</div>
                  <strong>{emp.first_name} {emp.last_name}</strong>
                  <div className="status-text">
                    {status === 'Clocked In' && <span style={{ color: 'green' }}>🟢 Clocked In</span>}
                    {status === 'Clocked Out' && <span style={{ color: 'red' }}>🔴 Clocked Out</span>}
                    {(!status || status === 'Not Clocked In') && <span style={{ color: 'gray' }}>⚪ Not Clocked In</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="clock-panel">
          <div className="live-clock">
            <div>{currentTime.toFormat('dd/MM/yyyy')}</div>
            <div>{currentTime.toFormat('HH:mm:ss')}</div>
          </div>

          {selectedEmployee && (
            <div className="selected-employee">
              Selected: {selectedEmployee.first_name} {selectedEmployee.last_name}
            </div>
          )}

            <div className="pin-display-box">
              {[0, 1, 2, 3].map(i => (
                <div className="pin-digit-box" key={i}>
                  {pin[i] ? '•' : ''}
                </div>
              ))}
            </div>
    


          <div className="pinpad-row">
            <div className="numbers-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button key={n} className="keypad-btn" onClick={() => handleNumberClick(n.toString())}>{n}</button>
              ))}
              <button className="keypad-btn" onClick={handleClear}>C</button>
              <button className="keypad-btn" onClick={() => handleNumberClick('0')}>0</button>
              <button className="keypad-btn" onClick={handleBackspace}>×</button>
            </div>

            <div className="action-buttons">
              <button
                className={`action-card blue ${actionType === 'clock_in' ? 'active' : ''}`}
                onClick={() => setActionType('clock_in')}
              >
                Clock In
              </button>
              <button
                className={`action-card red ${actionType === 'clock_out' ? 'active' : ''}`}
                onClick={() => setActionType('clock_out')}
              >
                Clock Out
              </button>
              <button className="action-card green" onClick={handleSubmit}>
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
