import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from .base_page import BasePage
from config import BASE_URL


class CustomerRegisterPage(BasePage):
    URL = f"{BASE_URL}/customer/register"

    # Locators — data-testid attributes
    NAME_INPUT     = (By.CSS_SELECTOR, "[data-testid='reg-name']")
    EMAIL_INPUT    = (By.CSS_SELECTOR, "[data-testid='reg-email']")
    PHONE_INPUT    = (By.CSS_SELECTOR, "[data-testid='reg-phone']")
    ADDRESS_INPUT  = (By.CSS_SELECTOR, "[data-testid='reg-address']")
    CITY_INPUT     = (By.CSS_SELECTOR, "[data-testid='reg-city']")
    POSTCODE_INPUT = (By.CSS_SELECTOR, "[data-testid='reg-postcode']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "[data-testid='reg-password']")
    SUBMIT_BTN     = (By.CSS_SELECTOR, "[data-testid='reg-submit']")
    HEADING        = (By.CSS_SELECTOR, "h2.title")
    SUBMIT_ERROR   = (By.CSS_SELECTOR, ".alert.error")
    FIELD_ERRORS   = (By.CSS_SELECTOR, ".field-err")
    PW_STRENGTH    = (By.CSS_SELECTOR, ".pw-label")
    LOGIN_LINK     = (By.XPATH, "//a[contains(@href, '/customer/login')]")

    def open(self):
        self.navigate_to(self.URL)
        return self

    def get_heading(self):
        return self.wait_for_visible(*self.HEADING).text

    def fill_form(self, name="", email="", phone="", address="",
                  city="", postcode="", password=""):
        """Fill all registration fields."""
        for selector, value in [
            (self.NAME_INPUT,     name),
            (self.EMAIL_INPUT,    email),
            (self.PHONE_INPUT,    phone),
            (self.ADDRESS_INPUT,  address),
            (self.CITY_INPUT,     city),
            (self.POSTCODE_INPUT, postcode),
            (self.PASSWORD_INPUT, password),
        ]:
            field = self.wait_for_visible(*selector)
            field.clear()
            if value:
                field.send_keys(value)

    def blur_field(self, selector):
        """Click into a field then tab away to trigger onBlur validation."""
        field = self.find(*selector)
        field.send_keys(Keys.TAB)

    def fill_and_blur(self, selector, value):
        """Type a value into a field then trigger blur."""
        field = self.wait_for_visible(*selector)
        field.clear()
        field.send_keys(value)
        field.send_keys(Keys.TAB)

    def click_submit(self):
        self.find(*self.SUBMIT_BTN).click()

    def get_submit_error(self):
        try:
            return self.wait_for_visible(*self.SUBMIT_ERROR).text
        except Exception:
            return ""

    def get_field_errors(self):
        """Return list of all visible inline field error messages."""
        return [el.text for el in self.find_all(*self.FIELD_ERRORS) if el.is_displayed()]

    def get_first_field_error(self):
        errors = self.get_field_errors()
        return errors[0] if errors else ""

    def get_password_strength_label(self):
        try:
            return self.find(*self.PW_STRENGTH).text
        except Exception:
            return ""

    def register(self, name, email, phone, address, city, postcode, password):
        """Fill and submit the form."""
        self.fill_form(name=name, email=email, phone=phone,
                       address=address, city=city,
                       postcode=postcode, password=password)
        self.click_submit()
