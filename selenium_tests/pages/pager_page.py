import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from .base_page import BasePage
from config import BASE_URL


class BillingPagerMixin(BasePage):
    """
    Mixin for pager-related elements on the BillingCounter page.
    Used alongside BillingPage in tests.
    """
    # Order type toggle buttons
    EAT_IN_BTN      = (By.XPATH, "//button[contains(., 'Eat In')]")
    TAKE_AWAY_BTN    = (By.XPATH, "//button[contains(., 'Take Away')]")

    # Post-order buttons
    PAGER_QR_BTN     = (By.XPATH, "//button[contains(., 'Show Pager QR')]")
    NEW_ORDER_BTN    = (By.XPATH, "//button[contains(., 'New Order')]")

    # QR modal
    QR_MODAL_IMG     = (By.XPATH, "//img[@alt='Pager QR Code']")
    QR_MODAL_CLOSE   = (By.XPATH, "//button[normalize-space()='Done']")
    QR_PRINT_BTN     = (By.XPATH, "//button[contains(., 'Print QR')]")

    def order_type_buttons_visible(self):
        eat_in   = self.is_element_present(*self.EAT_IN_BTN)
        take_away = self.is_element_present(*self.TAKE_AWAY_BTN)
        return eat_in and take_away

    def click_eat_in(self):
        self.wait_for_visible(*self.EAT_IN_BTN).click()

    def click_take_away(self):
        self.wait_for_visible(*self.TAKE_AWAY_BTN).click()

    def eat_in_is_selected(self):
        btn = self.find(*self.EAT_IN_BTN)
        return "selected" in btn.get_attribute("class")

    def take_away_is_selected(self):
        btn = self.find(*self.TAKE_AWAY_BTN)
        return "selected" in btn.get_attribute("class")

    def pager_qr_button_visible(self, timeout=15):
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located(self.PAGER_QR_BTN)
            )
            return True
        except Exception:
            return False

    def click_pager_qr(self):
        self.wait_for_visible(*self.PAGER_QR_BTN).click()

    def qr_modal_is_visible(self, timeout=10):
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located(self.QR_MODAL_IMG)
            )
            return True
        except Exception:
            return False

    def qr_image_has_src(self):
        img = self.find(*self.QR_MODAL_IMG)
        src = img.get_attribute("src")
        return src and src.startswith("data:image/png;base64,")

    def close_qr_modal(self):
        self.wait_for_visible(*self.QR_MODAL_CLOSE).click()

    def new_order_button_visible(self):
        return self.is_element_present(*self.NEW_ORDER_BTN)

    def click_new_order(self):
        self.wait_for_visible(*self.NEW_ORDER_BTN).click()


class PreviousOrdersPagerMixin(BasePage):
    """
    Mixin for pager-related elements on the PreviousOrders page.
    """
    QR_BUTTONS       = (By.XPATH, "//button[contains(., 'QR')]")
    READY_BUTTONS    = (By.XPATH, "//button[contains(., 'Ready')]")
    NOTIFIED_BADGES  = (By.XPATH, "//*[contains(., '✓ Done') or contains(., '✓ Notified')]")

    # QR modal (same structure as billing)
    QR_MODAL_IMG     = (By.XPATH, "//img[@alt='Pager QR']")
    QR_MODAL_CLOSE   = (By.XPATH, "//button[normalize-space()='Close']")

    def has_qr_buttons(self):
        return len(self.find_all(*self.QR_BUTTONS)) > 0

    def click_first_qr_button(self):
        btns = self.find_all(*self.QR_BUTTONS)
        if btns:
            btns[0].click()
            return True
        return False

    def qr_modal_is_visible(self, timeout=10):
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located(self.QR_MODAL_IMG)
            )
            return True
        except Exception:
            return False

    def close_qr_modal(self):
        self.wait_for_visible(*self.QR_MODAL_CLOSE).click()

    def has_ready_buttons(self):
        return len(self.find_all(*self.READY_BUTTONS)) > 0

    def click_first_ready_button(self):
        btns = self.find_all(*self.READY_BUTTONS)
        if btns:
            btns[0].click()
            return True
        return False

    def has_notified_badges(self):
        return len(self.find_all(*self.NOTIFIED_BADGES)) > 0


class CustomerPagerPage(BasePage):
    """
    Page object for the public customer-facing pager page /pager/:token.
    """
    ACTIVATE_OVERLAY = (By.ID, "activate-overlay")
    TAP_BTN          = (By.ID, "tap-btn")
    MAIN_CARD        = (By.ID, "main-card")
    WAITING_SECTION  = (By.ID, "waiting-section")
    READY_SECTION    = (By.ID, "ready-section")
    LOGO_IMG         = (By.XPATH, "//div[@id='activate-overlay']//img")

    def open(self, token):
        self.navigate_to(f"{BASE_URL.replace('5173', '5000')}/pager/{token}")
        return self

    def activate_overlay_visible(self):
        return self.wait_for_visible(*self.ACTIVATE_OVERLAY).is_displayed()

    def logo_is_displayed(self):
        return self.wait_for_visible(*self.LOGO_IMG).is_displayed()

    def tap_to_start(self):
        self.wait_for_visible(*self.TAP_BTN).click()

    def waiting_section_visible(self, timeout=8):
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located(self.WAITING_SECTION)
            )
            return True
        except Exception:
            return False

    def contains_brand(self):
        return "Mirchi Mafia" in self.driver.page_source

    def page_title_is_correct(self):
        return "Mirchi Mafia" in self.driver.title
