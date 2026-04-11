import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from selenium.webdriver.support import expected_conditions as EC
from pages.login_page import LoginPage
from config import BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD

# ── Data driven: invalid credentials ──
invalid_login_data = [
    ("admin",       "wrongpassword", "Invalid credentials"),
    ("nonexistent", "anypassword",   "Invalid credentials"),
    ("admin",       "123",           "Invalid credentials"),
]

# ── Data driven: missing fields ──
missing_field_data = [
    ("",      "somepassword", "Username required"),
    ("admin", "",             "Password required"),
    ("",      "",             "Username required"),
]


class TestLogin:

    def test_login_page_shows_welcome_heading(self, driver, wait):
        page = LoginPage(driver, wait).open()
        assert page.get_heading_text() == "Welcome back"

    def test_login_page_shows_tagline(self, driver, wait):
        page = LoginPage(driver, wait).open()
        assert "Spice so good" in page.get_tagline_text()

    def test_login_page_shows_brand_logo(self, driver, wait):
        page = LoginPage(driver, wait).open()
        assert page.is_brand_logo_displayed()

    def test_admin_login_redirects_to_dashboard(self, driver, wait):
        page = LoginPage(driver, wait).open()
        page.login(ADMIN_USERNAME, ADMIN_PASSWORD)
        wait.until(EC.url_contains("/dashboard"))
        assert "/dashboard" in driver.current_url

    def test_employee_login_redirects_to_attendance(self, driver, wait):
        page = LoginPage(driver, wait).open()
        page.login(EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD)
        wait.until(EC.url_contains("/attendance"))
        assert "/attendance" in driver.current_url

    @pytest.mark.parametrize("username, password, expected_error", invalid_login_data)
    def test_invalid_credentials_show_error(self, driver, wait, username, password, expected_error):
        page = LoginPage(driver, wait).open()
        page.login(username, password)
        assert expected_error in page.get_error_message()

    @pytest.mark.parametrize("username, password, expected_error", missing_field_data)
    def test_missing_fields_show_error(self, driver, wait, username, password, expected_error):
        page = LoginPage(driver, wait).open()
        if username:
            page.enter_username(username)
        if password:
            page.enter_password(password)
        page.click_login()
        assert expected_error in page.get_error_message()

    def test_toggle_password_shows_text(self, driver, wait):
        page = LoginPage(driver, wait).open()
        assert page.get_password_field_type() == "password"
        page.toggle_password_visibility()
        assert page.get_password_field_type() == "text"

    def test_toggle_password_hides_again(self, driver, wait):
        page = LoginPage(driver, wait).open()
        page.toggle_password_visibility()
        page.toggle_password_visibility()
        assert page.get_password_field_type() == "password"

    def test_forgot_password_link_visible(self, driver, wait):
        page = LoginPage(driver, wait).open()
        assert page.is_forgot_password_visible()

    def test_unauthenticated_redirects_to_login(self, driver, wait):
        driver.get(f"{BASE_URL}/dashboard")
        wait.until(EC.url_contains("/login"))
        assert "/login" in driver.current_url
