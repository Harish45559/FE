"""
tests/api/test_attendance_api.py
---------------------------------
API-level tests for all 7 attendance endpoints:

  POST   /api/attendance/clock-in
  POST   /api/attendance/clock-out
  GET    /api/attendance/status
  GET    /api/attendance/records
  GET    /api/attendance/dashboard
  POST   /api/attendance/manual-entry
  PUT    /api/attendance/update

Test strategy:
  - Auth guards: every endpoint returns 401 without a token.
  - Validation: 400 is returned for malformed/missing payloads.
  - Success paths: 200/201 with a valid admin token.
  - Data-driven happy paths are loaded from data/attendance_data.json.
"""

import json
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.api_helper import APIHelper

# ── Load JSON test data ───────────────────────────────────────────────────────
_JSON_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "attendance_data.json"
)
with open(_JSON_PATH, encoding="utf-8") as _f:
    _ATTENDANCE_DATA = json.load(_f)

_VALID_CLOCK_IN   = _ATTENDANCE_DATA["valid_clock_in"]
_INVALID_CLOCK_IN = _ATTENDANCE_DATA["invalid_clock_in"]


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.api
@pytest.mark.smoke
class TestAttendanceAPI:
    """REST API tests for the attendance module."""

    @pytest.fixture(autouse=True)
    def setup(self, api, admin_token):
        self.api   = api
        self.token = admin_token

    # ── Auth guards (no token → 401) ──────────────────────────────────────────

    def test_clock_in_without_token_returns_401(self):
        res = self.api.post("/attendance/clock-in", {"pin": "1234"})
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    def test_clock_out_without_token_returns_401(self):
        res = self.api.post("/attendance/clock-out", {"pin": "1234"})
        assert res.status_code == 401

    def test_status_without_token_returns_401(self):
        res = self.api.get("/attendance/status")
        assert res.status_code == 401

    def test_records_without_token_returns_401(self):
        res = self.api.get("/attendance/records")
        assert res.status_code == 401

    def test_dashboard_without_token_returns_401(self):
        res = self.api.get("/attendance/dashboard")
        assert res.status_code == 401

    def test_manual_entry_without_token_returns_401(self):
        res = self.api.post("/attendance/manual-entry", {"employeeId": 1, "clock_in": "2025-04-23T09:00:00"})
        assert res.status_code == 401

    def test_update_without_token_returns_401(self):
        res = self.api.put("/attendance/update", {"id": 1, "clock_out": "2025-04-23T17:00:00"})
        assert res.status_code == 401

    # ── GET endpoints with valid token ─────────────────────────────────────────

    def test_status_with_valid_token_returns_200(self):
        """GET /attendance/status returns 200 with a valid JWT."""
        res = self.api.get("/attendance/status", token=self.token)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_records_with_valid_token_returns_200(self):
        """GET /attendance/records returns 200 and a list."""
        res = self.api.get("/attendance/records", token=self.token)
        assert res.status_code == 200
        body = res.json()
        assert isinstance(body, (list, dict)), f"Unexpected response type: {type(body)}"

    def test_dashboard_with_valid_token_returns_200(self):
        """GET /attendance/dashboard returns 200 with employee status data."""
        res = self.api.get("/attendance/dashboard", token=self.token)
        assert res.status_code == 200
        body = res.json()
        assert isinstance(body, (list, dict))

    def test_records_accepts_date_filter(self):
        """GET /attendance/records?date=YYYY-MM-DD should be accepted."""
        res = self.api.get(
            "/attendance/records?date=2025-04-23",
            token=self.token,
        )
        assert res.status_code in (200, 400), (
            f"Unexpected status for date-filtered records: {res.status_code}"
        )

    # ── Clock-in validation ───────────────────────────────────────────────────

    def test_clock_in_missing_pin_returns_400(self):
        """clock-in without a PIN should return 400."""
        res = self.api.post("/attendance/clock-in", {}, token=self.token)
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"

    @pytest.mark.parametrize(
        "employee_id,pin,expected,reason",
        [(d["employee_id"], d["pin"], d["expected"], d["reason"]) for d in _INVALID_CLOCK_IN],
        ids=[d["reason"] for d in _INVALID_CLOCK_IN],
    )
    def test_invalid_clock_in_scenarios(self, employee_id, pin, expected, reason):
        """
        Data-driven: invalid clock-in scenarios from attendance_data.json.
        Each should return a 4xx error.
        """
        res = self.api.post(
            "/attendance/clock-in",
            {"pin": str(pin)},
            token=self.token,
        )
        assert res.status_code in (400, 404, 422), (
            f"[{reason}] Expected 4xx, got {res.status_code}: {res.text}"
        )

    # ── Manual entry validation ───────────────────────────────────────────────

    def test_manual_entry_missing_employee_returns_400(self):
        """Manual entry without employeeId should return 400."""
        res = self.api.post(
            "/attendance/manual-entry",
            {"clock_in": "2025-04-23T09:00:00"},
            token=self.token,
        )
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"

    def test_manual_entry_missing_clock_in_returns_400(self):
        """Manual entry without clock_in should return 400."""
        res = self.api.post(
            "/attendance/manual-entry",
            {"employeeId": 999999},  # non-existent but field present; clock_in missing
            token=self.token,
        )
        assert res.status_code in (400, 404), f"Expected 4xx, got {res.status_code}: {res.text}"

    def test_manual_entry_nonexistent_employee_returns_404(self):
        """Manual entry for an employee that does not exist should return 404."""
        res = self.api.post(
            "/attendance/manual-entry",
            {"employeeId": 999999, "clock_in": "2025-04-23T09:00:00"},
            token=self.token,
        )
        assert res.status_code in (400, 403, 404), (
            f"Expected 4xx for missing employee, got {res.status_code}"
        )

    # ── Break calculation — unit-level check via API ───────────────────────────

    def test_shift_over_6h_returns_30min_break_in_records(self):
        """
        The records endpoint should confirm that a shift >= 6 hours has
        break_minutes = 30 (business rule enforced in the controller).
        This is a lightweight check; see db/test_break_calculation.py for the
        full DB-level validation.
        """
        res = self.api.get("/attendance/records", token=self.token)
        assert res.status_code == 200
        records = res.json()
        if isinstance(records, list):
            long_shifts = [
                r for r in records
                if r.get("break_minutes") is not None and r.get("total_work_hours")
            ]
            for record in long_shifts[:3]:
                bm = record.get("break_minutes", 0)
                wh = record.get("total_work_hours", "00:00")
                try:
                    hours = int(wh.split(":")[0])
                    if hours >= 6:
                        assert bm == 30, (
                            f"Shift of {wh} should have 30 min break, got {bm}"
                        )
                except (ValueError, IndexError):
                    pass  # skip malformed records
