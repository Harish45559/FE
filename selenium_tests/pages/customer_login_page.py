import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from .base_page import BasePage
from config import BASE_URL


class CustomerLoginPage(BasePage):
    URL = f"{BASE_URL}/customer/login"

    # Locators — no data-testid on this page, use name/type attributes
    EMAIL_INPUT     = (By.CSS_SELECTOR, "input[name='email']")
    PASSWORD_INPUT  = (By.CSS_SELECTOR, "input[name='password']")
    SUBMIT_BTN      = (By.CSS_SELECTOR, "button[type='submit']")
    ERROR_MSG       = (By.CSS_SELECTOR, ".alert.error")
    HEADING         = (By.CSS_SELECTOR, "h2.title")
    TOGGLE_PASSWORD = (By.CSS_SELECTOR, ".toggle-password")
    REGISTER_LINK        = (By.XPATH, "//a[contains(@href, '/customer/register')]")
    FORGOT_PASSWORD_LINK = (By.XPATH, "//a[contains(@href, '/customer/forgot-password')]")
    TAGLINE              = (By.CSS_SELECTOR, "p.tagline")

    def open(self):
        self.navigate_to(self.URL)
        return self

    def get_heading(self):
        return self.wait_for_visible(*self.HEADING).text

    def enter_email(self, email):
        field = self.wait_for_visible(*self.EMAIL_INPUT)
        field.clear()
        field.send_keys(email)

    def enter_password(self, password):
        field = self.find(*self.PASSWORD_INPUT)
        field.clear()
        field.send_keys(password)

    def click_submit(self):
        self.find(*self.SUBMIT_BTN).click()

    def login(self, email, password):
        self.enter_email(email)
        self.enter_password(password)
        self.click_submit()

    def get_error_message(self):
        try:
            return self.wait_for_visible(*self.ERROR_MSG).text
        except Exception:
            return ""

    def toggle_password_visibility(self):
        self.find(*self.TOGGLE_PASSWORD).click()

    def get_password_field_type(self):
        return self.find(*self.PASSWORD_INPUT).get_attribute("type")

    def is_register_link_visible(self):
        return self.is_element_present(*self.REGISTER_LINK)

    def is_forgot_password_link_visible(self):
        return self.is_element_present(*self.FORGOT_PASSWORD_LINK)

    def click_forgot_password(self):
        self.find(*self.FORGOT_PASSWORD_LINK).click()

    def is_tagline_visible(self):
        return self.is_element_present(*self.TAGLINE)
