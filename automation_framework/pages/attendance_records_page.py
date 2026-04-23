"""
pages/attendance_records_page.py
---------------------------------
Page Object for the Attendance Records view accessible from the Attendance
page.  Admins can filter records by date and see who clocked in/out.
"""

import sys
import os

from selenium.webdriver.common.by import By

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from pages.base_page import BasePage
from config.config import BASE_URL


class AttendanceRecordsPage(BasePage):
    """
    Covers the attendance records table / view accessible to admin users.
    """

    URL = f"{BASE_URL}/attendance"

    # ── Locators ──────────────────────────────────────────────────────────────
    HEADING        = (By.CSS_SELECTOR, "h1.att-title")
    DATE_PICKER    = (By.CSS_SELECTOR, "input[type='date'], .att-date-picker")
    SEARCH_BTN     = (By.CSS_SELECTOR, ".att-search-btn, [data-testid='search-records']")
    RECORDS_TABLE  = (By.CSS_SELECTOR, ".att-records-table, table.records")
    RECORD_ROWS    = (By.CSS_SELECTOR, ".att-records-table tbody tr, table.records tbody tr")
    FIRST_ROW_NAME = (By.CSS_SELECTOR, ".att-records-table tbody tr:first-child td:first-child")
    NO_RECORDS_MSG = (By.CSS_SELECTOR, ".att-no-records, [data-testid='no-records']")
    EMPLOYEE_CARDS = (By.CSS_SELECTOR, ".att-card")

    # ── Navigation ────────────────────────────────────────────────────────────

    def open(self) -> "AttendanceRecordsPage":
        self.navigate_to(self.URL)
        return self

    def is_loaded(self) -> bool:
        self.wait_for_url_contains("/attendance")
        return self.wait_for_visible(self.HEADING).is_displayed()

    # ── Actions ───────────────────────────────────────────────────────────────

    def select_date(self, date_str: str):
        """
        Set the date picker to *date_str*.

        Parameters
        ----------
        date_str : str  ISO format YYYY-MM-DD.
        """
        field = self.wait_for_visible(self.DATE_PICKER)
        field.clear()
        field.send_keys(date_str)

    def search_by_date(self):
        """Click the search / filter button."""
        if self.is_element_present(self.SEARCH_BTN):
            self.click(self.SEARCH_BTN)

    # ── Queries ───────────────────────────────────────────────────────────────

    def get_records_count(self) -> int:
        """Return the number of rows currently visible in the records table."""
        rows = self.find_all(self.RECORD_ROWS)
        return len(rows)

    def get_first_record_employee(self) -> str:
        """Return the employee name / text from the first row."""
        try:
            return self.get_text(self.FIRST_ROW_NAME)
        except Exception:
            return ""

    def get_employee_cards(self) -> list:
        return self.find_all(self.EMPLOYEE_CARDS)

    def is_no_records_message_visible(self) -> bool:
        return self.is_visible(self.NO_RECORDS_MSG)
