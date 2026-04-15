import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from selenium.webdriver.support import expected_conditions as EC
from pages.login_page import LoginPage
from pages.customers_page import CustomersPage
from config import BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD


def admin_login(driver, wait):
    LoginPage(driver, wait).open().login(ADMIN_USERNAME, ADMIN_PASSWORD)
    wait.until(EC.url_contains("/dashboard"))


def employee_login(driver, wait):
    LoginPage(driver, wait).open().login(EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD)
    wait.until(EC.url_contains("/attendance"))


class TestCustomersPage:

    def test_admin_can_access_customers_page(self, driver, wait):
        admin_login(driver, wait)
        page = CustomersPage(driver, wait).open()
        assert page.is_loaded()

    def test_customers_page_shows_correct_heading(self, driver, wait):
        admin_login(driver, wait)
        page = CustomersPage(driver, wait).open()
        assert "Customers" in page.get_title()

    def test_customers_page_has_search_input(self, driver, wait):
        admin_login(driver, wait)
        page = CustomersPage(driver, wait).open()
        assert page.is_search_visible()

    def test_customers_page_has_stats_strip(self, driver, wait):
        admin_login(driver, wait)
        page = CustomersPage(driver, wait).open()
        assert page.is_stats_visible()

    def test_employee_cannot_access_customers_page(self, driver, wait):
        employee_login(driver, wait)
        driver.get(f"{BASE_URL}/customers")
        wait.until(EC.url_contains("/attendance"))
        assert "/customers" not in driver.current_url

    def test_unauthenticated_cannot_access_customers_page(self, driver, wait):
        driver.get(f"{BASE_URL}/customers")
        wait.until(EC.url_contains("/login"))
        assert "/login" in driver.current_url
