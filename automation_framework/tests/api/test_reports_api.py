"""
tests/api/test_reports_api.py
------------------------------
API tests for the attendance reports endpoints:

  GET  /api/reports                   — full report list
  GET  /api/reports/summary           — daily summary
  GET  /api/reports/detailed-sessions — per-session detail
  GET  /api/reports/export/csv        — CSV download
  GET  /api/reports/export/pdf        — PDF download

Covered scenarios:
  - Auth guard: all endpoints return 401 without a token.
  - 200 with valid token.
  - Response shapes (array / object).
  - Filter parameters accepted without errors.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.api_helper import APIHelper


@pytest.mark.api
@pytest.mark.regression
class TestReportsAPI:
    """REST API tests for the /api/reports endpoints."""

    @pytest.fixture(autouse=True)
    def setup(self, api, admin_token):
        self.api   = api
        self.token = admin_token

    # ── Auth guards ───────────────────────────────────────────────────────────

    @pytest.mark.parametrize("path", [
        "/reports",
        "/reports/summary",
        "/reports/detailed-sessions",
        "/reports/export/csv",
        "/reports/export/pdf",
    ])
    def test_reports_without_token_returns_401(self, path):
        """Every reports endpoint requires a valid JWT."""
        res = self.api.get(path)
        assert res.status_code == 401, (
            f"Expected 401 on {path} without token, got {res.status_code}"
        )

    # ── GET /api/reports ──────────────────────────────────────────────────────

    def test_get_reports_returns_200(self):
        """GET /reports returns 200 with valid admin token."""
        res = self.api.get("/reports", token=self.token)
        assert res.status_code == 200, (
            f"Expected 200, got {res.status_code}: {res.text}"
        )

    def test_get_reports_returns_array(self):
        """Report list response should be a JSON array."""
        res = self.api.get("/reports", token=self.token)
        assert res.status_code == 200
        assert isinstance(res.json(), list), (
            f"Expected list from /reports, got: {type(res.json())}"
        )

    def test_get_reports_accepts_employee_filter(self):
        """GET /reports?employee_id=all should be accepted (no 4xx)."""
        res = self.api.get("/reports?employee_id=all", token=self.token)
        assert res.status_code in (200, 204), (
            f"Filter by employee_id=all returned {res.status_code}"
        )

    def test_get_reports_accepts_date_range_filter(self):
        """GET /reports?from=...&to=... should return 200."""
        res = self.api.get(
            "/reports?from=2025-01-01&to=2025-12-31", token=self.token
        )
        assert res.status_code == 200, (
            f"Date range filter returned {res.status_code}: {res.text}"
        )

    # ── GET /api/reports/summary ──────────────────────────────────────────────

    def test_daily_summary_returns_200(self):
        """GET /reports/summary returns 200 with a stats object."""
        res = self.api.get("/reports/summary", token=self.token)
        assert res.status_code == 200, (
            f"Expected 200 from /reports/summary, got {res.status_code}: {res.text}"
        )

    def test_daily_summary_returns_object_or_array(self):
        """Summary response should be a dict or list."""
        res = self.api.get("/reports/summary", token=self.token)
        assert res.status_code == 200
        assert isinstance(res.json(), (dict, list)), (
            f"Unexpected type from /reports/summary: {type(res.json())}"
        )

    # ── GET /api/reports/detailed-sessions ───────────────────────────────────

    def test_detailed_sessions_requires_params(self):
        """GET /reports/detailed-sessions without params returns 400."""
        res = self.api.get("/reports/detailed-sessions", token=self.token)
        assert res.status_code == 400, (
            f"Expected 400 when params are missing, got {res.status_code}"
        )

    def test_detailed_sessions_with_params_returns_200(self):
        """GET /reports/detailed-sessions with employee_id and date returns 200."""
        res = self.api.get(
            "/reports/detailed-sessions?employee_id=1&date=2025-04-23",
            token=self.token,
        )
        # 200 = data found; 404 = no records for that employee/date — both valid
        assert res.status_code in (200, 404), (
            f"Expected 200 or 404 from /reports/detailed-sessions, got {res.status_code}: {res.text}"
        )

    # ── Export endpoints ──────────────────────────────────────────────────────

    def test_export_csv_returns_200_or_204(self):
        """GET /reports/export/csv should return a downloadable response."""
        res = self.api.get("/reports/export/csv", token=self.token)
        assert res.status_code in (200, 204), (
            f"CSV export returned {res.status_code}: {res.text[:200]}"
        )

    def test_export_pdf_returns_200_or_204(self):
        """GET /reports/export/pdf should return a downloadable response."""
        res = self.api.get("/reports/export/pdf", token=self.token)
        assert res.status_code in (200, 204), (
            f"PDF export returned {res.status_code}: {res.text[:200]}"
        )
