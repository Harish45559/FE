"""
pages/dashboard_page.py
-----------------------
Page Object for the admin dashboard at /dashboard.
Selectors mirror the CSS classes used in Dashboard.jsx.
"""

import sys
import os

from selenium.webdriver.common.by import By

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from pages.base_page import BasePage
from config.config import BASE_URL


class DashboardPage(BasePage):
    """Encapsulates interactions with the admin dashboard."""

    URL = f"{BASE_URL}/dashboard"

    # ── Locators ──────────────────────────────────────────────────────────────
    HEADING      = (By.CSS_SELECTOR, "h1.dash-title")
    STAT_REVENUE = (By.ID, "dash-stat-revenue")
    STAT_ORDERS  = (By.ID, "dash-stat-orders")
    STAT_AVG     = (By.ID, "dash-stat-avg")
    STAT_STAFF   = (By.ID, "dash-stat-staff")
    TILL_SUMMARY = (By.ID, "dash-till-summary")
    SIDEBAR      = (By.CSS_SELECTOR, ".dl-sidebar")
    LOGOUT_BTN   = (By.CSS_SELECTOR, ".dl-logout")
    NAV_ITEMS    = (By.CSS_SELECTOR, ".dl-item-label")

    # Online-order toggle visible in the dashboard header
    ONLINE_TOGGLE = (By.CSS_SELECTOR, "[data-testid='online-toggle']")
    PENDING_BADGE = (By.CSS_SELECTOR, "[data-testid='pending-orders-badge']")

    # ── Navigation ────────────────────────────────────────────────────────────

    def open(self) -> "DashboardPage":
        self.navigate_to(self.URL)
        return self

    def is_loaded(self) -> bool:
        self.wait_for_url_contains("/dashboard")
        return self.wait_for_visible(self.HEADING).is_displayed()

    # ── Queries ───────────────────────────────────────────────────────────────

    def get_title(self) -> str:
        return self.get_text(self.HEADING)

    def get_nav_labels(self) -> list:
        return [el.text for el in self.find_all(self.NAV_ITEMS)]

    def are_stat_cards_displayed(self) -> bool:
        return all(
            self.is_visible(loc)
            for loc in [self.STAT_REVENUE, self.STAT_ORDERS, self.STAT_AVG, self.STAT_STAFF]
        )

    def is_till_summary_displayed(self) -> bool:
        return self.is_visible(self.TILL_SUMMARY)

    def is_online_toggle_visible(self) -> bool:
        return self.is_element_present(self.ONLINE_TOGGLE)

    def is_pending_badge_visible(self) -> bool:
        return self.is_element_present(self.PENDING_BADGE)

    # ── Actions ───────────────────────────────────────────────────────────────

    def navigate_to_attendance(self):
        """Click the Attendance nav item in the sidebar."""
        items = self.find_all(self.NAV_ITEMS)
        for item in items:
            if "attendance" in item.text.lower():
                item.click()
                return
        raise RuntimeError("Attendance nav item not found in sidebar")

    def navigate_to_employees(self):
        """Click the Employees nav item in the sidebar."""
        items = self.find_all(self.NAV_ITEMS)
        for item in items:
            if "employee" in item.text.lower():
                item.click()
                return
        raise RuntimeError("Employees nav item not found in sidebar")

    def click_logout(self):
        self.click(self.LOGOUT_BTN)

    # ── Compatibility alias ───────────────────────────────────────────────────

    def is_clock_in_visible(self) -> bool:
        """
        Dashboard does not show a clock-in button, but this stub keeps
        existing tests that call the method from breaking.
        """
        return False
