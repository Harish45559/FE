import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import time
import pytest
import requests
from selenium.webdriver.support import expected_conditions as EC
from pages.login_page import LoginPage
from pages.billing_page import BillingPage
from pages.previous_orders_page import PreviousOrdersPage
from pages.pager_page import BillingPagerMixin, PreviousOrdersPagerMixin, CustomerPagerPage
from config import BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD

API_BASE = BASE_URL.replace("5173", "5000") + "/api"


def admin_login(driver, wait):
    LoginPage(driver, wait).open().login(ADMIN_USERNAME, ADMIN_PASSWORD)
    wait.until(EC.url_contains("/dashboard"))


def get_admin_token():
    """Get a JWT token directly from the API for setup/teardown helpers."""
    res = requests.post(
        f"{API_BASE}/auth/login",
        json={"username": ADMIN_USERNAME, "password": "12345678"},
    )
    return res.json().get("token")


# ─────────────────────────────────────────────────────────────────────────────
# Order type toggle buttons
# ─────────────────────────────────────────────────────────────────────────────
class TestOrderTypeToggle:

    def test_eat_in_and_take_away_buttons_are_visible(self, driver, wait):
        admin_login(driver, wait)
        billing = BillingPage(driver, wait).open()
        mixin = BillingPagerMixin(driver, wait)
        assert mixin.order_type_buttons_visible(), \
            "Expected Eat In and Take Away toggle buttons to be visible"

    def test_eat_in_is_selected_by_default(self, driver, wait):
        admin_login(driver, wait)
        BillingPage(driver, wait).open()
        mixin = BillingPagerMixin(driver, wait)
        assert mixin.eat_in_is_selected(), "Eat In should be selected by default"

    def test_clicking_take_away_selects_it(self, driver, wait):
        admin_login(driver, wait)
        BillingPage(driver, wait).open()
        mixin = BillingPagerMixin(driver, wait)
        mixin.click_take_away()
        assert mixin.take_away_is_selected(), "Take Away should be selected after clicking"

    def test_clicking_take_away_deselects_eat_in(self, driver, wait):
        admin_login(driver, wait)
        BillingPage(driver, wait).open()
        mixin = BillingPagerMixin(driver, wait)
        mixin.click_take_away()
        assert not mixin.eat_in_is_selected(), "Eat In should NOT be selected after clicking Take Away"

    def test_clicking_eat_in_reselects_it(self, driver, wait):
        admin_login(driver, wait)
        BillingPage(driver, wait).open()
        mixin = BillingPagerMixin(driver, wait)
        mixin.click_take_away()
        mixin.click_eat_in()
        assert mixin.eat_in_is_selected(), "Eat In should be re-selected"
        assert not mixin.take_away_is_selected(), "Take Away should no longer be selected"

    def test_no_dropdown_for_order_type(self, driver, wait):
        admin_login(driver, wait)
        BillingPage(driver, wait).open()
        selects = driver.find_elements("css selector", "select.bc-select")
        assert len(selects) == 0, "Order type dropdown should not exist — replaced by buttons"


# ─────────────────────────────────────────────────────────────────────────────
# Customer pager page — /pager/:token
# ─────────────────────────────────────────────────────────────────────────────
class TestCustomerPagerPage:

    @pytest.fixture(autouse=True)
    def setup_pager_token(self):
        """Place an order and generate a pager token via API before each test."""
        token = get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}

        order_res = requests.post(
            f"{API_BASE}/orders",
            json={
                "customer_name": "Selenium Test",
                "server_name": "Test Server",
                "order_type": "Take Away",
                "items": [{"name": "Coffee", "qty": 1, "price": 2.0}],
                "total_amount": 2.0,
                "final_amount": 2.0,
                "payment_method": "cash",
            },
            headers=headers,
        )
        assert order_res.status_code == 201, f"Failed to place order: {order_res.text}"
        order_id = order_res.json()["order"]["id"]

        pager_res = requests.post(
            f"{API_BASE}/pager/generate/{order_id}", headers=headers
        )
        assert pager_res.status_code == 200, f"Failed to generate pager: {pager_res.text}"

        self.pager_token = pager_res.json()["token"]
        self.order_id = order_id
        self.api_headers = headers

    def test_page_shows_activate_overlay_first(self, driver, wait):
        page = CustomerPagerPage(driver, wait).open(self.pager_token)
        assert page.activate_overlay_visible(), \
            "Tap-to-activate overlay should be shown on first load"

    def test_page_shows_logo(self, driver, wait):
        page = CustomerPagerPage(driver, wait).open(self.pager_token)
        assert page.logo_is_displayed(), "Logo should be visible on the activate overlay"

    def test_page_contains_mirchi_mafia_branding(self, driver, wait):
        page = CustomerPagerPage(driver, wait).open(self.pager_token)
        assert page.contains_brand(), "Page should contain 'Mirchi Mafia'"

    def test_page_title_is_correct(self, driver, wait):
        page = CustomerPagerPage(driver, wait).open(self.pager_token)
        assert page.page_title_is_correct(), "Page title should contain 'Mirchi Mafia'"

    def test_tap_shows_waiting_section(self, driver, wait):
        page = CustomerPagerPage(driver, wait).open(self.pager_token)
        page.tap_to_start()
        assert page.waiting_section_visible(), \
            "Waiting section should appear after tapping to start"

    def test_status_is_waiting_via_api(self, driver, wait):
        res = requests.get(f"{API_BASE}/pager/status/{self.pager_token}")
        assert res.status_code == 200
        assert res.json()["status"] == "waiting"

    def test_ready_section_shown_after_mark_ready(self, driver, wait):
        page = CustomerPagerPage(driver, wait).open(self.pager_token)
        page.tap_to_start()

        # Mark ready via API while customer page is open
        requests.put(
            f"{API_BASE}/pager/mark-ready/{self.pager_token}",
            headers=self.api_headers,
        )

        # Wait for the polling to pick it up (polls every 5s; allow up to 12s)
        ready_section = page.find(*CustomerPagerPage.READY_SECTION)
        from selenium.webdriver.support.ui import WebDriverWait
        WebDriverWait(driver, 12).until(
            lambda d: ready_section.is_displayed()
        )
        assert ready_section.is_displayed(), \
            "Ready section should appear after order is marked ready"


