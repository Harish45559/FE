"""
tests/ui/test_online_orders.py
-------------------------------
UI tests for the Online Orders (staff view) page at /online-orders.

Covered scenarios:
  - Page loads after admin login.
  - Order cards or empty-state message is rendered.
  - The page does not show an error on load.
  - Unauthenticated access redirects to login.
  - Page continues to render after 10 seconds (polling must not crash the page).
"""

import os
import sys
import time

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.base_test import BaseTest
from pages.login_page import LoginPage
from pages.online_orders_page import OnlineOrdersPage
from config.config import BASE_URL, ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD


def _admin_login(driver, wait):
    LoginPage(driver, wait).open().login(ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD)
    wait.until(EC.url_contains("/dashboard"))


@pytest.mark.ui
@pytest.mark.smoke
class TestOnlineOrdersUI(BaseTest):
    """Selenium UI tests for the staff Online Orders page."""

    def test_online_orders_page_loads(self):
        """Admin can navigate to /online-orders and the page renders."""
        _admin_login(self.driver, self.wait)
        page = OnlineOrdersPage(self.driver, self.wait).open()
        assert page.is_loaded(), "Online Orders page did not load"

    def test_orders_or_empty_state_shown(self):
        """Page shows either order cards or an empty-state message — not a blank screen."""
        _admin_login(self.driver, self.wait)
        page = OnlineOrdersPage(self.driver, self.wait).open()
        page.is_loaded()
        time.sleep(2)  # allow initial poll to complete
        cards   = page.get_order_cards()
        empty   = page.has_empty_state()
        assert len(cards) > 0 or empty, (
            "Online Orders page shows neither cards nor an empty-state message"
        )

    def test_no_js_error_on_load(self):
        """Browser console should not contain critical JS errors on load."""
        _admin_login(self.driver, self.wait)
        page = OnlineOrdersPage(self.driver, self.wait).open()
        page.is_loaded()
        logs = self.driver.get_log("browser")
        severe = [l for l in logs if l.get("level") == "SEVERE"]
        assert not severe, f"Severe browser errors on online-orders load: {severe}"

    @pytest.mark.regression
    def test_polling_does_not_crash_page(self):
        """After 15 seconds of polling the page must still be responsive."""
        _admin_login(self.driver, self.wait)
        page = OnlineOrdersPage(self.driver, self.wait).open()
        page.is_loaded()
        time.sleep(15)
        assert page.is_loaded(), (
            "Online Orders page is no longer responsive after polling interval"
        )

    def test_unauthenticated_online_orders_redirects_to_login(self):
        """Accessing /online-orders without a session should redirect to /login."""
        self.driver.delete_all_cookies()
        self.driver.get(f"{BASE_URL}/online-orders")
        self.wait.until(EC.url_contains("/login"))
        assert "/login" in self.driver.current_url, (
            "Expected redirect to /login for unauthenticated access to /online-orders"
        )
