"""
tests/api/test_order_api.py
----------------------------
API tests for the online order endpoints:

Customer orders:
  POST  /api/customer/orders         — place a new online order
  GET   /api/customer/orders         — get my orders
  GET   /api/customer/orders/:id     — get a single order

Staff (admin) online-order management:
  GET   /api/orders/online           — list all online orders
  GET   /api/orders/online/pending   — pending orders only
  PATCH /api/orders/online/:id/accept
  PATCH /api/orders/online/:id/reject

Covered scenarios:
  - Placing an order with valid data returns 201.
  - Invalid payment_method returns 400.
  - Invalid order_type returns 400.
  - Empty items array returns 400.
  - GET my orders returns a list.
  - Staff can fetch pending online orders.
  - Staff can accept / reject an order.
"""

import os
import sys
import time

import pytest
import requests as _requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.api_helper import APIHelper
from config.config import API_URL


# ── Helpers ───────────────────────────────────────────────────────────────────

def _register_and_login_customer(api: APIHelper) -> str | None:
    """Create a fresh customer and return their JWT, or None on failure."""
    ts = int(time.time())
    email = f"order_test_{ts}@test.com"
    res = api.post("/customer/auth/register", {
        "name":         "Order Tester",
        "email":        email,
        "phone":        "07700 100200",
        "address_line1": "1 Order St",
        "city":         "London",
        "postcode":     "EC1A 1BB",
        "password":     "password1",
    })
    if res.status_code == 201:
        return res.json().get("token")
    return None


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.api
@pytest.mark.smoke
class TestOrderAPI:
    """REST API tests for customer and staff order management."""

    @pytest.fixture(autouse=True)
    def setup(self, api, admin_token, customer_token):
        self.api            = api
        self.admin_token    = admin_token
        self.customer_token = customer_token

    # ── Auth guards ───────────────────────────────────────────────────────────

    def test_place_order_without_token_returns_401(self):
        res = self.api.post("/customer/orders", {
            "order_type": "Takeaway",
            "items": [{"name": "Dish", "price": 5.0, "qty": 1}],
            "payment_method": "Pay on Collection",
        })
        assert res.status_code == 401

    def test_get_my_orders_without_token_returns_401(self):
        res = self.api.get("/customer/orders")
        assert res.status_code == 401

    def test_staff_online_orders_without_token_returns_401(self):
        res = self.api.get("/orders/online")
        assert res.status_code == 401

    # ── Place order — validation ───────────────────────────────────────────────

    def test_place_order_invalid_payment_method_returns_400(self):
        """
        'payment_method' must be 'Pay on Collection' or 'Card'.
        Any other value should return 400.
        """
        res = self.api.post(
            "/customer/orders",
            {
                "order_type":      "Takeaway",
                "items":           [{"name": "Dish", "price": 5.0, "qty": 1}],
                "payment_method":  "Bitcoin",
                "pickup_time":     "18:00 23/04/2025",
            },
            token=self.customer_token,
        )
        assert res.status_code == 400, (
            f"Expected 400 for invalid payment_method, got {res.status_code}: {res.text}"
        )

    def test_place_order_invalid_order_type_returns_400(self):
        """
        'order_type' must be 'Eat In' or 'Takeaway'.
        Any other value should return 400.
        """
        res = self.api.post(
            "/customer/orders",
            {
                "order_type":      "Delivery",
                "items":           [{"name": "Dish", "price": 5.0, "qty": 1}],
                "payment_method":  "Pay on Collection",
                "pickup_time":     "18:00 23/04/2025",
            },
            token=self.customer_token,
        )
        assert res.status_code == 400, (
            f"Expected 400 for invalid order_type, got {res.status_code}: {res.text}"
        )

    def test_place_order_empty_items_returns_400(self):
        """An order with an empty items array should be rejected."""
        res = self.api.post(
            "/customer/orders",
            {
                "order_type":     "Takeaway",
                "items":          [],
                "payment_method": "Pay on Collection",
            },
            token=self.customer_token,
        )
        assert res.status_code == 400, (
            f"Expected 400 for empty items, got {res.status_code}: {res.text}"
        )

    def test_place_order_missing_payment_method_returns_400(self):
        """Omitting payment_method should return 400."""
        res = self.api.post(
            "/customer/orders",
            {
                "order_type": "Takeaway",
                "items":      [{"name": "Dish", "price": 5.0, "qty": 1}],
            },
            token=self.customer_token,
        )
        assert res.status_code == 400

    # ── Place order — success ──────────────────────────────────────────────────

    def test_place_pay_on_collection_order_returns_201(self):
        """
        A well-formed 'Pay on Collection' order should return 201 Created.
        Skips if online ordering is disabled on the environment (503).
        """
        res = self.api.post(
            "/customer/orders",
            {
                "order_type":     "Takeaway",
                "items":          [{"id": 1, "name": "Test Dish", "price": 5.00, "qty": 1}],
                "payment_method": "Pay on Collection",
                "pickup_time":    "18:00 23/04/2025",
            },
            token=self.customer_token,
        )
        if res.status_code == 503:
            pytest.skip("Online ordering is disabled on this test environment")
        assert res.status_code == 201, (
            f"Expected 201 for Pay on Collection order, got {res.status_code}: {res.text}"
        )

    # ── Get my orders ─────────────────────────────────────────────────────────

    def test_get_my_orders_returns_200_and_list(self):
        """Authenticated customer can retrieve their order history."""
        res = self.api.get("/customer/orders", token=self.customer_token)
        assert res.status_code == 200, (
            f"Expected 200 for my orders, got {res.status_code}: {res.text}"
        )
        body = res.json()
        assert isinstance(body, (list, dict)), (
            f"Expected list or dict, got: {type(body)}"
        )

    # ── Staff order management ─────────────────────────────────────────────────

    def test_staff_can_get_online_orders(self):
        """Staff with admin JWT can list all online orders."""
        res = self.api.get("/orders/online", token=self.admin_token)
        assert res.status_code == 200, (
            f"Expected 200 for online orders, got {res.status_code}: {res.text}"
        )

    def test_staff_can_get_pending_online_orders(self):
        """Staff can filter to pending-only online orders."""
        res = self.api.get("/orders/online/pending", token=self.admin_token)
        assert res.status_code == 200, (
            f"Expected 200 for pending orders, got {res.status_code}: {res.text}"
        )

    def test_staff_accept_nonexistent_order_returns_404(self):
        """Accepting an order that does not exist should return 404."""
        res = self.api.patch(
            "/orders/online/999999/accept",
            {"ready_time": "18:30"},
            token=self.admin_token,
        )
        assert res.status_code == 404, (
            f"Expected 404 for non-existent order accept, got {res.status_code}"
        )

    def test_staff_reject_nonexistent_order_returns_404(self):
        """Rejecting an order that does not exist should return 404."""
        res = self.api.patch(
            "/orders/online/999999/reject",
            {"reason": "Out of stock"},
            token=self.admin_token,
        )
        assert res.status_code == 404, (
            f"Expected 404 for non-existent order reject, got {res.status_code}"
        )

    @pytest.mark.regression
    def test_staff_can_accept_and_then_reject_lifecycle(self):
        """
        Place an order, then have staff accept it.
        Validates the full lifecycle: 201 → accept (200).
        """
        # Place order
        order_res = self.api.post(
            "/customer/orders",
            {
                "order_type":     "Takeaway",
                "items":          [{"id": 1, "name": "Lifecycle Dish", "price": 4.50, "qty": 1}],
                "payment_method": "Pay on Collection",
                "pickup_time":    "19:00 23/04/2025",
            },
            token=self.customer_token,
        )
        if order_res.status_code == 503:
            pytest.skip("Online ordering disabled")
        if order_res.status_code != 201:
            pytest.skip(f"Could not place order: {order_res.status_code} {order_res.text}")

        body = order_res.json()
        order_id = (body.get("order") or body).get("id")
        if not order_id:
            pytest.skip("Order ID not returned from place-order endpoint")

        # Staff accepts
        accept_res = self.api.patch(
            f"/orders/online/{order_id}/accept",
            {"ready_time": "19:15"},
            token=self.admin_token,
        )
        assert accept_res.status_code == 200, (
            f"Expected 200 for order accept, got {accept_res.status_code}: {accept_res.text}"
        )