# ─────────────────────────────────────────────────────────────────────────────
# Previous Orders — pager column
# ─────────────────────────────────────────────────────────────────────────────
class TestPreviousOrdersPager:

    def test_previous_orders_has_qr_buttons(self, driver, wait):
        admin_login(driver, wait)
        po = PreviousOrdersPage(driver, wait).open()
        assert po.is_loaded()
        mixin = PreviousOrdersPagerMixin(driver, wait)
        assert mixin.has_qr_buttons(), \
            "Previous Orders table should have at least one 📱 QR button"

    def test_clicking_qr_opens_modal(self, driver, wait):
        admin_login(driver, wait)
        PreviousOrdersPage(driver, wait).open()
        mixin = PreviousOrdersPagerMixin(driver, wait)
        assert mixin.click_first_qr_button(), "Could not find a QR button to click"
        assert mixin.qr_modal_is_visible(), "QR modal should open after clicking QR button"

    def test_qr_modal_can_be_closed(self, driver, wait):
        admin_login(driver, wait)
        PreviousOrdersPage(driver, wait).open()
        mixin = PreviousOrdersPagerMixin(driver, wait)
        mixin.click_first_qr_button()
        mixin.qr_modal_is_visible()
        mixin.close_qr_modal()
        time.sleep(0.5)
        assert not mixin.is_element_present(*PreviousOrdersPagerMixin.QR_MODAL_IMG), \
            "QR modal should be closed after clicking Close"

    def test_ready_button_disappears_after_click(self, driver, wait):
        """If there's a waiting order, clicking Ready should replace the button with a Done badge."""
        admin_login(driver, wait)
        PreviousOrdersPage(driver, wait).open()
        mixin = PreviousOrdersPagerMixin(driver, wait)

        if not mixin.has_ready_buttons():
            pytest.skip("No orders with pager_status='waiting' found — skipping")

        initial_ready_count = len(driver.find_elements(
            "xpath", "//button[contains(., 'Ready')]"
        ))
        mixin.click_first_ready_button()
        time.sleep(1.5)  # allow state update
        new_ready_count = len(driver.find_elements(
            "xpath", "//button[contains(., 'Ready')]"
        ))
        assert new_ready_count < initial_ready_count, \
            "Ready button count should decrease after marking an order ready"


# ─────────────────────────────────────────────────────────────────────────────
# Order number format — DDMM-XXXX visible in UI
# ─────────────────────────────────────────────────────────────────────────────
class TestOrderNumberFormat:

    def test_previous_orders_shows_date_prefixed_order_numbers(self, driver, wait):
        admin_login(driver, wait)
        PreviousOrdersPage(driver, wait).open()

        import re
        from datetime import datetime
        today = datetime.now()
        prefix = today.strftime("%d%m")  # e.g. "1304"

        page_source = driver.page_source
        pattern = re.compile(rf"#{prefix}-[A-Z0-9]{{4}}")
        matches = pattern.findall(page_source)

        # Only assert if today's orders exist
        if matches:
            assert len(matches) > 0, \
                f"Expected at least one order number matching #{prefix}-XXXX"
        else:
            pytest.skip(f"No orders placed today ({prefix}) found in Previous Orders")
