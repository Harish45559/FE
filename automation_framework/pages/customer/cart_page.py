"""
pages/customer/cart_page.py
----------------------------
Page Object for the customer cart / checkout summary page.
In the current app the cart lives as a panel on the menu page and/or a
dedicated cart route at /customer/cart.
"""

import sys
import os

from selenium.webdriver.common.by import By

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from pages.base_page import BasePage
from config.config import BASE_URL


class CartPage(BasePage):
    """Encapsulates cart interactions."""

    URL = f"{BASE_URL}/customer/cart"

    # ── Locators ──────────────────────────────────────────────────────────────
    CART_ITEMS       = (By.CSS_SELECTOR, "[data-testid^='cart-item-'], .cc-item")
    ITEM_COUNT_BADGE = (By.CSS_SELECTOR, "[data-testid='cart-item-count'], .cc-count")
    TOTAL_AMOUNT     = (By.CSS_SELECTOR, "[data-testid='cart-total'], .cc-total")
    CHECKOUT_BTN     = (By.CSS_SELECTOR, "[data-testid='proceed-checkout'], .cc-checkout-btn")
    EMPTY_MSG        = (By.CSS_SELECTOR, "[data-testid='empty-cart'], .cc-empty")
    REMOVE_BTNS      = (By.CSS_SELECTOR, "[data-testid^='remove-item-'], .cc-remove")

    # ── Navigation ────────────────────────────────────────────────────────────

    def open(self) -> "CartPage":
        self.navigate_to(self.URL)
        return self

    # ── Queries ───────────────────────────────────────────────────────────────

    def get_item_count(self) -> int:
        """Return the number of distinct line-items in the cart."""
        return len(self.find_all(self.CART_ITEMS))

    def get_total_amount(self) -> str:
        """Return the displayed total string, e.g. '£12.50'."""
        try:
            return self.get_text(self.TOTAL_AMOUNT)
        except Exception:
            return ""

    def is_empty(self) -> bool:
        return self.is_visible(self.EMPTY_MSG)

    # ── Actions ───────────────────────────────────────────────────────────────

    def proceed_to_checkout(self):
        """Click the button that advances to the payment/confirmation step."""
        self.click(self.CHECKOUT_BTN)

    def remove_first_item(self):
        """Remove the first item from the cart."""
        btns = self.find_all(self.REMOVE_BTNS)
        if btns:
            btns[0].click()
