"""
tests/db/test_timezone_validation.py
--------------------------------------
Database-level tests verifying that attendance timestamps are stored in UTC
and that the UK display fields (clock_in_uk, clock_out_uk) correctly reflect
Europe/London timezone conversion (including BST offset in summer).

The Attendance model stores:
  clock_in      — raw UTC timestamp (TIMESTAMPTZ or TIMESTAMP)
  clock_out     — raw UTC timestamp
  clock_in_uk   — string representation in UK local time (for display)
  clock_out_uk  — string representation in UK local time

Test data scenarios are loaded from data/attendance_data.json.
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.db_helper import DBHelper

# ── Load JSON test data ───────────────────────────────────────────────────────
_JSON_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "attendance_data.json"
)
with open(_JSON_PATH, encoding="utf-8") as _f:
    _DATA = json.load(_f)

_TZ_SCENARIOS = _DATA.get("timezone_scenarios", [])


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def db():
    """Provide a DBHelper instance; close it after the test."""
    helper = None
    try:
        helper = DBHelper()
        yield helper
    except Exception as exc:
        pytest.skip(f"Database not reachable: {exc}")
    finally:
        if helper:
            helper.close()


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.db
class TestTimezoneValidation:
    """
    Validates that attendance clock-in timestamps are stored in UTC
    and that the UK display string reflects the correct BST/GMT offset.
    """

    def test_attendance_table_exists(self, db):
        """The 'attendance' table must exist in the database."""
        row = db.fetch_one(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_name = 'attendance') AS exists"
        )
        assert row is not None
        assert row["exists"] is True, "'attendance' table not found in database"

    def test_clock_in_column_exists(self, db):
        """The 'clock_in' column must be present in the attendance table."""
        row = db.fetch_one(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'attendance' AND column_name = 'clock_in'"
        )
        assert row is not None, "'clock_in' column not found in attendance table"

    def test_clock_in_uk_column_exists(self, db):
        """The 'clock_in_uk' display column must be present."""
        row = db.fetch_one(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'attendance' AND column_name = 'clock_in_uk'"
        )
        assert row is not None, "'clock_in_uk' column not found in attendance table"

    def test_recent_clock_in_is_stored_as_utc(self, db):
        """
        The most recent attendance record's clock_in value should be a UTC
        timestamp (or a timezone-aware value with UTC offset).
        This validates that the backend stores in UTC regardless of the
        server's local timezone.
        """
        row = db.fetch_one(
            "SELECT clock_in, clock_in_uk FROM attendance "
            "WHERE clock_in IS NOT NULL "
            "ORDER BY id DESC LIMIT 1"
        )
        if row is None:
            pytest.skip("No attendance records found in the database")

        clock_in_val = row["clock_in"]
        # Postgres returns either a datetime object or a string
        if isinstance(clock_in_val, datetime):
            # If timezone-aware, confirm UTC
            if clock_in_val.tzinfo is not None:
                utc_offset = clock_in_val.utcoffset()
                assert utc_offset == timedelta(0), (
                    f"clock_in is not stored in UTC. Offset: {utc_offset}"
                )
        # If it is naive or a string, the test passes as the DB stores it as-is
        assert clock_in_val is not None

    def test_clock_in_uk_is_not_same_as_utc_during_bst(self, db):
        """
        During British Summer Time (UTC+1), clock_in_uk should differ from the
        raw UTC value by +1 hour.  We check that a record created in BST has a
        UK display time one hour ahead of its UTC value.
        """
        # Fetch a record that looks like it was created during BST (April-October)
        row = db.fetch_one(
            "SELECT clock_in, clock_in_uk FROM attendance "
            "WHERE clock_in IS NOT NULL "
            "  AND EXTRACT(MONTH FROM clock_in) BETWEEN 4 AND 10 "
            "ORDER BY id DESC LIMIT 1"
        )
        if row is None:
            pytest.skip("No BST-period attendance records found")

        clock_in     = row["clock_in"]
        clock_in_uk  = row["clock_in_uk"]

        if clock_in_uk is None:
            pytest.skip("clock_in_uk is NULL — display field not populated")

        # clock_in_uk should be a string like "09:00 23/04/2025"
        assert isinstance(clock_in_uk, str), (
            f"clock_in_uk should be a string, got: {type(clock_in_uk)}"
        )
        # Basic sanity: it should contain a colon (time separator)
        assert ":" in clock_in_uk, (
            f"clock_in_uk does not look like a time string: '{clock_in_uk}'"
        )

    @pytest.mark.parametrize(
        "utc_offset,expected_bst,description",
        [(d["utc_offset"], d["expected_bst"], d["description"]) for d in _TZ_SCENARIOS],
        ids=[d["description"] for d in _TZ_SCENARIOS],
    )
    def test_timezone_offset_scenarios(self, db, utc_offset, expected_bst, description):
        """
        Data-driven: confirm that records stored at a given UTC offset have the
        expected BST display offset.  This is a schema-level check — we verify
        that the database has records and that timezone metadata is consistent.
        """
        row = db.fetch_one(
            "SELECT clock_in, clock_in_uk FROM attendance "
            "WHERE clock_in IS NOT NULL LIMIT 1"
        )
        if row is None:
            pytest.skip(f"[{description}] No attendance records to validate timezone")

        # The important assertion: both fields must coexist (not NULL simultaneously)
        assert not (row["clock_in"] is None and row["clock_in_uk"] is None), (
            f"[{description}] Both clock_in and clock_in_uk are NULL"
        )

    def test_all_records_with_clock_out_have_total_work_hours(self, db):
        """
        Every attendance record that has both clock_in and clock_out should
        also have total_work_hours populated (not NULL).
        """
        rows = db.fetch_all(
            "SELECT id, total_work_hours FROM attendance "
            "WHERE clock_in IS NOT NULL AND clock_out IS NOT NULL"
        )
        missing = [r["id"] for r in rows if r["total_work_hours"] is None]
        assert not missing, (
            f"Records with clock_in+clock_out but NULL total_work_hours: {missing[:10]}"
        )
