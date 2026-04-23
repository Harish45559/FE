"""
tests/ui/test_billing_counter.py
---------------------------------
UI tests for the Billing Counter (POS) page at /billing.

Covered scenarios:
  - Page loads after admin login.
  - Menu items are displayed.
  - Search input is present.
  - Till status indicator is visible.
  - Place Order button exists.
  - Unauthenticated access redirects to login.
"""

import os
import sys

import pytest
from selenium.webdriver.support import expected_conditions as EC

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.base_test import BaseTest
from pages.login_page import LoginPage
from pages.billing_counter_page import BillingCounterPage
from config.config import BASE_URL, ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD


def _admin_login(driver, wait):
    LoginPage(driver, wait).open().login(ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD)
    wait.until(EC.url_contains("/dashboard"))


@pytest.mark.ui
@pytest.mark.smoke
class TestBillingCounterUI(BaseTest):
    """Selenium UI tests for the Billing Counter (POS) page."""

    def test_billing_counter_page_loads(self):
        """Admin can reach /billing and the POS layout renders."""
        _admin_login(self.driver, self.wait)
        page = BillingCounterPage(self.driver, self.wait).open()
        assert page.is_loaded(), "Billing counter page did not load"

    def test_menu_items_are_displayed(self):
        """At least one menu item should be visible on the billing page."""
        _admin_login(self.driver, self.wait)
        page = BillingCounterPage(self.driver, self.wait).open()
        page.is_loaded()
        items = page.get_menu_items()
        assert len(items) > 0, "No menu items found on the billing counter page"

    def test_search_input_is_present(self):
        """A search/filter input should be available to find menu items quickly."""
        _admin_login(self.driver, self.wait)
        page = BillingCounterPage(self.driver, self.wait).open()
        page.is_loaded()
        assert page.get_search_input() is not None, (
            "Search input not found on billing counter page"
        )

    def test_till_status_indicator_visible(self):
        """The till open/closed indicator should be present on the page."""
        _admin_login(self.driver, self.wait)
        page = BillingCounterPage(self.driver, self.wait).open()
        page.is_loaded()
        assert page.has_till_indicator(), "Till status indicator not found"

    def test_place_order_button_exists(self):
        """The Place Order button must be present (even if disabled with empty cart)."""
        _admin_login(self.driver, self.wait)
        page = BillingCounterPage(self.driver, self.wait).open()
        page.is_loaded()
        assert page.has_place_order_button(), "Place Order button not found"

    @pytest.mark.regression
    def test_unauthenticated_billing_redirects_to_login(self):
        """Accessing /billing without a session should redirect to /login."""
        self.driver.delete_all_cookies()
        self.driver.get(f"{BASE_URL}/billing")
        self.wait.until(EC.url_contains("/login"))
        assert "/login" in self.driver.current_url, (
            "Expected redirect to /login for unauthenticated access to /billing"
        )
