import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from selenium.webdriver.support import expected_conditions as EC
from pages.login_page import LoginPage
from pages.attendance_page import AttendancePage
from config import BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD


def admin_login(driver, wait):
    LoginPage(driver, wait).open().login(ADMIN_USERNAME, ADMIN_PASSWORD)
    wait.until(EC.url_contains("/dashboard"))


def employee_login(driver, wait):
    LoginPage(driver, wait).open().login(EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD)
    wait.until(EC.url_contains("/attendance"))


class TestAttendance:

    def test_admin_can_access_attendance(self, driver, wait):
        admin_login(driver, wait)
        page = AttendancePage(driver, wait).open()
        assert page.is_loaded()

    def test_employee_can_access_attendance(self, driver, wait):
        employee_login(driver, wait)
        page = AttendancePage(driver, wait)
        assert page.is_loaded()

    def test_attendance_shows_correct_heading(self, driver, wait):
        employee_login(driver, wait)
        page = AttendancePage(driver, wait)
        assert page.get_heading() == "Attendance"

    def test_attendance_shows_employee_cards(self, driver, wait):
        employee_login(driver, wait)
        page = AttendancePage(driver, wait)
        cards = page.get_employee_cards()
        assert len(cards) > 0, "No employee cards found on attendance page"

    def test_attendance_shows_employee_count(self, driver, wait):
        employee_login(driver, wait)
        page = AttendancePage(driver, wait)
        count_text = page.get_employee_count_text()
        assert "employee" in count_text.lower()

    def test_attendance_search_is_visible(self, driver, wait):
        employee_login(driver, wait)
        page = AttendancePage(driver, wait)
        assert page.is_search_visible()

    def test_attendance_clock_display_is_visible(self, driver, wait):
        employee_login(driver, wait)
        page = AttendancePage(driver, wait)
        assert page.is_clock_visible()

    def test_employee_stays_on_attendance_after_login(self, driver, wait):
        employee_login(driver, wait)
        assert "/attendance" in driver.current_url

    def test_unauthenticated_cannot_access_attendance(self, driver, wait):
        driver.get(f"{BASE_URL}/attendance")
        wait.until(EC.url_contains("/login"))
        assert "/login" in driver.current_url
