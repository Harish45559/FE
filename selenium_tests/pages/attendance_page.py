import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from .base_page import BasePage
from config import BASE_URL


class AttendancePage(BasePage):
    URL = f"{BASE_URL}/attendance"

    HEADING        = (By.CSS_SELECTOR, "h1.att-title")
    EMPLOYEE_GRID  = (By.CSS_SELECTOR, ".att-grid")
    EMPLOYEE_CARDS = (By.CSS_SELECTOR, ".att-card")
    SEARCH_INPUT   = (By.CSS_SELECTOR, ".att-search")
    EMPLOYEE_COUNT = (By.CSS_SELECTOR, ".att-emp-count")
    CLOCK_IN_BTN   = (By.CSS_SELECTOR, ".att-abtn.att-in")
    CLOCK_OUT_BTN  = (By.CSS_SELECTOR, ".att-abtn.att-out")
    CLOCK_TIME     = (By.CSS_SELECTOR, ".att-clock-time")
    KEYPAD         = (By.CSS_SELECTOR, ".att-keypad")

    def open(self):
        self.navigate_to(self.URL)
        return self

    def is_loaded(self):
        self.wait_for_url("/attendance")
        return self.wait_for_visible(*self.HEADING).is_displayed()

    def get_heading(self):
        return self.wait_for_visible(*self.HEADING).text

    def get_employee_count_text(self):
        return self.wait_for_visible(*self.EMPLOYEE_COUNT).text

    def get_employee_cards(self):
        self.wait_for_element(*self.EMPLOYEE_GRID)
        return self.find_all(*self.EMPLOYEE_CARDS)

    def is_search_visible(self):
        return self.find(*self.SEARCH_INPUT).is_displayed()

    def is_clock_visible(self):
        return self.find(*self.CLOCK_TIME).is_displayed()

    def is_keypad_visible(self):
        return self.find(*self.KEYPAD).is_displayed()

    def search_employee(self, query):
        field = self.find(*self.SEARCH_INPUT)
        field.clear()
        field.send_keys(query)
