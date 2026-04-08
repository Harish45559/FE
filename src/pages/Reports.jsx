import React, { useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import DashboardLayout from "../components/DashboardLayout";
import api from "../services/api";
import "./Reports.css";
import usePagination from "../hooks/usePagination";
import PaginationBar from "../components/PaginationBar";

/* ── Helpers ── */
const safe = (v) => (v == null ? "" : String(v));

const firstHHMM = (s) => {
  if (!s) return null;
  const m = String(s).match(/\b(\d{1,2}:\d{2})(?::\d{2})?\b/);
  return m ? m[1] : null;
};

const lastHHMM = (s) => {
  if (!s) return null;
  const matches = String(s).match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g);
  if (!matches) return firstHHMM(s);
  return matches[matches.length - 1];
};

const timeToMin = (s) => {
  const t = firstHHMM(s);
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

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

const minToHHMM = (mins) => {
  const m = Math.max(0, Math.round(mins || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${String(h).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

const SortIcon = ({ field, sortField, sortDir }) => {
  if (field !== sortField) return <span className="rp-sort-icon">↕</span>;
  return (
    <span className="rp-sort-icon active">{sortDir === "asc" ? "↑" : "↓"}</span>
  );
};

export default function Reports() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(false);

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
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());

  /* ── Load employees ── */
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

  /* ── Load reports ── */
  const fetchReports = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedEmployee, fromDate, toDate]);

  /* ── Group & Sum ── */
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
      const clockIn = r.clock_in_uk || "";
      const clockOut = r.clock_out_uk || "";
      const inMin = timeToMin(clockIn);
      const outMinRaw = timeToMin(clockOut);

      if (inMin != null)
        g.firstInMin =
          g.firstInMin == null ? inMin : Math.min(g.firstInMin, inMin);
      let outMin = outMinRaw;
      if (inMin != null && outMin != null && outMin < inMin) outMin += 1440;
      if (outMin != null)
        g.lastOutMin =
          g.lastOutMin == null ? outMin : Math.max(g.lastOutMin, outMin);

      let durMin = durationToMin(r.total_work_hhmm ?? r.total_work_hours);
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
            ? `${String(Math.floor(g.firstInMin / 60) % 24).padStart(2, "0")}:${String(g.firstInMin % 60).padStart(2, "0")}`
            : "—",
        lastOut:
          g.lastOutMin != null
            ? `${String(Math.floor(g.lastOutMin / 60) % 24).padStart(2, "0")}:${String(g.lastOutMin % 60).padStart(2, "0")}`
            : "—",
        workTotal: minToHHMM(g.workTotalMin),
        breakTotal: minToHHMM(totalBreakMin),
      };
    });
  }, [rawRows]);

  /* ── Sorting ── */
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

  const { page, setPage, pageSize, setPageSize, pageCount, pageRows } =
    usePagination(sorted);

  const onSort = (field) => {
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  /* ── Hover ── */
  const cancelClose = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };
  const scheduleClose = () => {
    hoverTimerRef.current = setTimeout(() => setHoverOpen(false), 120);
  };

  /* ── Export ── */
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

  /* ── UK time helpers ── */
  const ukStrToInputVal = (ukStr) => {
    if (!ukStr) return "";
    const [datePart, timePart] = ukStr.split(" ");
    if (!datePart || !timePart) return "";
    const [dd, mm, yyyy] = datePart.split("/");
    return `${yyyy}-${mm}-${dd}T${timePart}`;
  };

  const inputValToUTC = (localVal) => {
    if (!localVal) return null;
    return DateTime.fromISO(localVal, { zone: "Europe/London" })
      .toUTC()
      .toISO();
  };

  /* ── Edit modal ── */
  const openEditModal = (row) => {
    const raw = rawRows.find(
      (r) =>
        (r.employee?.id ?? r.employee_id) === row.employeeId &&
        (r.date || r.day || r.attendance_date) === row.date,
    );
    if (!raw) return;
    setEditingRecord(raw);
    setEditClockIn(ukStrToInputVal(raw.clock_in_uk));
    setEditClockOut(ukStrToInputVal(raw.clock_out_uk));
  };

  const updateAttendance = async () => {
    try {
      await api.put("/attendance/update", {
        attendanceId: editingRecord.id,
        clock_in: inputValToUTC(editClockIn),
        clock_out: inputValToUTC(editClockOut),
      });
      setEditingRecord(null);
      fetchReports();
    } catch (err) {
      console.error(err);
      alert("Update failed");
    }
  };

  /* ── Sessions modal ── */
  const openSessions = async (row) => {
    try {
      const [dd, mm, yyyy] = row.date.split("-");
      const isoDate = `${yyyy}-${mm}-${dd}`;
      const res = await api.get("/attendance/records", {
        params: { date: isoDate },
      });
      const filtered = (res.data.items || []).filter(
        (r) => (r.employee?.id ?? r.employee_id) === row.employeeId,
      );
      const mapped = filtered.map((r) => ({
        ...r,
        clock_in_input: ukStrToInputVal(r.clock_in_uk),
        clock_out_input: ukStrToInputVal(r.clock_out_uk),
      }));
      setSessionRows(mapped);
      setSavedIds(new Set());
      setSavingIds(new Set());
      setSessionOpen(true);
    } catch (err) {
      console.error(err);
      alert("Failed to load sessions");
    }
  };

  const updateSession = async (row) => {
    setSavingIds((prev) => new Set(prev).add(row.id));
    try {
      await api.put("/attendance/update", {
        attendanceId: row.id,
        clock_in: inputValToUTC(row.clock_in_input),
        clock_out: inputValToUTC(row.clock_out_input),
      });
      setSavedIds((prev) => new Set(prev).add(row.id));
      fetchReports();
    } catch (err) {
      console.error(err);
      alert("Update failed");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  const closeSessionModal = () => {
    setSessionOpen(false);
    setSessionRows([]);
    setSavedIds(new Set());
    setSavingIds(new Set());
  };

  /* ── Render ── */
  return (
    <DashboardLayout>
      <div className="rp-container">
        {/* Header */}
        <div className="rp-header">
          <div>
            <h1 className="rp-title">Reports</h1>
            <p className="rp-subtitle">Attendance records for all employees</p>
          </div>
          {loading && <span className="rp-loading">Loading…</span>}
        </div>

        {/* Filters */}
        <div className="rp-filters">
          <select
            id="rp-employee-select"
            className="rp-select"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="all">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </option>
            ))}
          </select>

          <input
            id="rp-from-date"
            type="date"
            className="rp-date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <input
            id="rp-to-date"
            type="date"
            className="rp-date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />

          <button id="rp-btn-apply" className="rp-apply-btn" onClick={fetchReports}>
            Apply
          </button>

          <div className="rp-exports">
            <button
              id="rp-btn-export-csv"
              className="rp-export-btn rp-export-csv"
              onClick={() => handleDownload("csv")}
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                {[
                  { key: "employee", label: "Employee" },
                  { key: "date", label: "Date" },
                  { key: "firstIn", label: "First in" },
                  { key: "lastOut", label: "Last out" },
                  { key: "total", label: "Hours worked" },
                  { key: "break", label: "Break" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => onSort(key)}
                    className="rp-th-sort"
                  >
                    {label}{" "}
                    <SortIcon
                      field={key}
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </th>
                ))}
                <th className="rp-th-center">Edit</th>
                <th className="rp-th-center">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="rp-empty">
                    {loading ? "Loading records…" : "No records found"}
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr
                    key={`${r.employeeId}-${r.date}`}
                    id={`rp-row-${r.employeeId}-${r.date}`}
                    onMouseEnter={(e) => {
                      cancelClose();
                      setHoverSessions(r.sessions);
                      setHoverPos({ x: e.clientX + 10, y: e.clientY + 10 });
                      setHoverOpen(true);
                    }}
                    onMouseLeave={scheduleClose}
                  >
                    <td className="rp-name-cell">
                      <div
                        className="rp-avatar"
                        style={{
                          background: `hsl(${(r.employeeId * 47) % 360}, 60%, 92%)`,
                          color: `hsl(${(r.employeeId * 47) % 360}, 50%, 30%)`,
                        }}
                      >
                        {r.employeeName
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <span>{r.employeeName}</span>
                    </td>
                    <td className="rp-date-cell">{r.date}</td>
                    <td className="rp-time-cell">{r.firstIn}</td>
                    <td className="rp-time-cell">{r.lastOut}</td>
                    <td className="rp-hours-cell">
                      <span className="rp-hours-badge">{r.workTotal}</span>
                    </td>
                    <td className="rp-time-cell rp-muted">{r.breakTotal}</td>
                    <td className="rp-action-cell">
                      <button
                        id={`rp-btn-edit-${r.employeeId}-${r.date}`}
                        className="rp-btn rp-btn-edit"
                        title="Edit attendance"
                        onClick={() => openEditModal(r)}
                      >
                        Edit
                      </button>
                    </td>
                    <td className="rp-action-cell">
                      <button
                        id={`rp-btn-sessions-${r.employeeId}-${r.date}`}
                        className="rp-btn rp-btn-sessions"
                        title="View sessions"
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

      {/* Hover tooltip */}
      {hoverOpen && (
        <div
          className="rp-hover-card"
          style={{
            position: "fixed",
            left: hoverPos.x,
            top: hoverPos.y,
            zIndex: 9999,
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="rp-hover-title">Day details</div>
          <div className="rp-hover-body">
            {hoverSessions.length === 0 ? (
              <div className="rp-hover-row">No sessions</div>
            ) : (
              hoverSessions.map((s, i) => (
                <div
                  key={i}
                  className={`rp-hover-row ${s.type === "Break" ? "is-break" : "is-work"}`}
                >
                  <span className="rp-hover-type">{s.type}</span>
                  <span className="rp-hover-time">{s.in}</span>
                  <span className="rp-hover-dur">
                    {s.out ? `${s.out} · ${s.duration}` : s.duration}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingRecord && (
        <div
          className="rp-modal-overlay"
          onClick={() => setEditingRecord(null)}
        >
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rp-modal-header">
              <span className="rp-modal-title">Edit attendance</span>
              <button
                id="rp-edit-modal-close"
                className="rp-modal-close"
                onClick={() => setEditingRecord(null)}
              >
                ✕
              </button>
            </div>
            <div className="rp-modal-body">
              <div className="rp-modal-field">
                <label className="rp-modal-label">Clock in</label>
                <input
                  id="rp-edit-clock-in"
                  className="rp-modal-input"
                  type="datetime-local"
                  value={editClockIn}
                  onChange={(e) => setEditClockIn(e.target.value)}
                />
              </div>
              <div className="rp-modal-field">
                <label className="rp-modal-label">Clock out</label>
                <input
                  id="rp-edit-clock-out"
                  className="rp-modal-input"
                  type="datetime-local"
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                />
              </div>
            </div>
            <div className="rp-modal-footer">
              <button
                id="rp-edit-modal-cancel"
                className="rp-modal-cancel"
                onClick={() => setEditingRecord(null)}
              >
                Cancel
              </button>
              <button id="rp-edit-modal-save" className="rp-modal-save" onClick={updateAttendance}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions modal */}
      {sessionOpen && (
        <div className="rp-modal-overlay" onClick={closeSessionModal}>
          <div
            className="rp-modal rp-modal--wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rp-modal-header">
              <span className="rp-modal-title">Daily sessions</span>
              <button id="rp-sessions-modal-close" className="rp-modal-close" onClick={closeSessionModal}>
                ✕
              </button>
            </div>
            <div className="rp-modal-body">
              {sessionRows.length === 0 ? (
                <p className="rp-empty" style={{ padding: "1rem 0" }}>
                  No sessions found
                </p>
              ) : (
                <table className="rp-session-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Clock in</th>
                      <th>Clock out</th>
                      <th>Save</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionRows.map((s, i) => {
                      const isSaved = savedIds.has(s.id);
                      const isSaving = savingIds.has(s.id);
                      return (
                        <tr
                          key={s.id}
                          id={`rp-session-row-${s.id}`}
                          className={isSaved ? "rp-session-saved" : ""}
                        >
                          <td className="rp-session-num">{i + 1}</td>
                          <td>
                            <input
                              className="rp-modal-input"
                              type="datetime-local"
                              value={s.clock_in_input || ""}
                              onChange={(e) => {
                                const copy = [...sessionRows];
                                copy[i] = {
                                  ...copy[i],
                                  clock_in_input: e.target.value,
                                };
                                setSavedIds((prev) => {
                                  const n = new Set(prev);
                                  n.delete(s.id);
                                  return n;
                                });
                                setSessionRows(copy);
                              }}
                            />
                          </td>
                          <td>
                            <input
                              className="rp-modal-input"
                              type="datetime-local"
                              value={s.clock_out_input || ""}
                              onChange={(e) => {
                                const copy = [...sessionRows];
                                copy[i] = {
                                  ...copy[i],
                                  clock_out_input: e.target.value,
                                };
                                setSavedIds((prev) => {
                                  const n = new Set(prev);
                                  n.delete(s.id);
                                  return n;
                                });
                                setSessionRows(copy);
                              }}
                            />
                          </td>
                          <td>
                            <button
                              id={`rp-session-save-${s.id}`}
                              className={`rp-session-save-btn${isSaved ? " saved" : ""}`}
                              disabled={isSaving}
                              onClick={() => updateSession(s)}
                            >
                              {isSaving
                                ? "Saving…"
                                : isSaved
                                  ? "✓ Saved"
                                  : "Save"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="rp-modal-footer">
              <button id="rp-sessions-modal-done" className="rp-modal-save" onClick={closeSessionModal}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
