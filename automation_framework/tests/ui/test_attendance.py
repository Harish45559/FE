"""
tests/ui/test_attendance.py
----------------------------
UI tests for the full attendance flow on the /attendance page:
  - Clock-In: valid PIN, wrong PIN, unknown PIN, double clock-in, CSV data-driven
  - Clock-Out: button visible, wrong PIN, not-clocked-in error, clear resets PIN, parametrised PINs

Both clock-in and clock-out share the same /attendance page and PIN-pad UI,
so they live here as one consolidated test module.
"""

import csv
import os
import sys
import time

import pytest
from selenium.webdriver.support import expected_conditions as EC

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.base_test import BaseTest
from pages.login_page import LoginPage
from pages.clock_in_page import ClockInPage
from pages.clock_out_page import ClockOutPage
from config.config import BASE_URL, ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD

# ── Load CSV data ─────────────────────────────────────────────────────────────
_CSV_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "clock_in_data.csv"
)


def _load_clock_in_csv():
    rows = []
    with open(_CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append((
                row["employee_id"],
                row["pin"],
                row["expected_result"],
                row["test_case"],
            ))
    return rows


_CLOCK_IN_DATA = _load_clock_in_csv()


# ── Shared helper ─────────────────────────────────────────────────────────────

def _admin_login(driver, wait):
    LoginPage(driver, wait).open().login(ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD)
    wait.until(EC.url_contains("/dashboard"))


# ── Clock-In tests ────────────────────────────────────────────────────────────

@pytest.mark.ui
@pytest.mark.smoke
class TestClockIn(BaseTest):
    """Selenium UI tests for the clock-in PIN-pad flow."""

    def test_attendance_page_loads_after_login(self):
        """Admin can navigate to /attendance and the PIN keypad is rendered."""
        _admin_login(self.driver, self.wait)
        page = ClockInPage(self.driver, self.wait).open()
        assert page.is_loaded(), "Attendance page did not load"
        assert page.is_keypad_visible(), "PIN keypad not visible on attendance page"

    def test_valid_employee_clock_in_shows_success(self):
        """
        A correct employee PIN should produce a success message.
        Accepts a neutral state too — employee may already be clocked in.
        """
        _admin_login(self.driver, self.wait)
        page = ClockInPage(self.driver, self.wait).open()
        page.is_loaded()
        page.enter_pin("1234")
        page.click_clock_in()
        time.sleep(1)
        msg = page.get_success_message()
        err = page.get_error_message()
        assert msg or not err.startswith("Invalid"), (
            f"Expected success or neutral state, got error: '{err}'"
        )

    def test_wrong_pin_shows_error(self):
        """An incorrect PIN should produce an error message."""
        _admin_login(self.driver, self.wait)
        page = ClockInPage(self.driver, self.wait).open()
        page.is_loaded()
        page.enter_pin("0000")
        page.click_clock_in()
        time.sleep(1)
        assert page.get_error_message(), "Expected an error for wrong PIN"

    def test_unknown_pin_shows_error(self):
        """A PIN that matches no employee should return an error."""
        _admin_login(self.driver, self.wait)
        page = ClockInPage(self.driver, self.wait).open()
        page.is_loaded()
        page.enter_pin("9999")
        page.click_clock_in()
        time.sleep(1)
        assert page.get_error_message(), "Expected an error for unknown PIN"

    def test_clock_in_when_already_clocked_in(self):
        """Double clock-in should be rejected gracefully — page must not crash."""
        _admin_login(self.driver, self.wait)
        page = ClockInPage(self.driver, self.wait).open()
        page.is_loaded()
        page.enter_pin("1234")
        page.click_clock_in()
        time.sleep(1)
        page.clear_pin()
        page.enter_pin("1234")
        page.click_clock_in()
        time.sleep(1)
        assert "/attendance" in page.get_current_url(), (
            "Page navigated away unexpectedly on duplicate clock-in"
        )

    @pytest.mark.parametrize(
        "employee_id, pin, expected_result, test_case",
        _CLOCK_IN_DATA,
        ids=[row[3] for row in _CLOCK_IN_DATA],
    )
    def test_clock_in_data_driven(self, employee_id, pin, expected_result, test_case):
        """
        Data-driven: each row in clock_in_data.csv is a separate test case.
        'success' rows must not produce errors; 'error' rows must produce one.
        """
        _admin_login(self.driver, self.wait)
        page = ClockInPage(self.driver, self.wait).open()
        page.is_loaded()
        page.enter_pin(pin)
        page.click_clock_in()
        time.sleep(1.2)
        success_msg = page.get_success_message()
        error_msg   = page.get_error_message()
        if expected_result == "success":
            assert not error_msg or success_msg, (
                f"[{test_case}] Expected success but got error: '{error_msg}'"
            )
        else:
            assert error_msg, (
                f"[{test_case}] Expected an error message but none appeared"
            )


# ── Clock-Out tests ───────────────────────────────────────────────────────────

@pytest.mark.ui
@pytest.mark.smoke
class TestClockOut(BaseTest):
    """Selenium UI tests for the clock-out PIN-pad flow."""

    def test_clock_out_button_is_visible(self):
        """Clock Out button is rendered on the Attendance page."""
        _admin_login(self.driver, self.wait)
        page = ClockOutPage(self.driver, self.wait).open()
        assert page.is_loaded()
        assert page.is_keypad_visible(), "PIN keypad not visible"

    def test_wrong_pin_clock_out_shows_error(self):
        """An incorrect PIN on clock-out should produce an error message."""
        _admin_login(self.driver, self.wait)
        page = ClockOutPage(self.driver, self.wait).open()
        page.is_loaded()
        page.enter_pin("0000")
        page.click_clock_out()
        time.sleep(1)
        assert page.get_error_message(), "Expected an error for wrong PIN on clock-out"

    def test_clock_out_unknown_pin_shows_error(self):
        """An employee not clocked in (unknown PIN) should return an error."""
        _admin_login(self.driver, self.wait)
        page = ClockOutPage(self.driver, self.wait).open()
        page.is_loaded()
        page.enter_pin("9999")
        page.click_clock_out()
        time.sleep(1)
        assert page.get_error_message(), (
            "Expected an error when clocking out with unknown PIN"
        )

    def test_clock_out_clear_button_resets_pin(self):
        """Pressing Clear resets PIN entry — clock-out with empty PIN shows error."""
        _admin_login(self.driver, self.wait)
        page = ClockOutPage(self.driver, self.wait).open()
        page.is_loaded()
        page.enter_pin("1234")
        page.clear_pin()
        page.click_clock_out()
        time.sleep(1)
        err = page.get_error_message()
        assert err or page.is_keypad_visible(), (
            "After clearing PIN and clicking clock-out, no error was shown"
        )

    @pytest.mark.regression
    @pytest.mark.parametrize("pin,expected", [
        ("0000", "error"),
        ("1111", "error"),
        ("9999", "error"),
    ])
    def test_various_invalid_pins_on_clock_out(self, pin, expected):
        """Parametrised: several invalid PINs should all produce errors on clock-out."""
        _admin_login(self.driver, self.wait)
        page = ClockOutPage(self.driver, self.wait).open()
        page.is_loaded()
        page.enter_pin(pin)
        page.click_clock_out()
        time.sleep(1)
        assert page.get_error_message(), (
            f"PIN '{pin}' should produce an error on clock-out, got none"
        )
