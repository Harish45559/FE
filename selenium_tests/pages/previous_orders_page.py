import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from .base_page import BasePage
from config import BASE_URL


class PreviousOrdersPage(BasePage):
    URL = f"{BASE_URL}/previous-orders"

    TITLE        = (By.CSS_SELECTOR, ".po-title")
    SEARCH_INPUT = (By.CSS_SELECTOR, ".po-search")
    TABLE        = (By.CSS_SELECTOR, ".po-table")

    def open(self):
        self.navigate_to(self.URL)
        return self

    def is_loaded(self):
        self.wait_for_url("/previous-orders")
        return self.wait_for_visible(*self.TITLE).is_displayed()

    def get_title(self):
        return self.wait_for_visible(*self.TITLE).text

    def is_search_visible(self):
        return self.find(*self.SEARCH_INPUT).is_displayed()
