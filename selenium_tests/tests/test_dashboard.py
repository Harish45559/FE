import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from selenium.webdriver.support import expected_conditions as EC
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage
from config import BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD


def admin_login(driver, wait):
    LoginPage(driver, wait).open().login(ADMIN_USERNAME, ADMIN_PASSWORD)
    wait.until(EC.url_contains("/dashboard"))


def employee_login(driver, wait):
    LoginPage(driver, wait).open().login(EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD)
    wait.until(EC.url_contains("/attendance"))


class TestDashboard:

    def test_admin_can_access_dashboard(self, driver, wait):
        admin_login(driver, wait)
        page = DashboardPage(driver, wait)
        assert page.is_loaded()

    def test_dashboard_shows_correct_heading(self, driver, wait):
        admin_login(driver, wait)
        page = DashboardPage(driver, wait)
        assert page.get_heading() == "Dashboard"

    def test_dashboard_shows_all_stat_cards(self, driver, wait):
        admin_login(driver, wait)
        page = DashboardPage(driver, wait)
        assert page.are_stat_cards_displayed()

    def test_dashboard_shows_till_summary(self, driver, wait):
        admin_login(driver, wait)
        page = DashboardPage(driver, wait)
        assert page.is_till_summary_displayed()

    def test_dashboard_nav_contains_expected_pages(self, driver, wait):
        admin_login(driver, wait)
        page = DashboardPage(driver, wait)
        nav_labels = page.get_nav_labels()
        for expected in ["Dashboard", "Employees", "Reports", "Attendance"]:
            assert expected in nav_labels, f"'{expected}' not found in nav: {nav_labels}"

    def test_employee_cannot_access_dashboard(self, driver, wait):
        employee_login(driver, wait)
        driver.get(f"{BASE_URL}/dashboard")
        wait.until(EC.url_contains("/attendance"))
        assert "/dashboard" not in driver.current_url

    def test_unauthenticated_cannot_access_dashboard(self, driver, wait):
        driver.get(f"{BASE_URL}/dashboard")
        wait.until(EC.url_contains("/login"))
        assert "/login" in driver.current_url

    def test_logout_redirects_to_root(self, driver, wait):
        admin_login(driver, wait)
        page = DashboardPage(driver, wait)
        page.click_logout()
        wait.until(lambda d: "/dashboard" not in d.current_url)
        assert "/dashboard" not in driver.current_url
