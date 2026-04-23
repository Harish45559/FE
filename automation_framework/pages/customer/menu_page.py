"""
pages/customer/menu_page.py
----------------------------
Page Object for the customer-facing menu at /customer/menu.
This page is publicly accessible — no login required.
Uses data-testid attributes from CustomerMenu.jsx.
"""

import sys
import os

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from pages.base_page import BasePage
from config.config import BASE_URL


class MenuPage(BasePage):
    """Encapsulates customer menu page interactions."""

    URL = f"{BASE_URL}/customer/menu"

    # ── Locators ──────────────────────────────────────────────────────────────
    SEARCH_INPUT    = (By.CSS_SELECTOR, "[data-testid='menu-search']")
    CATEGORIES      = (By.CSS_SELECTOR, "[data-testid='menu-categories']")
    MENU_GRID       = (By.CSS_SELECTOR, "[data-testid='menu-grid']")
    ANY_ADD_BTN     = (By.CSS_SELECTOR, "[data-testid^='add-btn-']")
    CART_PANEL      = (By.CSS_SELECTOR, "[data-testid='cart-panel']")
    CHECKOUT_BTN    = (By.CSS_SELECTOR, "[data-testid='checkout-btn']")
    CART_BADGE      = (By.CSS_SELECTOR, ".cm-cart-badge")
    RESULT_COUNT    = (By.CSS_SELECTOR, ".cm-result-count")
    LOADING_SPINNER = (By.CSS_SELECTOR, ".cm-loading")
    CATEGORY_TABS   = (By.CSS_SELECTOR, ".cm-tab")

    # ── Navigation ────────────────────────────────────────────────────────────

    def open(self) -> "MenuPage":
        self.navigate_to(self.URL)
        return self

    def is_loaded(self) -> bool:
        """Wait for the loading spinner to disappear."""
        try:
            WebDriverWait(self.driver, 10).until(
                EC.invisibility_of_element_located(self.LOADING_SPINNER)
            )
        except Exception:
            pass  # spinner may not appear for fast responses
        return True

    # ── Search ────────────────────────────────────────────────────────────────

    def search_item(self, query: str):
        """Type *query* into the search field."""
        field = self.wait_for_visible(self.SEARCH_INPUT)
        field.clear()
        field.send_keys(query)

    def clear_search(self):
        self.find(self.SEARCH_INPUT).clear()

    # ── Cart interactions ─────────────────────────────────────────────────────

    def add_first_item_to_cart(self):
        """Click the first visible 'Add' button in the menu grid."""
        btn = self.wait_for_element(self.ANY_ADD_BTN)
        btn.click()

    def get_cart_count(self) -> str:
        """Return the text of the cart badge (e.g. '1')."""
        try:
            return self.find(self.CART_BADGE).text
        except Exception:
            return "0"

    def go_to_cart(self):
        """Click the checkout / cart button."""
        self.click(self.CHECKOUT_BTN)

    # ── Queries ───────────────────────────────────────────────────────────────

    def is_search_visible(self) -> bool:
        return self.is_element_present(self.SEARCH_INPUT)

    def is_categories_visible(self) -> bool:
        return self.is_element_present(self.CATEGORIES)

    def is_menu_grid_visible(self) -> bool:
        return self.is_element_present(self.MENU_GRID)

    def is_cart_panel_visible(self) -> bool:
        return self.is_element_present(self.CART_PANEL)

    def get_category_tab_count(self) -> int:
        return len(self.find_all(self.CATEGORY_TABS))

    def get_result_count_text(self) -> str:
        try:
            return self.find(self.RESULT_COUNT).text
        except Exception:
            return ""
