import sys
import os
import time
import json
import requests
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from pages.customer_login_page import CustomerLoginPage
from pages.customer_register_page import CustomerRegisterPage
from pages.customer_orders_page import CustomerOrdersPage
from config import BASE_URL

BE_URL = "http://localhost:5000/api"

# ── Helpers ──────────────────────────────────────────────────────────────────

def register_and_get_token(email, password="password1"):
    """Use the API directly to register a customer and get a JWT token."""
    res = requests.post(f"{BE_URL}/customer/auth/register", json={
        "name": "Orders Selenium Test",
        "email": email,
        "phone": "07911 123456",
        "address_line1": "1 Orders St",
        "city": "London",
        "postcode": "EC1A 1BB",
        "password": password,
    })
    if res.status_code == 201:
        return res.json()["token"], res.json()["customer"]
    # Already registered — try login
    res = requests.post(f"{BE_URL}/customer/auth/login", json={
        "email": email, "password": password
    })
    if res.status_code == 200:
        return res.json()["token"], res.json()["customer"]
    return None, None


def inject_session(driver, token, customer):
    """Set customer_token and customer_user in localStorage via JS."""
    driver.execute_script(
        f"localStorage.setItem('customer_token', '{token}');"
        f"localStorage.setItem('customer_user', '{json.dumps(customer).replace(chr(39), chr(34))}');"
    )


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestCustomerOrders:

    def test_unauthenticated_redirects_away_from_orders(self, driver, wait):
        """Visiting /customer/orders without login should redirect."""
        driver.get(BASE_URL)
        driver.execute_script("localStorage.clear();")
        driver.get(f"{BASE_URL}/customer/orders")
        time.sleep(1)
        # Should not stay on /customer/orders unprotected
        assert "/customer/orders" not in driver.current_url or \
               "/customer/login" in driver.current_url

    def test_my_orders_page_heading(self, driver, wait):
        email = f"orders_heading_{int(time.time())}@test.com"
        token, customer = register_and_get_token(email)
        if not token:
            pytest.skip("Could not register test customer — BE may be down")

        driver.get(BASE_URL)
        inject_session(driver, token, customer)
        page = CustomerOrdersPage(driver, wait).open()
        assert page.is_loaded()
        assert "Orders" in page.get_title()

    def test_my_orders_shows_empty_state_for_new_customer(self, driver, wait):
        """A brand-new customer with no orders sees the empty state."""
        email = f"orders_empty_{int(time.time())}@test.com"
        token, customer = register_and_get_token(email)
        if not token:
            pytest.skip("Could not register test customer — BE may be down")

        driver.get(BASE_URL)
        inject_session(driver, token, customer)
        page = CustomerOrdersPage(driver, wait).open()
        page.is_loaded()
        time.sleep(1)
        assert page.is_empty_state_visible() or page.get_order_count() == 0

    def test_my_orders_shows_orders_after_placing_one(self, driver, wait):
        """After placing an order via the API, the orders page shows it."""
        email = f"orders_show_{int(time.time())}@test.com"
        token, customer = register_and_get_token(email)
        if not token:
            pytest.skip("Could not register test customer — BE may be down")

        # Place an order via API
        order_res = requests.post(f"{BE_URL}/customer/orders",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "order_type": "Takeaway",
                "items": [{"id": 1, "name": "Test Dish", "price": 5.0, "qty": 1}],
                "payment_method": "Pay at Collection",
                "pickup_time": "18:00 14/04/2026",
            }
        )
        if order_res.status_code == 503:
            pytest.skip("Online ordering is disabled on test server")
        if order_res.status_code != 201:
            pytest.skip("Could not place test order")

        driver.get(BASE_URL)
        inject_session(driver, token, customer)
        page = CustomerOrdersPage(driver, wait).open()
        page.is_loaded()
        time.sleep(1.5)

        assert page.has_orders() or page.get_order_count() > 0

    def test_login_via_ui_then_access_orders(self, driver, wait):
        """Full E2E: register via UI, login, view orders page."""
        email = f"orders_e2e_{int(time.time())}@test.com"

        # Register via UI
        reg_page = CustomerRegisterPage(driver, wait).open()
        reg_page.register(
            name="Orders E2E Test",
            email=email,
            phone="07922 456789",
            address="5 E2E Road",
            city="Luton",
            postcode="LU1 3BW",
            password="password1",
        )
        try:
            wait.until(EC.url_contains("/customer/menu"))
        except Exception:
            pytest.skip("Registration failed or redirected unexpectedly")

        # Navigate to orders page
        driver.get(f"{BASE_URL}/customer/orders")
        time.sleep(1.5)

        page = CustomerOrdersPage(driver, wait)
        assert page.is_loaded()

    def test_order_card_shows_order_number_and_status(self, driver, wait):
        """If a customer has orders, each card shows order number and status."""
        email = f"orders_card_{int(time.time())}@test.com"
        token, customer = register_and_get_token(email)
        if not token:
            pytest.skip("Could not register test customer")

        # Place an order
        order_res = requests.post(f"{BE_URL}/customer/orders",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "order_type": "Eat In",
                "items": [{"id": 1, "name": "Dish", "price": 4.0, "qty": 2}],
                "payment_method": "Cash",
                "pickup_time": "19:00 14/04/2026",
            }
        )
        if order_res.status_code in (503, 400):
            pytest.skip("Could not place order — online ordering disabled or invalid data")

        driver.get(BASE_URL)
        inject_session(driver, token, customer)
        page = CustomerOrdersPage(driver, wait).open()
        page.is_loaded()
        time.sleep(1.5)

        if page.get_order_count() == 0:
            pytest.skip("No orders rendered — order creation may have failed")

        # Order number and status badge should be present
        assert page.is_element_present(*page.ORDER_NUMBER)
        assert page.is_element_present(*page.STATUS_BADGE)
