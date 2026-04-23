"""
pages/billing_counter_page.py
------------------------------
Page Object for the Billing Counter (POS) page at /billing.
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from pages.base_page import BasePage
from config.config import BASE_URL


class BillingCounterPage(BasePage):

    # Locators
    _MENU_ITEMS    = (By.CSS_SELECTOR, ".bc-menu-item, .menu-item, [class*='menu-item']")
    _CART_SECTION  = (By.CSS_SELECTOR, ".bc-cart, .cart-panel, [class*='cart']")
    _ORDER_TOTAL   = (By.CSS_SELECTOR, ".bc-total, .order-total, [class*='total']")
    _PLACE_ORDER   = (By.XPATH, "//button[contains(text(),'Place Order') or contains(text(),'place order')]")
    _TILL_STATUS   = (By.CSS_SELECTOR, ".bc-till, [class*='till'], [class*='Till']")
    _SEARCH_INPUT  = (By.CSS_SELECTOR, "input[placeholder*='Search'], input[type='search']")
    _CATEGORY_BTN  = (By.CSS_SELECTOR, ".bc-category, [class*='category-btn'], [class*='cat-btn']")
    _PAYMENT_BTN   = (By.CSS_SELECTOR, "[class*='payment'], button[class*='pay']")

    def open(self):
        self.driver.get(f"{BASE_URL}/billing")
        return self

    def is_loaded(self) -> bool:
        try:
            self.wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, "[class*='billing'], [class*='BillingCounter'], [class*='bc-']")
            ))
            return True
        except Exception:
            return False

    def get_menu_items(self):
        try:
            return self.driver.find_elements(*self._MENU_ITEMS)
        except Exception:
            return []

    def get_search_input(self):
        try:
            return self.driver.find_element(*self._SEARCH_INPUT)
        except Exception:
            return None

    def search_item(self, query: str):
        el = self.get_search_input()
        if el:
            el.clear()
            el.send_keys(query)

    def has_till_indicator(self) -> bool:
        try:
            self.driver.find_element(*self._TILL_STATUS)
            return True
        except Exception:
            return False

    def has_place_order_button(self) -> bool:
        try:
            self.driver.find_element(*self._PLACE_ORDER)
            return True
        except Exception:
            return False

    def get_page_title_text(self) -> str:
        try:
            el = self.driver.find_element(By.TAG_NAME, "h1") or \
                 self.driver.find_element(By.CSS_SELECTOR, "[class*='title'], [class*='header']")
            return el.text.strip()
        except Exception:
            return ""
