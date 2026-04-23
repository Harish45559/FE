"""
pages/reports_page.py
----------------------
Page Object for the Attendance Reports page at /reports.
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from pages.base_page import BasePage
from config.config import BASE_URL


class ReportsPage(BasePage):

    _TABLE          = (By.CSS_SELECTOR, "table, [class*='table'], [class*='rp-table']")
    _TABLE_ROWS     = (By.CSS_SELECTOR, "table tbody tr, [class*='rp-row']")
    _EXPORT_CSV     = (By.XPATH, "//button[contains(text(),'CSV') or contains(text(),'Export')]")
    _EXPORT_PDF     = (By.XPATH, "//button[contains(text(),'PDF')]")
    _EMPLOYEE_FILTER = (By.CSS_SELECTOR, "select, [class*='filter'], [class*='employee-select']")
    _DATE_FROM      = (By.CSS_SELECTOR, "input[type='date']:first-of-type, [class*='from-date']")
    _DATE_TO        = (By.CSS_SELECTOR, "input[type='date']:last-of-type, [class*='to-date']")
    _SORT_HEADERS   = (By.CSS_SELECTOR, "th[class*='sort'], th button, [class*='rp-th']")

    def open(self):
        self.driver.get(f"{BASE_URL}/reports")
        return self

    def is_loaded(self) -> bool:
        try:
            self.wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, "[class*='reports'], [class*='Reports'], [class*='rp-']")
            ))
            return True
        except Exception:
            return False

    def has_table(self) -> bool:
        try:
            self.driver.find_element(*self._TABLE)
            return True
        except Exception:
            return False

    def get_table_rows(self):
        try:
            return self.driver.find_elements(*self._TABLE_ROWS)
        except Exception:
            return []

    def has_export_button(self) -> bool:
        try:
            self.driver.find_element(*self._EXPORT_CSV)
            return True
        except Exception:
            return False

    def has_employee_filter(self) -> bool:
        try:
            self.driver.find_element(*self._EMPLOYEE_FILTER)
            return True
        except Exception:
            return False

    def has_date_filters(self) -> bool:
        try:
            els = self.driver.find_elements(By.CSS_SELECTOR, "input[type='date']")
            return len(els) >= 1
        except Exception:
            return False
