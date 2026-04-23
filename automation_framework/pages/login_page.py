"""
pages/login_page.py
-------------------
Page Object for the staff/admin login page at /login.
Mirrors the actual DOM IDs used in the React Login.jsx component.
"""

import sys
import os

from selenium.webdriver.common.by import By

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from pages.base_page import BasePage
from config.config import BASE_URL


class LoginPage(BasePage):
    """Encapsulates all interactions with the /login page."""

    URL = f"{BASE_URL}/login"

    # ── Locators ──────────────────────────────────────────────────────────────
    USERNAME_INPUT  = (By.ID, "username")
    PASSWORD_INPUT  = (By.ID, "password")
    LOGIN_BTN       = (By.ID, "login-btn")
    ERROR_MSG       = (By.ID, "login-error")
    TOGGLE_PASSWORD = (By.ID, "toggle-password")
    FORGOT_PASSWORD = (By.ID, "forgot-password")
    HEADING         = (By.CSS_SELECTOR, "h2.title")
    TAGLINE         = (By.CSS_SELECTOR, "p.tagline")
    BRAND_LOGO      = (By.CSS_SELECTOR, "img.brand-logo")

    # ── Navigation ────────────────────────────────────────────────────────────

    def open(self) -> "LoginPage":
        self.navigate_to(self.URL)
        return self

    # ── Actions ───────────────────────────────────────────────────────────────

    def enter_username(self, username: str):
        self.type_text(self.USERNAME_INPUT, username)

    def enter_password(self, password: str):
        self.type_text(self.PASSWORD_INPUT, password)

    def click_login(self):
        self.click(self.LOGIN_BTN)

    def login(self, username: str, password: str):
        """Fill both fields and submit the login form."""
        self.enter_username(username)
        self.enter_password(password)
        self.click_login()

    def toggle_password_visibility(self):
        self.click(self.TOGGLE_PASSWORD)

    # ── Queries ───────────────────────────────────────────────────────────────

    def get_error_message(self) -> str:
        return self.get_text(self.ERROR_MSG)

    def get_heading_text(self) -> str:
        return self.get_text(self.HEADING)

    def get_tagline_text(self) -> str:
        return self.get_text(self.TAGLINE)

    def get_password_field_type(self) -> str:
        return self.find(self.PASSWORD_INPUT).get_attribute("type")

    def is_forgot_password_visible(self) -> bool:
        return self.is_visible(self.FORGOT_PASSWORD)

    def is_brand_logo_displayed(self) -> bool:
        return self.is_visible(self.BRAND_LOGO)
