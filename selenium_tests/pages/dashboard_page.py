import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from .base_page import BasePage
from config import BASE_URL


class DashboardPage(BasePage):
    URL = f"{BASE_URL}/dashboard"

    HEADING        = (By.CSS_SELECTOR, "h1.dash-title")
    STAT_REVENUE   = (By.ID, "dash-stat-revenue")
    STAT_ORDERS    = (By.ID, "dash-stat-orders")
    STAT_AVG       = (By.ID, "dash-stat-avg")
    STAT_STAFF     = (By.ID, "dash-stat-staff")
    TILL_SUMMARY   = (By.ID, "dash-till-summary")
    SIDEBAR        = (By.CSS_SELECTOR, ".dl-sidebar")
    LOGOUT_BTN     = (By.CSS_SELECTOR, ".dl-logout")
    NAV_ITEMS      = (By.CSS_SELECTOR, ".dl-item-label")
    DASH_STATS     = (By.CSS_SELECTOR, ".dash-stats")

    def open(self):
        self.navigate_to(self.URL)
        return self

    def is_loaded(self):
        self.wait_for_url("/dashboard")
        return self.wait_for_visible(*self.HEADING).is_displayed()

    def get_heading(self):
        return self.wait_for_visible(*self.HEADING).text

    def are_stat_cards_displayed(self):
        return all([
            self.find(*self.STAT_REVENUE).is_displayed(),
            self.find(*self.STAT_ORDERS).is_displayed(),
            self.find(*self.STAT_AVG).is_displayed(),
            self.find(*self.STAT_STAFF).is_displayed(),
        ])

    def is_till_summary_displayed(self):
        return self.find(*self.TILL_SUMMARY).is_displayed()

    def get_nav_labels(self):
        return [el.text for el in self.find_all(*self.NAV_ITEMS)]

    def click_logout(self):
        self.find(*self.LOGOUT_BTN).click()
