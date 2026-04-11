import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from .base_page import BasePage
from config import BASE_URL


class HeldOrdersPage(BasePage):
    URL = f"{BASE_URL}/held-orders"

    HEADING = (By.ID, "held-orders-title")

    def open(self):
        self.navigate_to(self.URL)
        return self

    def is_loaded(self):
        self.wait_for_url("/held-orders")
        return self.wait_for_visible(*self.HEADING).is_displayed()

    def get_heading(self):
        return self.wait_for_visible(*self.HEADING).text
