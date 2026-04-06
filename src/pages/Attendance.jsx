import React, { useEffect, useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import { DateTime } from "luxon";
import "./Attendance.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AVATAR_COLORS = [
  "#dd3a00",
  "#6c63ff",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#8b5cf6",
  "#14b8a6",
  "#ec4899",
  "#3b82f6",
  "#10b981",
  "#f97316",
];

const getInitials = (first = "", last = "") =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

const getAvatarColor = (index) => AVATAR_COLORS[index % AVATAR_COLORS.length];

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
  const hasFetched = useRef(false);
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  // Live clock — separate from data fetch
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(DateTime.now().setZone("Europe/London"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch employees once
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/attendance/dashboard");
      setAllEmployees(res.data);
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load employees");
    }
  };

  const handleNumberClick = (num) => {
    if (pin.length < 4) setPin((prev) => prev + num);
  };
  const handleBackspace = () => setPin((p) => p.slice(0, -1));
  const handleClear = () => setPin("");

  const handleSubmit = async () => {
    const actionType = actionTypeRef.current;
    if (!selectedEmployee || !actionType)
      return toast.warning("Select an employee first");
    if (pin.length !== 4) return toast.error("PIN must be 4 digits");
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
      const ukTime =
        actionType === "clock_in"
          ? res.data.attendance?.clock_in_uk
          : res.data.attendance?.clock_out_uk;
      const formatted = ukTime ? ukTime.split(" ")[1] : "";
      toast.success(
        `${actionType.replace("_", " ")} successful at ${formatted}`,
      );
      const empId = selectedEmployee.id;
      setPin("");
      setSelectedEmployee(null);
      actionTypeRef.current = null;
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === empId
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
    if (!selectedEmployee) return toast.error("Select employee first");
    if (!manualClockIn) return toast.error("Clock in time is required");
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

  const getStatusClass = (status) => {
    if (status === "Clocked In") return "att-clocked-in";
    if (status === "Clocked Out") return "att-clocked-out";
    return "";
  };
  const getStatusDot = (status) => {
    if (status === "Clocked In") return "green";
    if (status === "Clocked Out") return "red";
    return "gray";
  };
  const getStatusLabel = (status) => {
    if (status === "Clocked In") return "Clocked in";
    if (status === "Clocked Out") return "Clocked out";
    return "Not clocked in";
  };

  const selectedIndex = allEmployees.findIndex(
    (e) => e.id === selectedEmployee?.id,
  );

  return (
    <DashboardLayout>
      <div className="att-wrap">
        <div className="att-panel">
          {/* ══ LEFT — keypad ══ */}
          <div className="att-left">
            <div className="att-header">
              <h1 className="att-title">Attendance</h1>
              <div className="att-clock">
                <div>
                  <span className="att-clock-time">
                    {currentTime.toFormat("HH:mm")}
                  </span>
                  <span className="att-clock-secs">
                    :{currentTime.toFormat("ss")}
                  </span>
                </div>
                <div className="att-clock-date">
                  {currentTime.toFormat("ccc, dd MMM")}
                </div>
              </div>
            </div>

            <div className="att-sel-area">
              {selectedEmployee ? (
                <div className="att-sel-emp">
                  <div
                    className="att-sel-av"
                    style={{ background: getAvatarColor(selectedIndex) }}
                  >
                    {getInitials(
                      selectedEmployee.first_name,
                      selectedEmployee.last_name,
                    )}
                  </div>
                  <span className="att-sel-name">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </span>
                </div>
              ) : (
                <span className="att-sel-placeholder">Select an employee</span>
              )}
              <div className="att-pin-row">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`att-pin-dot${pin[i] ? " filled" : ""}`}
                  />
                ))}
              </div>
            </div>

            <div className="att-keypad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  className="att-kb"
                  onClick={() => handleNumberClick(n.toString())}
                >
                  {n}
                </button>
              ))}
              <button className="att-kb att-kb-special" onClick={handleClear}>
                C
              </button>
              <button className="att-kb" onClick={() => handleNumberClick("0")}>
                0
              </button>
              <button
                className="att-kb att-kb-special"
                onClick={handleBackspace}
              >
                ⌫
              </button>
            </div>

            <div className="att-action-btns">
              <button
                className="att-abtn att-in"
                disabled={isLoading}
                onClick={() => {
                  actionTypeRef.current = "clock_in";
                  handleSubmit();
                }}
              >
                ✔ Clock In
              </button>
              <button
                className="att-abtn att-out"
                disabled={isLoading}
                onClick={() => {
                  actionTypeRef.current = "clock_out";
                  handleSubmit();
                }}
              >
                ⏺ Clock Out
              </button>
            </div>

            {isAdmin && (
              <>
                <div className="att-divider" />
                <div className="att-admin-section">
                  <div className="att-admin-title">⚙ Admin correction</div>
                  <div className="att-admin-field">
                    <label>Clock in</label>
                    <input
                      type="datetime-local"
                      value={manualClockIn}
                      onChange={(e) => setManualClockIn(e.target.value)}
                    />
                  </div>
                  <div className="att-admin-field">
                    <label>Clock out</label>
                    <input
                      type="datetime-local"
                      value={manualClockOut}
                      onChange={(e) => setManualClockOut(e.target.value)}
                    />
                  </div>
                  <button
                    className="att-abtn att-fix"
                    onClick={handleManualSubmit}
                  >
                    Fix attendance
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ══ RIGHT — employee list ══ */}
          <div className="att-right">
            <div className="att-right-header">
              <input
                className="att-search"
                placeholder="Search employees…"
                onChange={(e) => {
                  const q = e.target.value.toLowerCase();
                  if (!q) {
                    setEmployees(allEmployees);
                    return;
                  }
                  setEmployees(
                    allEmployees.filter(
                      (emp) =>
                        emp.first_name.toLowerCase().includes(q) ||
                        emp.last_name.toLowerCase().includes(q) ||
                        emp.id.toString().includes(q),
                    ),
                  );
                }}
              />
            </div>
            <div className="att-grid">
              {employees.map((emp) => {
                const realIndex = allEmployees.findIndex(
                  (e) => e.id === emp.id,
                );
                return (
                  <div
                    key={emp.id}
                    className={`att-card ${getStatusClass(emp.attendance_status)}${selectedEmployee?.id === emp.id ? " att-card-selected" : ""}`}
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setPin("");
                    }}
                  >
                    <div
                      className="att-avatar"
                      style={{ background: getAvatarColor(realIndex) }}
                    >
                      {getInitials(emp.first_name, emp.last_name)}
                    </div>
                    <div className="att-emp-name">
                      {emp.first_name} {emp.last_name}
                    </div>
                    <div className="att-emp-status">
                      <span
                        className={`att-dot ${getStatusDot(emp.attendance_status)}`}
                      />
                      <span>{getStatusLabel(emp.attendance_status)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="att-emp-count">{employees.length} employees</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
