import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from .base_page import BasePage
from config import BASE_URL


class OnlineOrdersPage(BasePage):
    URL = f"{BASE_URL}/online-orders"

    # Locators
    HEADING       = (By.CSS_SELECTOR, "h1.oo-title")
    TAB_PENDING   = (By.XPATH, "//button[contains(@class,'oo-tab') and contains(text(),'Pending')]")
    TAB_ACCEPTED  = (By.XPATH, "//button[contains(@class,'oo-tab') and contains(text(),'Accepted')]")
    TAB_REJECTED  = (By.XPATH, "//button[contains(@class,'oo-tab') and contains(text(),'Rejected')]")
    TAB_ALL       = (By.XPATH, "//button[contains(@class,'oo-tab') and contains(text(),'All')]")
    TOGGLE_BTN    = (By.CSS_SELECTOR, ".oo-toggle-btn")
    TOGGLE_ROW    = (By.CSS_SELECTOR, ".oo-toggle-row")
    TABS_WRAPPER  = (By.CSS_SELECTOR, ".oo-tabs")
    TITLE_ROW     = (By.CSS_SELECTOR, ".oo-title-row")

    def open(self):
        self.navigate_to(self.URL)
        return self

    def is_loaded(self):
        try:
            return self.wait_for_visible(*self.HEADING).is_displayed()
        except Exception:
            return False

    def get_title(self):
        return self.wait_for_visible(*self.HEADING).text

    def is_tabs_visible(self):
        return self.is_element_present(*self.TABS_WRAPPER)

    def is_pending_tab_visible(self):
        return self.is_element_present(*self.TAB_PENDING)

    def is_toggle_visible(self):
        return self.is_element_present(*self.TOGGLE_ROW)

    def click_tab(self, name):
        """Click a tab by name: 'Pending', 'Accepted', 'Rejected', 'All'."""
        locator_map = {
            "Pending":  self.TAB_PENDING,
            "Accepted": self.TAB_ACCEPTED,
            "Rejected": self.TAB_REJECTED,
            "All":      self.TAB_ALL,
        }
        self.find(*locator_map[name]).click()

    def get_active_tab_text(self):
        try:
            active = self.find(By.CSS_SELECTOR, ".oo-tab.active")
            return active.text
        except Exception:
            return ""
