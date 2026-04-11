import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from selenium.webdriver.support import expected_conditions as EC
from pages.login_page import LoginPage
from pages.previous_orders_page import PreviousOrdersPage
from config import BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD


def admin_login(driver, wait):
    LoginPage(driver, wait).open().login(ADMIN_USERNAME, ADMIN_PASSWORD)
    wait.until(EC.url_contains("/dashboard"))


def employee_login(driver, wait):
    LoginPage(driver, wait).open().login(EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD)
    wait.until(EC.url_contains("/attendance"))


class TestPreviousOrders:

    def test_admin_can_access_previous_orders(self, driver, wait):
        admin_login(driver, wait)
        page = PreviousOrdersPage(driver, wait).open()
        assert page.is_loaded()

    def test_previous_orders_shows_correct_title(self, driver, wait):
        admin_login(driver, wait)
        page = PreviousOrdersPage(driver, wait).open()
        assert "Previous Orders" in page.get_title()

    def test_previous_orders_has_search(self, driver, wait):
        admin_login(driver, wait)
        page = PreviousOrdersPage(driver, wait).open()
        assert page.is_search_visible()

    def test_employee_cannot_access_previous_orders(self, driver, wait):
        employee_login(driver, wait)
        driver.get(f"{BASE_URL}/previous-orders")
        wait.until(EC.url_contains("/attendance"))
        assert "/previous-orders" not in driver.current_url

    def test_unauthenticated_cannot_access_previous_orders(self, driver, wait):
        driver.get(f"{BASE_URL}/previous-orders")
        wait.until(EC.url_contains("/login"))
        assert "/login" in driver.current_url
