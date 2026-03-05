import React, { useEffect, useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { DateTime } from "luxon";
import "./Attendance.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Attendance = () => {
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [manualClockIn, setManualClockIn] = useState("");
  const [manualClockOut, setManualClockOut] = useState("");

  const [currentTime, setCurrentTime] = useState(
    DateTime.now().setZone("Europe/London"),
  );

  const actionTypeRef = useRef(null);

  const userRole = localStorage.getItem("role"); // admin / employee
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";
  useEffect(() => {
    fetchEmployees();

    const timer = setInterval(() => {
      setCurrentTime(DateTime.now().setZone("Europe/London"));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchEmployees = async () => {
    try {
      const [empRes, statusRes] = await Promise.all([
        api.get("/employees"),
        api.get("/attendance/status"),
      ]);

      const statusMap = statusRes.data.reduce((map, emp) => {
        map[emp.id] = emp.status;
        return map;
      }, {});

      const updated = empRes.data.map((emp) => ({
        ...emp,

        attendance_status: statusMap[emp.id] || "Not Clocked In",
      }));

      setAllEmployees(updated);
      setEmployees(updated);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load employees");
    }
  };

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => setPin(pin.slice(0, -1));
  const handleClear = () => setPin("");

  const handleSubmit = async () => {
    const actionType = actionTypeRef.current;

    if (!selectedEmployee || !actionType) {
      toast.warning("Select employee and action");
      return;
    }

    if (pin.length !== 4) {
      toast.error("PIN must be 4 digits");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);

    try {
      const endpoint =
        actionType === "clock_in"
          ? "/attendance/clock-in"
          : "/attendance/clock-out";

      const res = await api.post(endpoint, {
        pin,
        employeeId: selectedEmployee.id,
      });

      const clockedAt =
        actionType === "clock_in"
          ? res.data.attendance?.clock_in
          : res.data.attendance?.clock_out;

      let formatted = "";

      if (clockedAt) {
        formatted = DateTime.fromISO(clockedAt)
          .setZone("Europe/London")
          .toFormat("dd/MM/yyyy HH:mm");
      }

      toast.success(`${actionType.replace("_", " ")} successful ${formatted}`);

      setPin("");
      setSelectedEmployee(null);
      actionTypeRef.current = null;

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === selectedEmployee.id
            ? {
                ...emp,
                attendance_status:
                  actionType === "clock_in" ? "Clocked In" : "Clocked Out",
              }
            : emp,
        ),
      );
    } catch (err) {
      toast.error(err.response?.data?.error || "Attendance failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!selectedEmployee) {
      toast.error("Select employee first");
      return;
    }

    if (!manualClockIn) {
      toast.error("Clock in required");
      return;
    }

    try {
      await api.post("/attendance/manual-entry", {
        employeeId: selectedEmployee.id,
        clock_in: manualClockIn,
        clock_out: manualClockOut || null,
      });

      toast.success("Manual attendance recorded");

      setManualClockIn("");
      setManualClockOut("");

      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error || "Manual entry failed");
    }
  };

  return (
    <DashboardLayout>
      <div className="attendance-container">
        <h1 className="attendance-heading">Attendance</h1>

        <div className="attendance-content">
          {/* LEFT SIDE */}

          <div className="employee-list">
            <input
              className="search-bar"
              placeholder="Search by name or id"
              onChange={(e) => {
                const q = e.target.value.toLowerCase();

                if (!q) {
                  setEmployees(allEmployees);
                  return;
                }

                const filtered = allEmployees.filter(
                  (emp) =>
                    emp.first_name.toLowerCase().includes(q) ||
                    emp.last_name.toLowerCase().includes(q) ||
                    emp.id.toString().includes(q),
                );

                setEmployees(filtered);
              }}
            />

            <div className="employee-grid">
              {employees.map((emp) => {
                const status = emp.attendance_status;

                let border = "border-gray";

                if (status === "Clocked In") border = "border-green";
                if (status === "Clocked Out") border = "border-red";

                const initials = `${emp.first_name?.charAt(0) || ""}${emp.last_name?.charAt(0) || ""}`;

                return (
                  <div
                    key={emp.id}
                    className={`employee-card ${border}
${selectedEmployee?.id === emp.id ? "selected" : ""}`}
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <div className="avatar-circle">{initials}</div>

                    <strong>
                      {emp.first_name} {emp.last_name}
                    </strong>

                    <div className="status-text">
                      {status === "Clocked In" && (
                        <span style={{ color: "green" }}>🟢 Clocked In</span>
                      )}
                      {status === "Clocked Out" && (
                        <span style={{ color: "red" }}>🔴 Clocked Out</span>
                      )}
                      {status === "Not Clocked In" && (
                        <span style={{ color: "gray" }}>⚪ Not Clocked In</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE */}

          <div className="clock-panel">
            <h3>Time Clock</h3>

            <div className="live-clock">
              🕒 {currentTime.toFormat("dd/MM/yyyy HH:mm:ss")}
            </div>

            {selectedEmployee && (
              <div className="selected-employee">
                {selectedEmployee.first_name} {selectedEmployee.last_name}
              </div>
            )}

            <div className="pin-display-box">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="pin-digit-box">
                  {pin[i] ? "•" : ""}
                </div>
              ))}
            </div>

            <div className="numbers-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  className="keypad-btn"
                  onClick={() => handleNumberClick(n.toString())}
                >
                  {n}
                </button>
              ))}

              <button className="keypad-btn" onClick={handleClear}>
                C
              </button>

              <button
                className="keypad-btn"
                onClick={() => handleNumberClick("0")}
              >
                0
              </button>

              <button className="keypad-btn" onClick={handleBackspace}>
                ×
              </button>
            </div>

            <div className="action-buttons">
              <button
                className="action-card green"
                onClick={() => {
                  actionTypeRef.current = "clock_in";
                  handleSubmit();
                }}
              >
                ✔ Clock In
              </button>

              <button
                className="action-card gray"
                onClick={() => {
                  actionTypeRef.current = "clock_out";
                  handleSubmit();
                }}
              >
                ⏺ Clock Out
              </button>
            </div>

            {/* ADMIN ONLY */}

            {isAdmin && (
              <div className="manual-entry-panel">
                <h4>Admin Correction</h4>

                <label>Clock In</label>
                <input
                  type="datetime-local"
                  value={manualClockIn}
                  onChange={(e) => setManualClockIn(e.target.value)}
                />

                <label>Clock Out</label>
                <input
                  type="datetime-local"
                  value={manualClockOut}
                  onChange={(e) => setManualClockOut(e.target.value)}
                />

                <button
                  className="action-card orange"
                  onClick={handleManualSubmit}
                >
                  Fix Attendance
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
