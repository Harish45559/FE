"""
pages/customer/payment_page.py
-------------------------------
Page Object for the customer payment / order-confirmation step.
Maps to CustomerPayment.jsx and the POST /api/customer/orders endpoint.

Supported payment methods (from backend validation):
  - "Pay on Collection"
  - "Card"
"""

import sys
import os

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from pages.base_page import BasePage
from config.config import BASE_URL


class PaymentPage(BasePage):
    """Handles the payment method selection and order placement step."""

    URL = f"{BASE_URL}/customer/payment"

    # ── Locators ──────────────────────────────────────────────────────────────
    PAYMENT_METHOD_SELECT = (By.CSS_SELECTOR, "select[name='payment_method'], [data-testid='payment-method']")
    PAYMENT_RADIO_BASE    = "[data-testid='payment-option-{method}']"
    PICKUP_TIME_INPUT     = (By.CSS_SELECTOR, "input[name='pickup_time'], [data-testid='pickup-time']")
    ORDER_TYPE_SELECT     = (By.CSS_SELECTOR, "select[name='order_type'], [data-testid='order-type']")
    PLACE_ORDER_BTN       = (By.CSS_SELECTOR, "[data-testid='place-order-btn'], .cp-place-order")
    CONFIRMATION_SECTION  = (By.CSS_SELECTOR, "[data-testid='order-confirmation'], .cp-confirmation")
    ORDER_NUMBER          = (By.CSS_SELECTOR, "[data-testid='order-number'], .cp-order-number")
    ERROR_MSG             = (By.CSS_SELECTOR, ".alert.error, [data-testid='payment-error']")

    # ── Navigation ────────────────────────────────────────────────────────────

    def open(self) -> "PaymentPage":
        self.navigate_to(self.URL)
        return self

    # ── Actions ───────────────────────────────────────────────────────────────

    def select_payment_method(self, method: str):
        """
        Choose the payment method.

        Parameters
        ----------
        method : str  "Pay on Collection" or "Card"
        """
        if self.is_element_present(self.PAYMENT_METHOD_SELECT):
            Select(self.find(self.PAYMENT_METHOD_SELECT)).select_by_visible_text(method)
        else:
            # Radio-button style
            locator = (By.CSS_SELECTOR, self.PAYMENT_RADIO_BASE.format(method=method.replace(" ", "-")))
            self.click(locator)

    def set_pickup_time(self, time_str: str):
        """
        Set the desired pickup time.

        Parameters
        ----------
        time_str : str  e.g. '18:00 23/04/2025'
        """
        if self.is_element_present(self.PICKUP_TIME_INPUT):
            self.type_text(self.PICKUP_TIME_INPUT, time_str)

    def place_order(self):
        """Click the Place Order button."""
        self.click(self.PLACE_ORDER_BTN)

    # ── Queries ───────────────────────────────────────────────────────────────

    def get_order_confirmation(self) -> str:
        """Return the confirmation message or order number text."""
        try:
            return self.get_text(self.CONFIRMATION_SECTION)
        except Exception:
            try:
                return self.get_text(self.ORDER_NUMBER)
            except Exception:
                return ""

    def get_error_message(self) -> str:
        try:
            return self.get_text(self.ERROR_MSG)
        except Exception:
            return ""

    def is_confirmation_visible(self) -> bool:
        return self.is_visible(self.CONFIRMATION_SECTION)
