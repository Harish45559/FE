import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from .base_page import BasePage
from config import BASE_URL


class BillingPage(BasePage):
    URL = f"{BASE_URL}/billing"

    POS_LAYOUT     = (By.CSS_SELECTOR, ".bc-pos")
    SIDEBAR        = (By.CSS_SELECTOR, ".bc-sidebar")
    BRAND_NAME     = (By.CSS_SELECTOR, ".bc-sidebar-brand")
    SEARCH_INPUT   = (By.CSS_SELECTOR, ".bc-search")
    ITEM_GRID      = (By.CSS_SELECTOR, ".bc-grid")
    CART           = (By.CSS_SELECTOR, ".bc-cart")
    TILL_OPEN_BTN  = (By.CSS_SELECTOR, ".bc-till-btn.open")

    def open(self):
        self.navigate_to(self.URL)
        return self

    def is_loaded(self):
        self.wait_for_url("/billing")
        return self.wait_for_visible(*self.POS_LAYOUT).is_displayed()

    def is_pos_layout_visible(self):
        return self.find(*self.POS_LAYOUT).is_displayed()

    def is_search_visible(self):
        return self.find(*self.SEARCH_INPUT).is_displayed()

    def is_cart_visible(self):
        return self.find(*self.CART).is_displayed()

    def get_brand_name(self):
        return self.find(*self.BRAND_NAME).text
