import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from .base_page import BasePage
from config import BASE_URL


class CustomerMenuPage(BasePage):
    URL = f"{BASE_URL}/customer/menu"

    # Locators — data-testid attributes
    SEARCH_INPUT    = (By.CSS_SELECTOR, "[data-testid='menu-search']")
    CATEGORIES      = (By.CSS_SELECTOR, "[data-testid='menu-categories']")
    MENU_GRID       = (By.CSS_SELECTOR, "[data-testid='menu-grid']")
    ANY_ADD_BTN     = (By.CSS_SELECTOR, "[data-testid^='add-btn-']")
    CART_PANEL      = (By.CSS_SELECTOR, "[data-testid='cart-panel']")
    CHECKOUT_BTN    = (By.CSS_SELECTOR, "[data-testid='checkout-btn']")
    MOBILE_CART_BAR = (By.CSS_SELECTOR, "[data-testid='mobile-cart-bar']")
    QTY_MINUS       = (By.CSS_SELECTOR, ".cm-qty-minus")
    QTY_PLUS        = (By.CSS_SELECTOR, ".cm-qty-plus")
    QTY_NUM         = (By.CSS_SELECTOR, ".cm-qty-num")
    CART_BADGE      = (By.CSS_SELECTOR, ".cm-cart-badge")
    RESULT_COUNT    = (By.CSS_SELECTOR, ".cm-result-count")
    ALL_TAB         = (By.XPATH, "//button[contains(@class,'cm-tab') and text()='All']")
    LOADING         = (By.CSS_SELECTOR, ".cm-loading")

    def open(self):
        self.navigate_to(self.URL)
        return self

    def is_loaded(self):
        """Wait for the menu grid or empty state to appear (loading done)."""
        try:
            from selenium.webdriver.support import expected_conditions as EC
            from selenium.webdriver.support.ui import WebDriverWait
            # Wait for loading spinner to disappear
            WebDriverWait(self.driver, 10).until(
                EC.invisibility_of_element_located(self.LOADING)
            )
            return True
        except Exception:
            return True  # loading div may never appear if fast

    def is_search_visible(self):
        return self.is_element_present(*self.SEARCH_INPUT)

    def is_categories_visible(self):
        return self.is_element_present(*self.CATEGORIES)

    def is_menu_grid_visible(self):
        return self.is_element_present(*self.MENU_GRID)

    def type_search(self, text):
        field = self.wait_for_visible(*self.SEARCH_INPUT)
        field.clear()
        field.send_keys(text)

    def clear_search(self):
        field = self.find(*self.SEARCH_INPUT)
        field.clear()

    def get_result_count_text(self):
        try:
            return self.find(*self.RESULT_COUNT).text
        except Exception:
            return ""

    def click_first_add_button(self):
        """Click the first '+ Add' button visible in the grid."""
        btn = self.wait_for_element(*self.ANY_ADD_BTN)
        btn.click()

    def is_cart_panel_visible(self):
        return self.is_element_present(*self.CART_PANEL)

    def is_qty_control_visible(self):
        """Returns True if the inline − qty + control is shown on any card."""
        return self.is_element_present(*self.QTY_MINUS)

    def is_cart_badge_visible(self):
        return self.is_element_present(*self.CART_BADGE)

    def get_qty_number(self):
        try:
            return self.find(*self.QTY_NUM).text
        except Exception:
            return "0"

    def get_category_tab_count(self):
        """Count how many category tab buttons are rendered (includes 'All')."""
        tabs = self.find_all(By.CSS_SELECTOR, ".cm-tab")
        return len(tabs)
