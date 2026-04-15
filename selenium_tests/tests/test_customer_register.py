import sys
import os
import time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from selenium.webdriver.support import expected_conditions as EC
from pages.customer_register_page import CustomerRegisterPage
from config import BASE_URL

# ── Data-driven: invalid phone blur tests ──
invalid_phones = [
    "12345",           # too short, not UK
    "0800 000 0000",   # freephone, not mobile
    "07",              # incomplete
]

# ── Data-driven: invalid postcodes ──
invalid_postcodes = [
    "12345",    # numeric only
    "AAAAA",    # letters only
    "LU",       # too short
]


class TestCustomerRegister:

    def test_register_page_shows_create_account_heading(self, driver, wait):
        page = CustomerRegisterPage(driver, wait).open()
        assert page.get_heading() == "Create Account"

    def test_register_page_has_all_fields(self, driver, wait):
        page = CustomerRegisterPage(driver, wait).open()
        for selector in [
            page.NAME_INPUT, page.EMAIL_INPUT, page.PHONE_INPUT,
            page.ADDRESS_INPUT, page.CITY_INPUT, page.POSTCODE_INPUT,
            page.PASSWORD_INPUT, page.SUBMIT_BTN,
        ]:
            assert page.is_element_present(*selector), f"Missing field: {selector}"

    def test_register_page_has_login_link(self, driver, wait):
        page = CustomerRegisterPage(driver, wait).open()
        assert page.is_element_present(*page.LOGIN_LINK)

    def test_submitting_empty_form_shows_error(self, driver, wait):
        page = CustomerRegisterPage(driver, wait).open()
        page.click_submit()
        # Should show a submit-level validation error (not navigate away)
        assert "/customer/register" in driver.current_url or \
               page.get_submit_error() != ""

    def test_invalid_email_shows_field_error_on_blur(self, driver, wait):
        page = CustomerRegisterPage(driver, wait).open()
        page.fill_and_blur(page.EMAIL_INPUT, "notanemail")
        errors = page.get_field_errors()
        assert len(errors) > 0
        assert any("email" in e.lower() or "invalid" in e.lower() for e in errors)

    @pytest.mark.parametrize("phone", invalid_phones)
    def test_invalid_uk_phone_shows_field_error_on_blur(self, driver, wait, phone):
        page = CustomerRegisterPage(driver, wait).open()
        page.fill_and_blur(page.PHONE_INPUT, phone)
        errors = page.get_field_errors()
        assert len(errors) > 0

    @pytest.mark.parametrize("postcode", invalid_postcodes)
    def test_invalid_postcode_shows_field_error_on_blur(self, driver, wait, postcode):
        page = CustomerRegisterPage(driver, wait).open()
        page.fill_and_blur(page.POSTCODE_INPUT, postcode)
        errors = page.get_field_errors()
        assert len(errors) > 0

    def test_short_password_shows_field_error_on_blur(self, driver, wait):
        page = CustomerRegisterPage(driver, wait).open()
        page.fill_and_blur(page.PASSWORD_INPUT, "abc")
        errors = page.get_field_errors()
        assert len(errors) > 0

    def test_password_strength_bar_appears_when_typing(self, driver, wait):
        page = CustomerRegisterPage(driver, wait).open()
        pw_field = page.wait_for_visible(*page.PASSWORD_INPUT)
        pw_field.send_keys("mypassword1")
        # Strength label should appear
        label = page.get_password_strength_label()
        assert label in ("Weak", "Fair", "Good", "Strong")

    def test_valid_registration_redirects_to_menu(self, driver, wait):
        """Full happy-path registration — redirects to /customer/menu on success."""
        page = CustomerRegisterPage(driver, wait).open()
        unique_email = f"selenium_{int(time.time())}@test.com"
        page.register(
            name="Selenium Tester",
            email=unique_email,
            phone="07911 123456",
            address="10 Test Road",
            city="London",
            postcode="LU1 3BW",
            password="password1",
        )
        wait.until(EC.url_contains("/customer/menu"))
        assert "/customer/menu" in driver.current_url

    def test_duplicate_email_shows_error(self, driver, wait):
        """Registering with an already-used email shows a server error message."""
        page = CustomerRegisterPage(driver, wait).open()
        # Use the same email twice in separate tests — relies on email from above
        # Use a fixed test email we know exists (created in test above may vary by time)
        # Instead: register once, then try again with the same email
        unique_email = f"dup_{int(time.time())}@test.com"

        # First registration
        page.register(
            name="Dup Test",
            email=unique_email,
            phone="07922 000001",
            address="1 Dup St",
            city="Luton",
            postcode="LU2 8AA",
            password="password1",
        )
        wait.until(EC.url_contains("/customer/menu"))

        # Go back to register and try same email
        page.open()
        page.register(
            name="Dup Test Again",
            email=unique_email,
            phone="07922 000002",
            address="2 Dup St",
            city="Luton",
            postcode="LU2 8BB",
            password="password2",
        )
        # Should stay on register page and show error
        time.sleep(1)
        error = page.get_submit_error()
        assert error != "" or "/customer/register" in driver.current_url
