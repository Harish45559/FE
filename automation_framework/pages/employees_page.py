"""
pages/employees_page.py
------------------------
Page Object for the Employees management page at /employees.
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from pages.base_page import BasePage
from config.config import BASE_URL


class EmployeesPage(BasePage):

    _ADD_BTN       = (By.XPATH, "//button[contains(text(),'Add') or contains(text(),'New')]")
    _EMPLOYEE_CARDS = (By.CSS_SELECTOR, "[class*='ep-card'], [class*='employee-card'], [class*='emp-card']")
    _SEARCH_INPUT  = (By.CSS_SELECTOR, "input[placeholder*='Search'], input[type='search']")
    _FORM          = (By.CSS_SELECTOR, "form, [class*='ep-form'], [class*='employee-form']")
    _SAVE_BTN      = (By.XPATH, "//button[contains(text(),'Save') or contains(text(),'Create') or contains(text(),'Add Employee')]")
    _DELETE_BTN    = (By.XPATH, "//button[contains(text(),'Delete') or contains(text(),'Remove')]")
    _NAME_INPUT    = (By.CSS_SELECTOR, "input[name='first_name'], input[placeholder*='First']")
    _EMAIL_INPUT   = (By.CSS_SELECTOR, "input[name='email'], input[type='email']")

    def open(self):
        self.driver.get(f"{BASE_URL}/employees")
        return self

    def is_loaded(self) -> bool:
        try:
            self.wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR,
                 "[class*='employees'], [class*='Employees'], [class*='ep-']")
            ))
            return True
        except Exception:
            return False

    def get_employee_cards(self):
        try:
            return self.driver.find_elements(*self._EMPLOYEE_CARDS)
        except Exception:
            return []

    def click_add_button(self):
        try:
            self.driver.find_element(*self._ADD_BTN).click()
        except Exception:
            pass

    def is_form_visible(self) -> bool:
        try:
            self.driver.find_element(*self._FORM)
            return True
        except Exception:
            return False

    def has_search(self) -> bool:
        try:
            self.driver.find_element(*self._SEARCH_INPUT)
            return True
        except Exception:
            return False

    def search(self, query: str):
        el = self.driver.find_element(*self._SEARCH_INPUT)
        el.clear()
        el.send_keys(query)
