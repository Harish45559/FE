"""
tests/ui/test_eod_sales.py
---------------------------
UI tests for the End-of-Day Sales page at /eod-sales.

Covered scenarios:
  - Page loads after admin login.
  - Summary tab is present.
  - Sales figures are rendered.
  - Chart canvas is displayed.
  - Today / Weekly filter buttons work without errors.
  - Unauthenticated access redirects to login.
"""

import os
import sys
import time

import pytest
from selenium.webdriver.support import expected_conditions as EC

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.base_test import BaseTest
from pages.login_page import LoginPage
from pages.eod_sales_page import EodSalesPage
from config.config import BASE_URL, ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD


def _admin_login(driver, wait):
    LoginPage(driver, wait).open().login(ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD)
    wait.until(EC.url_contains("/dashboard"))


@pytest.mark.ui
@pytest.mark.smoke
class TestEodSalesUI(BaseTest):
    """Selenium UI tests for the End-of-Day Sales dashboard."""

    def test_eod_page_loads(self):
        """Admin can navigate to /eod-sales and the page renders."""
        _admin_login(self.driver, self.wait)
        page = EodSalesPage(self.driver, self.wait).open()
        assert page.is_loaded(), "EOD Sales page did not load"

    def test_summary_tab_is_present(self):
        """A Summary tab or section should be visible on the EOD page."""
        _admin_login(self.driver, self.wait)
        page = EodSalesPage(self.driver, self.wait).open()
        page.is_loaded()
        assert page.has_summary_tab(), "Summary tab not found on EOD Sales page"

    def test_sales_figures_rendered(self):
        """Total, cash, and card sales figures should appear on the page."""
        _admin_login(self.driver, self.wait)
        page = EodSalesPage(self.driver, self.wait).open()
        page.is_loaded()
        time.sleep(1)  # allow API data to load
        figures = page.get_sales_figures()
        assert len(figures) > 0, "No sales figures rendered on EOD page"

    def test_chart_is_displayed(self):
        """A chart (canvas element) should be visible on the EOD page."""
        _admin_login(self.driver, self.wait)
        page = EodSalesPage(self.driver, self.wait).open()
        page.is_loaded()
        time.sleep(1.5)
        assert page.has_chart(), "Chart canvas not found on EOD Sales page"

    @pytest.mark.regression
    @pytest.mark.parametrize("filter_name", ["today", "weekly"])
    def test_date_filter_does_not_crash(self, filter_name):
        """Clicking Today or Weekly filter should not cause a page error."""
        _admin_login(self.driver, self.wait)
        page = EodSalesPage(self.driver, self.wait).open()
        page.is_loaded()
        if filter_name == "today":
            page.click_today_filter()
        else:
            page.click_weekly_filter()
        time.sleep(1)
        assert page.is_loaded(), f"Page crashed after clicking {filter_name} filter"

    def test_unauthenticated_eod_redirects_to_login(self):
        """Accessing /eod-sales without a session should redirect to /login."""
        self.driver.delete_all_cookies()
        self.driver.get(f"{BASE_URL}/eod-sales")
        self.wait.until(EC.url_contains("/login"))
        assert "/login" in self.driver.current_url, (
            "Expected redirect to /login for unauthenticated access to /eod-sales"
        )
