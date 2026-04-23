"""
pages/eod_sales_page.py
------------------------
Page Object for the End-of-Day Sales page at /eod-sales.
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from pages.base_page import BasePage
from config.config import BASE_URL


class EodSalesPage(BasePage):

    _TAB_SUMMARY  = (By.XPATH, "//button[contains(text(),'Summary') or contains(text(),'summary')]")
    _TAB_ORDERS   = (By.XPATH, "//button[contains(text(),'Orders') or contains(text(),'orders')]")
    _FILTER_TODAY  = (By.XPATH, "//button[contains(text(),'Today') or contains(text(),'today')]")
    _FILTER_WEEKLY = (By.XPATH, "//button[contains(text(),'Weekly') or contains(text(),'weekly')]")
    _SALES_FIGURE  = (By.CSS_SELECTOR, "[class*='total'], [class*='sales'], [class*='eod']")
    _CHART         = (By.CSS_SELECTOR, "canvas, [class*='chart']")
    _TABLE_ROW     = (By.CSS_SELECTOR, "table tbody tr, [class*='table'] [class*='row']")

    def open(self):
        self.driver.get(f"{BASE_URL}/eod-sales")
        return self

    def is_loaded(self) -> bool:
        try:
            self.wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, "[class*='eod'], [class*='EndOfDay'], [class*='sales']")
            ))
            return True
        except Exception:
            return False

    def has_summary_tab(self) -> bool:
        try:
            self.driver.find_element(*self._TAB_SUMMARY)
            return True
        except Exception:
            return False

    def has_chart(self) -> bool:
        try:
            self.driver.find_element(*self._CHART)
            return True
        except Exception:
            return False

    def get_sales_figures(self):
        try:
            return self.driver.find_elements(*self._SALES_FIGURE)
        except Exception:
            return []

    def get_order_rows(self):
        try:
            return self.driver.find_elements(*self._TABLE_ROW)
        except Exception:
            return []

    def click_today_filter(self):
        try:
            self.driver.find_element(*self._FILTER_TODAY).click()
        except Exception:
            pass

    def click_weekly_filter(self):
        try:
            self.driver.find_element(*self._FILTER_WEEKLY).click()
        except Exception:
            pass
