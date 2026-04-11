import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from selenium.webdriver.support import expected_conditions as EC
from pages.login_page import LoginPage
from pages.employees_page import EmployeesPage
from config import BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD


def admin_login(driver, wait):
    LoginPage(driver, wait).open().login(ADMIN_USERNAME, ADMIN_PASSWORD)
    wait.until(EC.url_contains("/dashboard"))


def employee_login(driver, wait):
    LoginPage(driver, wait).open().login(EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD)
    wait.until(EC.url_contains("/attendance"))


class TestEmployees:

    def test_admin_can_access_employees_page(self, driver, wait):
        admin_login(driver, wait)
        page = EmployeesPage(driver, wait).open()
        assert page.is_loaded()

    def test_employees_page_shows_correct_heading(self, driver, wait):
        admin_login(driver, wait)
        page = EmployeesPage(driver, wait).open()
        assert page.get_heading() == "Employees"

    def test_employees_page_shows_subtitle(self, driver, wait):
        admin_login(driver, wait)
        page = EmployeesPage(driver, wait).open()
        assert "team" in page.get_subtitle().lower()

    def test_employees_table_has_correct_headers(self, driver, wait):
        admin_login(driver, wait)
        page = EmployeesPage(driver, wait).open()
        headers = page.get_table_headers()
        for expected in ["Employee", "Email", "Phone", "Role", "Actions"]:
            assert expected in headers, f"'{expected}' not in table headers: {headers}"

    def test_employees_page_has_add_button(self, driver, wait):
        admin_login(driver, wait)
        page = EmployeesPage(driver, wait).open()
        assert "Add employee" in page.get_add_btn_text()

    def test_add_employee_button_opens_form(self, driver, wait):
        admin_login(driver, wait)
        page = EmployeesPage(driver, wait).open()
        page.click_add_employee()
        assert page.is_form_visible()

    def test_employees_page_has_search(self, driver, wait):
        admin_login(driver, wait)
        page = EmployeesPage(driver, wait).open()
        assert page.is_search_visible()

    def test_employees_page_has_role_filter(self, driver, wait):
        admin_login(driver, wait)
        page = EmployeesPage(driver, wait).open()
        assert page.is_role_filter_visible()

    def test_employees_page_shows_employee_count(self, driver, wait):
        admin_login(driver, wait)
        page = EmployeesPage(driver, wait).open()
        count_text = page.get_employee_count_text()
        assert "employee" in count_text.lower()

    def test_employee_cannot_access_employees_page(self, driver, wait):
        employee_login(driver, wait)
        driver.get(f"{BASE_URL}/employees")
        wait.until(EC.url_contains("/attendance"))
        assert "/employees" not in driver.current_url

    def test_unauthenticated_cannot_access_employees_page(self, driver, wait):
        driver.get(f"{BASE_URL}/employees")
        wait.until(EC.url_contains("/login"))
        assert "/login" in driver.current_url
