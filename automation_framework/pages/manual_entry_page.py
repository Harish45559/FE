"""
pages/manual_entry_page.py
--------------------------
Page Object for the Manual Attendance Entry form.
Only admin users can access this form (POST /api/attendance/manual-entry).
The form is typically accessible from a modal or section within the
Attendance page.
"""

import sys
import os

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from pages.base_page import BasePage
from config.config import BASE_URL


class ManualEntryPage(BasePage):
    """
    Handles the manual attendance entry form available to admin users.
    """

    URL = f"{BASE_URL}/attendance"

    # ── Locators ──────────────────────────────────────────────────────────────
    OPEN_FORM_BTN    = (By.CSS_SELECTOR, ".att-manual-btn, [data-testid='manual-entry-btn']")
    FORM             = (By.CSS_SELECTOR, ".att-manual-form, [data-testid='manual-entry-form']")
    EMPLOYEE_SELECT  = (By.CSS_SELECTOR, "select[name='employeeId'], #manual-employee")
    DATE_INPUT       = (By.CSS_SELECTOR, "input[name='date'], #manual-date")
    CLOCK_IN_INPUT   = (By.CSS_SELECTOR, "input[name='clock_in'], #manual-clock-in")
    CLOCK_OUT_INPUT  = (By.CSS_SELECTOR, "input[name='clock_out'], #manual-clock-out")
    SUBMIT_BTN       = (By.CSS_SELECTOR, ".att-manual-submit, [data-testid='manual-submit']")
    SUCCESS_MSG      = (By.CSS_SELECTOR, ".att-success, .alert.success, [data-testid='manual-success']")
    ERROR_MSG        = (By.CSS_SELECTOR, ".att-error, .alert.error, [data-testid='manual-error']")
    VALIDATION_MSGS  = (By.CSS_SELECTOR, ".field-err, .validation-error")

    # ── Navigation ────────────────────────────────────────────────────────────

    def open(self) -> "ManualEntryPage":
        self.navigate_to(self.URL)
        return self

    def open_form(self):
        """Click the button that reveals the manual entry form."""
        if self.is_element_present(self.OPEN_FORM_BTN):
            self.click(self.OPEN_FORM_BTN)

    def is_form_visible(self) -> bool:
        return self.is_visible(self.FORM)

    # ── Actions ───────────────────────────────────────────────────────────────

    def fill_form(
        self,
        employee_id: str,
        date: str,
        clock_in_time: str,
        clock_out_time: str = "",
    ):
        """
        Populate the manual entry form fields.

        Parameters
        ----------
        employee_id    : str  Employee ID to select from the dropdown.
        date           : str  Date string, e.g. '2025-04-23'.
        clock_in_time  : str  ISO datetime string e.g. '2025-04-23T09:00'.
        clock_out_time : str  Optional ISO datetime for clock-out.
        """
        # Employee dropdown
        if self.is_element_present(self.EMPLOYEE_SELECT):
            Select(self.find(self.EMPLOYEE_SELECT)).select_by_value(str(employee_id))

        # Date
        if self.is_element_present(self.DATE_INPUT):
            self.type_text(self.DATE_INPUT, date)

        # Clock in
        self.type_text(self.CLOCK_IN_INPUT, clock_in_time)

        # Clock out (optional)
        if clock_out_time and self.is_element_present(self.CLOCK_OUT_INPUT):
            self.type_text(self.CLOCK_OUT_INPUT, clock_out_time)

    def submit(self):
        """Click the form submit button."""
        self.click(self.SUBMIT_BTN)

    # ── Queries ───────────────────────────────────────────────────────────────

    def get_success_message(self) -> str:
        try:
            return self.get_text(self.SUCCESS_MSG)
        except Exception:
            return ""

    def get_error_message(self) -> str:
        try:
            return self.get_text(self.ERROR_MSG)
        except Exception:
            return ""

    def get_validation_messages(self) -> list:
        return [el.text for el in self.find_all(self.VALIDATION_MSGS) if el.is_displayed()]
