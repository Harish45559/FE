"""
tests/ui/test_employees_ui.py
------------------------------
UI tests for the Employees management page at /employees (admin only).

Covered scenarios:
  - Page loads after admin login.
  - Employee cards / list is displayed.
  - Add Employee button is present.
  - Clicking Add opens the form.
  - Search input is available.
  - Unauthenticated access redirects to login.
"""

import os
import sys
import time

import pytest
from selenium.webdriver.support import expected_conditions as EC

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.base_test import BaseTest
from pages.login_page import LoginPage
from pages.employees_page import EmployeesPage
from config.config import BASE_URL, ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD


def _admin_login(driver, wait):
    LoginPage(driver, wait).open().login(ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD)
    wait.until(EC.url_contains("/dashboard"))


@pytest.mark.ui
@pytest.mark.smoke
class TestEmployeesUI(BaseTest):
    """Selenium UI tests for the Employees management page."""

    def test_employees_page_loads(self):
        """Admin can navigate to /employees and the page renders."""
        _admin_login(self.driver, self.wait)
        page = EmployeesPage(self.driver, self.wait).open()
        assert page.is_loaded(), "Employees page did not load"

    def test_employee_list_is_displayed(self):
        """At least one employee card should be visible (seed data assumed)."""
        _admin_login(self.driver, self.wait)
        page = EmployeesPage(self.driver, self.wait).open()
        page.is_loaded()
        time.sleep(1.5)
        cards = page.get_employee_cards()
        assert len(cards) > 0, "No employee cards found on the employees page"

    def test_add_employee_button_present(self):
        """An 'Add Employee' or 'New' button should be visible on the page."""
        _admin_login(self.driver, self.wait)
        page = EmployeesPage(self.driver, self.wait).open()
        page.is_loaded()
        from selenium.webdriver.common.by import By
        btns = self.driver.find_elements(
            By.XPATH, "//button[contains(text(),'Add') or contains(text(),'New')]"
        )
        assert len(btns) > 0, "Add Employee button not found"

    def test_clicking_add_opens_form(self):
        """Clicking the Add button should reveal the employee creation form."""
        _admin_login(self.driver, self.wait)
        page = EmployeesPage(self.driver, self.wait).open()
        page.is_loaded()
        page.click_add_button()
        time.sleep(0.5)
        assert page.is_form_visible(), (
            "Employee form did not appear after clicking Add button"
        )

    def test_search_input_is_present(self):
        """A search input should be available to filter employees by name."""
        _admin_login(self.driver, self.wait)
        page = EmployeesPage(self.driver, self.wait).open()
        page.is_loaded()
        assert page.has_search(), "Search input not found on employees page"

    @pytest.mark.regression
    def test_unauthenticated_employees_redirects_to_login(self):
        """Accessing /employees without a session should redirect to /login."""
        self.driver.delete_all_cookies()
        self.driver.get(f"{BASE_URL}/employees")
        self.wait.until(EC.url_contains("/login"))
        assert "/login" in self.driver.current_url, (
            "Expected redirect to /login for unauthenticated access to /employees"
        )
