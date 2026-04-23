"""
tests/db/test_break_calculation.py
------------------------------------
Database-level tests for the automatic break-deduction business rule:

  "Shifts of 6 hours or more receive an automatic 30-minute break deduction.
   Shifts under 6 hours receive 0 minutes break."

The rule is implemented in attendanceController.js (calculateWork function):

    const breakMinutes = diffMinutes >= 360 ? 30 : 0;

These tests query the attendance table directly via DBHelper to confirm that
the persisted break_minutes and total_work_hours values are consistent with
the business rule — independent of the API layer.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.db_helper import DBHelper


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def db():
    """Provide a DBHelper instance; skip test suite if DB is unreachable."""
    helper = None
    try:
        helper = DBHelper()
        yield helper
    except Exception as exc:
        pytest.skip(f"Database not reachable: {exc}")
    finally:
        if helper:
            helper.close()


# ── Helper ────────────────────────────────────────────────────────────────────

def _parse_hhmm(hhmm: str) -> int:
    """Convert 'HH:MM' string to total minutes as an integer."""
    if not hhmm or ":" not in hhmm:
        return 0
    parts = hhmm.split(":")
    return int(parts[0]) * 60 + int(parts[1])


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.db
class TestBreakCalculation:
    """Validates break_minutes auto-deduction rules at the database level."""

    def test_break_minutes_column_exists(self, db):
        """The break_minutes column must exist in the attendance table."""
        row = db.fetch_one(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'attendance' AND column_name = 'break_minutes'"
        )
        assert row is not None, "'break_minutes' column not found in attendance table"

    def test_total_work_hours_column_exists(self, db):
        """The total_work_hours column must exist in the attendance table."""
        row = db.fetch_one(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'attendance' AND column_name = 'total_work_hours'"
        )
        assert row is not None, "'total_work_hours' column not found"

    def test_no_negative_break_minutes(self, db):
        """break_minutes should never be negative."""
        rows = db.fetch_all(
            "SELECT id, break_minutes FROM attendance "
            "WHERE break_minutes IS NOT NULL AND break_minutes < 0"
        )
        assert not rows, (
            f"Found {len(rows)} attendance records with negative break_minutes: "
            f"{[r['id'] for r in rows[:5]]}"
        )

    def test_break_minutes_is_zero_or_thirty_only(self, db):
        """
        break_minutes must be either 0 or 30 — no other values are valid
        given the current business rule.
        """
        rows = db.fetch_all(
            "SELECT id, break_minutes FROM attendance "
            "WHERE break_minutes IS NOT NULL "
            "  AND break_minutes NOT IN (0, 30)"
        )
        assert not rows, (
            f"Found records with unexpected break_minutes (not 0 or 30): "
            f"{[(r['id'], r['break_minutes']) for r in rows[:5]]}"
        )

    def test_shifts_over_6h_have_30min_break(self, db):
        """
        Every completed shift where the raw duration exceeds 6 hours (360 min)
        should have break_minutes = 30.
        """
        rows = db.fetch_all(
            """
            SELECT id,
                   EXTRACT(EPOCH FROM (clock_out - clock_in)) / 60 AS raw_minutes,
                   break_minutes,
                   total_work_hours
            FROM attendance
            WHERE clock_in IS NOT NULL
              AND clock_out IS NOT NULL
              AND break_minutes IS NOT NULL
            """
        )
        violations = []
        for r in rows:
            raw_minutes = float(r["raw_minutes"] or 0)
            if raw_minutes >= 360 and r["break_minutes"] != 30:
                violations.append({
                    "id":            r["id"],
                    "raw_minutes":   raw_minutes,
                    "break_minutes": r["break_minutes"],
                })
        assert not violations, (
            f"Shifts >= 6h without 30-min break (first 5): {violations[:5]}"
        )

    def test_shifts_under_6h_have_zero_break(self, db):
        """
        Shifts shorter than 6 hours should have break_minutes = 0.
        """
        rows = db.fetch_all(
            """
            SELECT id,
                   EXTRACT(EPOCH FROM (clock_out - clock_in)) / 60 AS raw_minutes,
                   break_minutes
            FROM attendance
            WHERE clock_in IS NOT NULL
              AND clock_out IS NOT NULL
              AND break_minutes IS NOT NULL
            """
        )
        violations = []
        for r in rows:
            raw_minutes = float(r["raw_minutes"] or 0)
            if raw_minutes < 360 and r["break_minutes"] != 0:
                violations.append({
                    "id":            r["id"],
                    "raw_minutes":   raw_minutes,
                    "break_minutes": r["break_minutes"],
                })
        assert not violations, (
            f"Shifts < 6h with non-zero break (first 5): {violations[:5]}"
        )

    @pytest.mark.parametrize("shift_hours,expected_break_min", [
        (4, 0),
        (5, 0),
        (6, 30),
        (7, 30),
        (8, 30),
        (9, 30),
    ])
    def test_break_rule_is_consistent_with_db_data(
        self, db, shift_hours, expected_break_min
    ):
        """
        Parametrised: for each shift duration, verify that matching DB records
        have the correct break_minutes value.
        """
        lower = shift_hours * 60
        upper = lower + 59  # within the same hour bracket

        rows = db.fetch_all(
            """
            SELECT id, break_minutes,
                   EXTRACT(EPOCH FROM (clock_out - clock_in)) / 60 AS raw_minutes
            FROM attendance
            WHERE clock_in IS NOT NULL
              AND clock_out IS NOT NULL
              AND break_minutes IS NOT NULL
              AND EXTRACT(EPOCH FROM (clock_out - clock_in)) / 60 BETWEEN %s AND %s
            LIMIT 10
            """,
            (lower, upper),
        )
        if not rows:
            pytest.skip(
                f"No attendance records found for shifts in the {shift_hours}h range"
            )

        for r in rows:
            assert r["break_minutes"] == expected_break_min, (
                f"Record {r['id']}: shift ~{shift_hours}h, "
                f"expected break={expected_break_min}min, "
                f"got {r['break_minutes']}min"
            )

    def test_total_work_hours_is_net_of_break(self, db):
        """
        total_work_hours should equal (raw duration − break_minutes).
        Validate this arithmetic for up to 20 completed records.
        """
        rows = db.fetch_all(
            """
            SELECT id,
                   EXTRACT(EPOCH FROM (clock_out - clock_in)) / 60 AS raw_minutes,
                   break_minutes,
                   total_work_hours
            FROM attendance
            WHERE clock_in IS NOT NULL
              AND clock_out IS NOT NULL
              AND break_minutes IS NOT NULL
              AND total_work_hours IS NOT NULL
            LIMIT 20
            """
        )
        if not rows:
            pytest.skip("No complete attendance records to verify net work hours")

        errors = []
        for r in rows:
            raw    = float(r["raw_minutes"] or 0)
            brk    = int(r["break_minutes"] or 0)
            net_db = _parse_hhmm(r["total_work_hours"])
            net_expected = max(0, round(raw) - brk)

            # Allow ±1 minute tolerance for rounding differences
            if abs(net_db - net_expected) > 1:
                errors.append({
                    "id":             r["id"],
                    "raw_minutes":    raw,
                    "break_minutes":  brk,
                    "db_net":         net_db,
                    "expected_net":   net_expected,
                    "total_wh_str":   r["total_work_hours"],
                })
        assert not errors, (
            f"total_work_hours ≠ raw − break for {len(errors)} records "
            f"(first 3): {errors[:3]}"
        )
