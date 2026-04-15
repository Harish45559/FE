import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from .base_page import BasePage
from config import BASE_URL


class CustomersPage(BasePage):
    URL = f"{BASE_URL}/customers"

    # Locators
    HEADING       = (By.CSS_SELECTOR, "h1.cx-title")
    SUBTITLE      = (By.CSS_SELECTOR, "p.cx-subtitle")
    SEARCH_INPUT  = (By.CSS_SELECTOR, "input.cx-search")
    STATS_STRIP   = (By.CSS_SELECTOR, ".cx-stats")
    GRID_VIEW     = (By.CSS_SELECTOR, ".cx-grid")
    TABLE_CARD    = (By.CSS_SELECTOR, ".cx-table-card")
    VIEW_TOGGLE   = (By.CSS_SELECTOR, ".cx-view-toggle")

    def open(self):
        self.navigate_to(self.URL)
        return self

    def is_loaded(self):
        try:
            return self.wait_for_visible(*self.HEADING).is_displayed()
        except Exception:
            return False

    def get_title(self):
        return self.wait_for_visible(*self.HEADING).text

    def is_search_visible(self):
        return self.is_element_present(*self.SEARCH_INPUT)

    def is_stats_visible(self):
        return self.is_element_present(*self.STATS_STRIP)

    def type_search(self, text):
        field = self.wait_for_visible(*self.SEARCH_INPUT)
        field.clear()
        field.send_keys(text)
