"""
pages/clock_out_page.py
-----------------------
Page Object for the clock-out section of the Attendance page (/attendance).

Very similar to ClockInPage — the same PIN keypad is used, but the employee
must already be clocked in and clicks the Clock Out button instead.
"""

import sys
import os

from selenium.webdriver.common.by import By

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from pages.base_page import BasePage
from config.config import BASE_URL


class ClockOutPage(BasePage):
    """
    Handles the clock-out PIN-pad interaction on the Attendance page.
    """

    URL = f"{BASE_URL}/attendance"

    # ── Locators ──────────────────────────────────────────────────────────────
    HEADING       = (By.CSS_SELECTOR, "h1.att-title")
    KEYPAD        = (By.CSS_SELECTOR, ".att-keypad")
    CLOCK_OUT_BTN = (By.CSS_SELECTOR, ".att-abtn.att-out")
    PIN_DISPLAY   = (By.CSS_SELECTOR, ".att-pin-display")
    SUCCESS_MSG   = (By.CSS_SELECTOR, ".att-success, .alert.success, [data-testid='clock-success']")
    ERROR_MSG     = (By.CSS_SELECTOR, ".att-error, .alert.error, [data-testid='clock-error']")
    CLEAR_BTN     = (By.CSS_SELECTOR, ".att-key-clear, [data-testid='pin-clear']")

    # ── Navigation ────────────────────────────────────────────────────────────

    def open(self) -> "ClockOutPage":
        self.navigate_to(self.URL)
        return self

    def is_loaded(self) -> bool:
        self.wait_for_url_contains("/attendance")
        return self.wait_for_visible(self.HEADING).is_displayed()

    # ── PIN-pad interactions ──────────────────────────────────────────────────

    def _get_digit_button(self, digit: str):
        xpath = f"//button[contains(@class,'att-key') and normalize-space(text())='{digit}']"
        return self.wait_for_clickable((By.XPATH, xpath))

    def enter_pin(self, pin_string: str):
        """Click each digit of *pin_string* on the keypad in sequence."""
        for digit in str(pin_string):
            self._get_digit_button(digit).click()

    def clear_pin(self):
        if self.is_element_present(self.CLEAR_BTN):
            self.click(self.CLEAR_BTN)

    # ── Actions ───────────────────────────────────────────────────────────────

    def click_clock_out(self):
        """Press the Clock Out button after entering the PIN."""
        self.click(self.CLOCK_OUT_BTN)

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

    def is_keypad_visible(self) -> bool:
        return self.is_visible(self.KEYPAD)
