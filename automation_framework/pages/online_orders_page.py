"""
pages/online_orders_page.py
----------------------------
Page Object for the Online Orders (staff) page at /online-orders.
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from pages.base_page import BasePage
from config.config import BASE_URL


class OnlineOrdersPage(BasePage):

    _ORDER_CARDS   = (By.CSS_SELECTOR, "[class*='order-card'], [class*='oo-card'], [class*='online-order']")
    _ACCEPT_BTNS   = (By.XPATH, "//button[contains(text(),'Accept')]")
    _REJECT_BTNS   = (By.XPATH, "//button[contains(text(),'Reject')]")
    _READY_BTNS    = (By.XPATH, "//button[contains(text(),'Ready') or contains(text(),'Order is Ready')]")
    _MARK_PAID     = (By.XPATH, "//button[contains(text(),'Mark as Paid')]")
    _DELIVER_BTNS  = (By.XPATH, "//button[contains(text(),'Mark as Delivered')]")
    _EMPTY_STATE   = (By.XPATH, "//*[contains(text(),'No orders') or contains(text(),'no orders')]")
    _STATUS_TABS   = (By.CSS_SELECTOR, "[class*='tab'], [class*='filter-btn']")

    def open(self):
        self.driver.get(f"{BASE_URL}/online-orders")
        return self

    def is_loaded(self) -> bool:
        try:
            self.wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR,
                 "[class*='online-orders'], [class*='OnlineOrders'], [class*='oo-']")
            ))
            return True
        except Exception:
            return False

    def get_order_cards(self):
        try:
            return self.driver.find_elements(*self._ORDER_CARDS)
        except Exception:
            return []

    def has_accept_buttons(self) -> bool:
        return len(self.driver.find_elements(*self._ACCEPT_BTNS)) > 0

    def has_empty_state(self) -> bool:
        try:
            self.driver.find_element(*self._EMPTY_STATE)
            return True
        except Exception:
            return False

    def get_page_heading(self) -> str:
        try:
            el = self.driver.find_element(
                By.XPATH, "//h1|//h2|//*[contains(@class,'heading')]"
            )
            return el.text.strip()
        except Exception:
            return ""
