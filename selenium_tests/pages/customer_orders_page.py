import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from .base_page import BasePage
from config import BASE_URL


class CustomerOrdersPage(BasePage):
    URL = f"{BASE_URL}/customer/orders"

    # Locators
    HEADING      = (By.CSS_SELECTOR, "h1.c-page-title")
    ORDERS_LIST  = (By.CSS_SELECTOR, ".co-list")
    EMPTY_STATE  = (By.CSS_SELECTOR, ".co-empty")
    LOADING      = (By.CSS_SELECTOR, ".co-loading")
    ORDER_CARDS  = (By.CSS_SELECTOR, ".co-card")
    ORDER_NUMBER = (By.CSS_SELECTOR, ".co-number")
    STATUS_BADGE = (By.CSS_SELECTOR, ".co-status-badge")

    def open(self):
        self.navigate_to(self.URL)
        return self

    def is_loaded(self):
        """Wait for loading indicator to disappear, then check heading."""
        try:
            from selenium.webdriver.support import expected_conditions as EC
            from selenium.webdriver.support.ui import WebDriverWait
            WebDriverWait(self.driver, 10).until(
                EC.invisibility_of_element_located(self.LOADING)
            )
        except Exception:
            pass
        try:
            return self.wait_for_visible(*self.HEADING).is_displayed()
        except Exception:
            return False

    def get_title(self):
        return self.wait_for_visible(*self.HEADING).text

    def has_orders(self):
        return self.is_element_present(*self.ORDERS_LIST)

    def is_empty_state_visible(self):
        return self.is_element_present(*self.EMPTY_STATE)

    def get_order_count(self):
        cards = self.find_all(*self.ORDER_CARDS)
        return len(cards)

    def set_customer_token_via_js(self, token, customer_json):
        """Inject customer token into localStorage (faster than UI login flow)."""
        self.driver.execute_script(
            f"localStorage.setItem('customer_token', '{token}');"
            f"localStorage.setItem('customer_user', '{customer_json}');"
        )
