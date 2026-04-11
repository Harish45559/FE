import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from .base_page import BasePage
from config import BASE_URL


class LoginPage(BasePage):
    URL = f"{BASE_URL}/login"

    # Locators
    USERNAME_INPUT  = (By.ID, "username")
    PASSWORD_INPUT  = (By.ID, "password")
    LOGIN_BTN       = (By.ID, "login-btn")
    ERROR_MSG       = (By.ID, "login-error")
    TOGGLE_PASSWORD = (By.ID, "toggle-password")
    FORGOT_PASSWORD = (By.ID, "forgot-password")
    HEADING         = (By.CSS_SELECTOR, "h2.title")
    TAGLINE         = (By.CSS_SELECTOR, "p.tagline")
    BRAND_LOGO      = (By.CSS_SELECTOR, "img.brand-logo")

    def open(self):
        self.navigate_to(self.URL)
        return self

    def enter_username(self, username):
        field = self.wait_for_visible(*self.USERNAME_INPUT)
        field.clear()
        field.send_keys(username)

    def enter_password(self, password):
        field = self.find(*self.PASSWORD_INPUT)
        field.clear()
        field.send_keys(password)

    def click_login(self):
        self.find(*self.LOGIN_BTN).click()

    def login(self, username, password):
        self.enter_username(username)
        self.enter_password(password)
        self.click_login()

    def get_error_message(self):
        return self.wait_for_visible(*self.ERROR_MSG).text

    def toggle_password_visibility(self):
        self.find(*self.TOGGLE_PASSWORD).click()

    def get_password_field_type(self):
        return self.find(*self.PASSWORD_INPUT).get_attribute("type")

    def get_heading_text(self):
        return self.find(*self.HEADING).text

    def get_tagline_text(self):
        return self.find(*self.TAGLINE).text

    def is_forgot_password_visible(self):
        return self.find(*self.FORGOT_PASSWORD).is_displayed()

    def is_brand_logo_displayed(self):
        return self.find(*self.BRAND_LOGO).is_displayed()
