import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import "./Reports.css";

import usePagination from "../hooks/usePagination";
import PaginationBar from "../components/PaginationBar";

/* ========================= Helpers ========================= */

const safe = (v) => (v == null ? "" : String(v));

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
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

// "xh ym" / "HH:MM" -> minutes
const durationToMin = (val) => {
  if (!val) return 0;
  const str = String(val).trim();
  if (str.includes(":")) {
    const [h, m] = str.split(":").map(Number);
    return (Number(h) || 0) * 60 + (Number(m) || 0);
  }
  const h = /\b(\d+)\s*h/i.exec(str)?.[1] || 0;
  const m = /\b(\d+)\s*m/i.exec(str)?.[1] || 0;
  return Number(h) * 60 + Number(m);
};

// minutes -> "HH:MM"
const minToHHMM = (mins) => {
  const m = Math.max(0, Math.round(mins || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${String(h).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

/* ========================= Component ========================= */

export default function Reports() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rawRows, setRawRows] = useState([]);

  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("asc");

  const [hoverOpen, setHoverOpen] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [hoverSessions, setHoverSessions] = useState([]);
  const hoverTimerRef = useRef(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionRows, setSessionRows] = useState([]);

  /* -------- Load employees -------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/employees");
        setEmployees(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("Failed to load employees:", e);
      }
    })();
  }, []);

  /* -------- Load reports (raw) -------- */
  const fetchReports = async () => {
    try {
      const res = await api.get("/reports", {
        params: {
          employee_id:
            selectedEmployee !== "all" ? selectedEmployee : undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        },
      });
      setRawRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to fetch reports:", e);
      setRawRows([]);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedEmployee, fromDate, toDate]);

  /* -------- Group & Sum -------- */
  const grouped = useMemo(() => {
    const map = new Map();

    for (const r of rawRows) {
      const emp = r.employee || {};
      const empId = emp.id ?? emp.employee_id ?? safe(emp.code);
      const empName =
        `${safe(emp.first_name)} ${safe(emp.last_name)}`.trim() || "—";
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
          sessions: [],
        });
      }
      const g = map.get(key);

      // STRICT: only use API's clean fields to avoid strings like "04:23 - 14:38"
      const clockIn = r.clock_in_uk || "";
      const clockOut = r.clock_out_uk || "";

      const inMin = timeToMin(clockIn);
      const outMinRaw = timeToMin(clockOut);

      // Track earliest in and latest out (normalize overnight when comparing)
      if (inMin != null)
        g.firstInMin =
          g.firstInMin == null ? inMin : Math.min(g.firstInMin, inMin);
      let outMin = outMinRaw;
      if (inMin != null && outMin != null && outMin < inMin) outMin += 1440; // crossed midnight
      if (outMin != null)
        g.lastOutMin =
          g.lastOutMin == null ? outMin : Math.max(g.lastOutMin, outMin);

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
        type: "Work",
        in: firstHHMM(clockIn) || "",
        out: lastHHMM(clockOut) || "",
        duration: minToHHMM(durMin),
      });
    }

    return Array.from(map.values()).map((g) => {
      // Derive break from span if no explicit break rows
      const derivedBreakMin =
        g.firstInMin != null && g.lastOutMin != null
          ? Math.max(0, g.lastOutMin - g.firstInMin - g.workTotalMin)
          : 0;
      const totalBreakMin =
        g.breakTotalMin > 0 ? g.breakTotalMin : derivedBreakMin;

      return {
        ...g,
        firstIn:
          g.firstInMin != null
            ? `${String(Math.floor(g.firstInMin / 60) % 24).padStart(
                2,
                "0",
              )}:${String(g.firstInMin % 60).padStart(2, "0")}`
            : "—",
        lastOut:
          g.lastOutMin != null
            ? `${String(Math.floor(g.lastOutMin / 60) % 24).padStart(
                2,
                "0",
              )}:${String(g.lastOutMin % 60).padStart(2, "0")}`
            : "—",
        workTotal: minToHHMM(g.workTotalMin),
        breakTotal: minToHHMM(totalBreakMin),
      };
    });
  }, [rawRows]);

  /* -------- Sorting (unchanged) -------- */
  const sorted = useMemo(() => {
    const arr = [...grouped];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortField) {
        case "employee":
          return safe(a.employeeName).localeCompare(safe(b.employeeName)) * dir;
        case "total":
          return (a.workTotalMin - b.workTotalMin) * dir;
        case "firstIn":
          return ((a.firstInMin ?? 1e9) - (b.firstInMin ?? 1e9)) * dir;
        case "lastOut":
          return ((a.lastOutMin ?? -1e9) - (b.lastOutMin ?? -1e9)) * dir;
        case "break":
          return (a.breakTotalMin - b.breakTotalMin) * dir;
        case "date":
        default: {
          const toKey = (d) => {
            if (!d) return 0;
            const [dd, mm, yyyy] = d.split("-").map(Number);
            return new Date(yyyy, (mm || 1) - 1, dd || 1).getTime();
          };
          return (toKey(a.date) - toKey(b.date)) * dir;
        }
      }
    });
    return arr;
  }, [grouped, sortField, sortDir]);

  // Global pagination (shared hook)
  const { page, setPage, pageSize, setPageSize, pageCount, pageRows } =
    usePagination(sorted);

  const onSort = (field) => {
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
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
      employee_id: selectedEmployee !== "all" ? selectedEmployee : "",
      from: fromDate || "",
      to: toDate || "",
    });
    try {
      const res = await api.get(
        `/reports/export/${type}?${params.toString()}`,
        {
          responseType: "blob",
        },
      );
      const blob = new Blob([res.data], {
        type: type === "csv" ? "text/csv" : "application/pdf",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `attendance_report.${type}`;
      a.click();
    } catch (e) {
      alert(`Failed to download ${type.toUpperCase()}`);
    }
  };

  /* -------- Edit Attendance -------- */

  const openEditModal = (row) => {
    const raw = rawRows.find(
      (r) =>
        (r.employee?.id ?? r.employee_id) === row.employeeId &&
        (r.date || r.day || r.attendance_date) === row.date,
    );

    if (!raw) return;

    setEditingRecord(raw);

    setEditClockIn(raw.clock_in ? raw.clock_in.slice(0, 16) : "");

    setEditClockOut(raw.clock_out ? raw.clock_out.slice(0, 16) : "");
  };

  const updateAttendance = async () => {
    try {
      await api.put("/attendance/update", {
        attendanceId: editingRecord.id,
        clock_in: editClockIn,
        clock_out: editClockOut,
      });

      setEditingRecord(null);

      fetchReports();
    } catch (err) {
      console.error(err);

      alert("Update failed");
    }
  };

  const openSessions = async (row) => {
    try {
      const [dd, mm, yyyy] = row.date.split("-");
      const isoDate = `${yyyy}-${mm}-${dd}`;

      const res = await api.get("/attendance/records", {
        params: { date: isoDate },
      });

      const rows = (res.data.items || []).filter(
        (r) => (r.employee?.id ?? r.employee_id) === row.employeeId,
      );

      setSessionRows(rows);
      setSessionOpen(true);
    } catch (err) {
      console.error(err);
      alert("Failed to load sessions");
    }
  };

  const updateSession = async (row) => {
    try {
      await api.put("/attendance/update", {
        attendanceId: row.id,
        clock_in: row.clock_in,
        clock_out: row.clock_out,
      });

      // update local state so modal refreshes instantly
      setSessionRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, ...row } : r)),
      );

      // refresh reports table
      fetchReports();
    } catch (err) {
      console.error(err);
      alert("Update failed");
    }
  };
  /* ========================= Render ========================= */
  return (
    <DashboardLayout>
      <div className="report-container">
        <h1 id="reports-title" className="reports-heading">
          Reports
        </h1>

        <div className="filter-section">
          <select
            id="reports-employee-dropdown"
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
          />
          <input
            type="date"
            className="date-picker"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />

          <button className="apply-filter-btn" onClick={fetchReports}>
            Apply Filters
          </button>

          <div className="export-buttons">
            <button onClick={() => handleDownload("csv")}>Export CSV</button>
            {/*
<button onClick={() => handleDownload('pdf')}>Export PDF</button>
*/}
          </div>
        </div>

        <div className="table-section">
          <table className="report-table">
            <thead>
              <tr>
                <th
                  onClick={() => onSort("employee")}
                  style={{ cursor: "pointer" }}
                >
                  Employee
                </th>
                <th
                  onClick={() => onSort("date")}
                  style={{ cursor: "pointer" }}
                >
                  Date
                </th>
                <th
                  onClick={() => onSort("firstIn")}
                  style={{ cursor: "pointer" }}
                >
                  First In
                </th>
                <th
                  onClick={() => onSort("lastOut")}
                  style={{ cursor: "pointer" }}
                >
                  Last Out
                </th>
                <th
                  onClick={() => onSort("total")}
                  style={{ cursor: "pointer" }}
                >
                  Hours Worked (Sum)
                </th>
                <th
                  onClick={() => onSort("break")}
                  style={{ cursor: "pointer" }}
                >
                  Break Time
                </th>
                <th>Action</th>
                <th>Sessions</th>
              </tr>
            </thead>

            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center" }}>
                    No records
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr
                    key={`${r.employeeId}-${r.date}`}
                    onMouseEnter={(e) => {
                      cancelClose();
                      setHoverSessions(r.sessions);
                      setHoverPos({ x: e.clientX + 10, y: e.clientY + 10 });
                      setHoverOpen(true);
                    }}
                    onMouseLeave={scheduleClose}
                  >
                    <td>{r.employeeName}</td>
                    <td>{r.date}</td>
                    <td>{r.firstIn}</td>
                    <td>{r.lastOut}</td>
                    <td>{r.workTotal}</td>
                    <td>{r.breakTotal}</td>
                    <td>
                      <button
                        className="edit-btn"
                        onClick={() => openEditModal(r)}
                      >
                        Edit
                      </button>
                    </td>
                    <td>
                      <button
                        className="session-btn"
                        onClick={() => openSessions(r)}
                      >
                        Sessions
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <PaginationBar
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            onChangePage={setPage}
            onChangePageSize={setPageSize}
          />
        </div>
      </div>

      {hoverOpen && (
        <div
          className="hover-card"
          style={{
            position: "fixed",
            left: hoverPos.x,
            top: hoverPos.y,
            zIndex: 9999,
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="hover-card-title">Day details</div>
          <div className="hover-card-body">
            {hoverSessions.length === 0 ? (
              <div className="hover-card-row">No sessions</div>
            ) : (
              hoverSessions.map((s, i) => (
                <div
                  key={i}
                  className={`hover-card-row ${
                    s.type === "Break" ? "is-break" : "is-work"
                  }`}
                >
                  <div className="col type">{s.type}</div>
                  <div className="col in">{s.in}</div>
                  <div className="col out">
                    {s.out ? `${s.out} • ${s.duration}` : s.duration}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {editingRecord && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <h3>Edit Attendance</h3>

            <label>Clock In</label>
            <input
              type="datetime-local"
              value={editClockIn}
              onChange={(e) => setEditClockIn(e.target.value)}
            />

            <label>Clock Out</label>
            <input
              type="datetime-local"
              value={editClockOut}
              onChange={(e) => setEditClockOut(e.target.value)}
            />

            <div className="modal-actions">
              <button className="save-btn" onClick={updateAttendance}>
                Save
              </button>

              <button
                className="cancel-btn"
                onClick={() => setEditingRecord(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {sessionOpen && (
        <div className="session-overlay">
          <div className="session-editor">
            <h3>Daily Sessions</h3>

            <table className="session-table">
              <thead>
                <tr>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Save</th>
                </tr>
              </thead>

              <tbody>
                {sessionRows.map((s, i) => (
                  <tr key={s.id}>
                    <td>
                      <input
                        type="datetime-local"
                        value={s.clock_in?.slice(0, 16) || ""}
                        onChange={(e) => {
                          const copy = [...sessionRows];
                          copy[i].clock_in = e.target.value;
                          setSessionRows(copy);
                        }}
                      />
                    </td>

                    <td>
                      <input
                        type="datetime-local"
                        value={s.clock_out?.slice(0, 16) || ""}
                        onChange={(e) => {
                          const copy = [...sessionRows];
                          copy[i].clock_out = e.target.value;
                          setSessionRows(copy);
                        }}
                      />
                    </td>

                    <td>
                      <button
                        className="save-btn"
                        onClick={() => updateSession(s)}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button className="close-btn" onClick={() => setSessionOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
