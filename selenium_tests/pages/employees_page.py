import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from .base_page import BasePage
from config import BASE_URL


class EmployeesPage(BasePage):
    URL = f"{BASE_URL}/employees"

    HEADING        = (By.CSS_SELECTOR, "h1.ep-title")
    SUBTITLE       = (By.CSS_SELECTOR, "p.ep-subtitle")
    ADD_BTN        = (By.CSS_SELECTOR, ".ep-add-btn")
    SEARCH_INPUT   = (By.CSS_SELECTOR, ".ep-search")
    ROLE_FILTER    = (By.CSS_SELECTOR, ".ep-filter")
    EMP_COUNT      = (By.CSS_SELECTOR, ".ep-count")
    TABLE          = (By.CSS_SELECTOR, ".ep-table")
    TABLE_HEADERS  = (By.CSS_SELECTOR, ".ep-table thead th")
    TABLE_ROWS     = (By.CSS_SELECTOR, ".ep-table tbody tr")
    FORM_CARD      = (By.CSS_SELECTOR, ".ep-form-card")
    FORM_TITLE     = (By.CSS_SELECTOR, ".ep-form-title")
    LOGOUT_BTN     = (By.CSS_SELECTOR, ".dl-logout")

    def open(self):
        self.navigate_to(self.URL)
        return self

    def is_loaded(self):
        self.wait_for_url("/employees")
        return self.wait_for_visible(*self.HEADING).is_displayed()

    def get_heading(self):
        return self.wait_for_visible(*self.HEADING).text

    def get_subtitle(self):
        return self.find(*self.SUBTITLE).text

    def get_table_headers(self):
        self.wait_for_element(*self.TABLE)
        return [th.text for th in self.find_all(*self.TABLE_HEADERS)]

    def click_add_employee(self):
        self.find(*self.ADD_BTN).click()

    def get_add_btn_text(self):
        return self.find(*self.ADD_BTN).text

    def is_form_visible(self):
        return self.is_element_present(By.CSS_SELECTOR, ".ep-form-card")

    def is_search_visible(self):
        return self.find(*self.SEARCH_INPUT).is_displayed()

    def is_role_filter_visible(self):
        return self.find(*self.ROLE_FILTER).is_displayed()

    def get_employee_count_text(self):
        return self.wait_for_visible(*self.EMP_COUNT).text

    def search(self, query):
        field = self.find(*self.SEARCH_INPUT)
        field.clear()
        field.send_keys(query)
