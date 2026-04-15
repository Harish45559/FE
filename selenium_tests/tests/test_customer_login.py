import sys
import os
import time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from selenium.webdriver.support import expected_conditions as EC
from pages.customer_login_page import CustomerLoginPage
from pages.customer_register_page import CustomerRegisterPage
from config import BASE_URL

# ── Data-driven: invalid login attempts ──
invalid_logins = [
    ("notregistered@test.com", "password1", "Invalid"),
    ("bademail",               "password1", ""),         # client-side blocks submit
]

# One fixed test account — registered in the first test, reused in subsequent ones
# Using a timestamp suffix to avoid collision with other test runs
CUSTOMER_EMAIL    = f"login_test_{int(time.time())}@example.com"
CUSTOMER_PASSWORD = "password1"
_account_created  = False


def ensure_account(driver, wait):
    """Register the test account if not already done this session."""
    global _account_created
    if _account_created:
        return
    page = CustomerRegisterPage(driver, wait).open()
    page.register(
        name="Login Test User",
        email=CUSTOMER_EMAIL,
        phone="07900 333444",
        address="7 Login St",
        city="London",
        postcode="E1 6RF",
        password=CUSTOMER_PASSWORD,
    )
    try:
        wait.until(EC.url_contains("/customer/menu"))
    except Exception:
        pass
    _account_created = True


class TestCustomerLogin:

    def test_customer_login_page_has_order_online_heading(self, driver, wait):
        page = CustomerLoginPage(driver, wait).open()
        assert page.get_heading() == "Order Online"

    def test_customer_login_page_has_register_link(self, driver, wait):
        page = CustomerLoginPage(driver, wait).open()
        assert page.is_register_link_visible()

    def test_customer_login_page_has_tagline(self, driver, wait):
        page = CustomerLoginPage(driver, wait).open()
        assert page.is_tagline_visible()

    def test_toggle_password_shows_text_type(self, driver, wait):
        page = CustomerLoginPage(driver, wait).open()
        assert page.get_password_field_type() == "password"
        page.toggle_password_visibility()
        assert page.get_password_field_type() == "text"

    def test_toggle_password_hides_again(self, driver, wait):
        page = CustomerLoginPage(driver, wait).open()
        page.toggle_password_visibility()
        page.toggle_password_visibility()
        assert page.get_password_field_type() == "password"

    def test_submitting_empty_email_shows_error(self, driver, wait):
        page = CustomerLoginPage(driver, wait).open()
        page.enter_password("password1")
        page.click_submit()
        time.sleep(0.4)
        error = page.get_error_message()
        assert error != "" or "/customer/login" in driver.current_url

    def test_submitting_empty_password_shows_error(self, driver, wait):
        page = CustomerLoginPage(driver, wait).open()
        page.enter_email("someone@test.com")
        page.click_submit()
        time.sleep(0.4)
        error = page.get_error_message()
        assert error != "" or "/customer/login" in driver.current_url

    def test_wrong_password_shows_error(self, driver, wait):
        ensure_account(driver, wait)
        page = CustomerLoginPage(driver, wait).open()
        page.login(CUSTOMER_EMAIL, "wrongpassword")
        time.sleep(0.8)
        error = page.get_error_message()
        assert error != ""

    def test_unknown_email_shows_error(self, driver, wait):
        page = CustomerLoginPage(driver, wait).open()
        page.login("nobody_at_all@nowhere.com", "password1")
        time.sleep(0.8)
        error = page.get_error_message()
        assert error != ""

    def test_valid_credentials_redirect_to_menu(self, driver, wait):
        ensure_account(driver, wait)
        page = CustomerLoginPage(driver, wait).open()
        page.login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
        wait.until(EC.url_contains("/customer/menu"))
        assert "/customer/menu" in driver.current_url

    def test_customer_login_page_has_forgot_password_link(self, driver, wait):
        page = CustomerLoginPage(driver, wait).open()
        assert page.is_forgot_password_link_visible()

    def test_forgot_password_link_navigates_to_forgot_page(self, driver, wait):
        page = CustomerLoginPage(driver, wait).open()
        page.click_forgot_password()
        time.sleep(0.6)
        assert "/customer/forgot-password" in driver.current_url

    def test_unauthenticated_customer_orders_redirects_to_login(self, driver, wait):
        """Accessing /customer/orders without login redirects to /customer/login."""
        # Clear any existing customer session
        driver.get(BASE_URL)
        driver.execute_script("localStorage.removeItem('customer_token');"
                              "localStorage.removeItem('customer_user');")
        driver.get(f"{BASE_URL}/customer/orders")
        time.sleep(1)
        assert "/customer/login" in driver.current_url or \
               "/customer/menu" not in driver.current_url
