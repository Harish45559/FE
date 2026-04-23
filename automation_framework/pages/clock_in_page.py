"""
pages/clock_in_page.py
----------------------
Page Object for the clock-in section of the Attendance page (/attendance).

The UI renders a PIN keypad. Each digit button is identifiable by the
digit it displays.  enter_pin() clicks the buttons one at a time so tests
can simulate exactly what an employee would do physically.
"""

import sys
import os

from selenium.webdriver.common.by import By

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from pages.base_page import BasePage
from config.config import BASE_URL


class ClockInPage(BasePage):
    """
    Handles the clock-in PIN-pad interaction on the Attendance page.
    The same page renders both clock-in and clock-out; this class focuses
    on the clock-in flow.
    """

    URL = f"{BASE_URL}/attendance"

    # ── Locators ──────────────────────────────────────────────────────────────
    HEADING        = (By.CSS_SELECTOR, "h1.att-title")
    KEYPAD         = (By.CSS_SELECTOR, ".att-keypad")
    CLOCK_IN_BTN   = (By.CSS_SELECTOR, ".att-abtn.att-in")
    PIN_DISPLAY    = (By.CSS_SELECTOR, ".att-pin-display")
    SUCCESS_MSG    = (By.CSS_SELECTOR, ".att-success, .alert.success, [data-testid='clock-success']")
    ERROR_MSG      = (By.CSS_SELECTOR, ".att-error, .alert.error, [data-testid='clock-error']")
    CLEAR_BTN      = (By.CSS_SELECTOR, ".att-key-clear, [data-testid='pin-clear']")

    # ── Navigation ────────────────────────────────────────────────────────────

    def open(self) -> "ClockInPage":
        self.navigate_to(self.URL)
        return self

    def is_loaded(self) -> bool:
        self.wait_for_url_contains("/attendance")
        return self.wait_for_visible(self.HEADING).is_displayed()

    # ── PIN-pad interactions ──────────────────────────────────────────────────

    def _get_digit_button(self, digit: str):
        """
        Locate a keypad button by its visible text (the digit character).
        The keypad renders buttons with class .att-key and text '0'..'9'.
        """
        xpath = f"//button[contains(@class,'att-key') and normalize-space(text())='{digit}']"
        return self.wait_for_clickable((By.XPATH, xpath))

    def enter_pin(self, pin_string: str):
        """
        Click each digit of *pin_string* on the keypad in sequence.

        Parameters
        ----------
        pin_string : str  e.g. "1234"
        """
        for digit in str(pin_string):
            self._get_digit_button(digit).click()

    def clear_pin(self):
        """Press the Clear button to reset the PIN entry."""
        if self.is_element_present(self.CLEAR_BTN):
            self.click(self.CLEAR_BTN)

    # ── Actions ───────────────────────────────────────────────────────────────

    def click_clock_in(self):
        """Press the Clock In button after entering the PIN."""
        self.click(self.CLOCK_IN_BTN)

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
