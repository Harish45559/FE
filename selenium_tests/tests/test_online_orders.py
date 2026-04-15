import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from selenium.webdriver.support import expected_conditions as EC
from pages.login_page import LoginPage
from pages.online_orders_page import OnlineOrdersPage
from config import BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD


def admin_login(driver, wait):
    LoginPage(driver, wait).open().login(ADMIN_USERNAME, ADMIN_PASSWORD)
    wait.until(EC.url_contains("/dashboard"))


def employee_login(driver, wait):
    LoginPage(driver, wait).open().login(EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD)
    wait.until(EC.url_contains("/attendance"))


class TestOnlineOrders:

    def test_admin_can_access_online_orders(self, driver, wait):
        admin_login(driver, wait)
        page = OnlineOrdersPage(driver, wait).open()
        assert page.is_loaded()

    def test_online_orders_shows_correct_title(self, driver, wait):
        admin_login(driver, wait)
        page = OnlineOrdersPage(driver, wait).open()
        assert "Online Orders" in page.get_title()

    def test_online_orders_has_tabs(self, driver, wait):
        admin_login(driver, wait)
        page = OnlineOrdersPage(driver, wait).open()
        assert page.is_tabs_visible()

    def test_online_orders_has_pending_tab(self, driver, wait):
        admin_login(driver, wait)
        page = OnlineOrdersPage(driver, wait).open()
        assert page.is_pending_tab_visible()

    def test_online_orders_has_all_four_tabs(self, driver, wait):
        admin_login(driver, wait)
        page = OnlineOrdersPage(driver, wait).open()
        # All four tabs must exist: Pending, Accepted, Rejected, All
        for name in ["Pending", "Accepted", "Rejected", "All"]:
            page.click_tab(name)  # will raise if tab not found

    def test_online_orders_has_toggle_switch(self, driver, wait):
        admin_login(driver, wait)
        page = OnlineOrdersPage(driver, wait).open()
        assert page.is_toggle_visible()

    def test_employee_cannot_access_online_orders(self, driver, wait):
        employee_login(driver, wait)
        driver.get(f"{BASE_URL}/online-orders")
        wait.until(EC.url_contains("/attendance"))
        assert "/online-orders" not in driver.current_url

    def test_unauthenticated_cannot_access_online_orders(self, driver, wait):
        driver.get(f"{BASE_URL}/online-orders")
        wait.until(EC.url_contains("/login"))
        assert "/login" in driver.current_url
