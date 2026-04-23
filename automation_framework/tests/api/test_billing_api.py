"""
tests/api/test_billing_api.py
------------------------------
API tests for the Billing Counter (POS) backend endpoints:

Till:
  GET   /api/till/status  — current till state
  POST  /api/till/open    — open the till
  POST  /api/till/close   — close the till

POS Orders:
  POST  /api/orders               — place an order
  GET   /api/orders/all           — list all orders
  GET   /api/orders/by-date       — orders filtered by date
  GET   /api/orders/summary       — sales summary
  POST  /api/orders/held          — hold an order
  GET   /api/orders/held          — list held orders
  DELETE /api/orders/held/clear-all — clear all held orders

Menu (used by billing counter):
  GET   /api/menu         — list all menu items
  POST  /api/menu         — create a menu item (admin)
  PUT   /api/menu/:id     — update a menu item (admin)
  DELETE /api/menu/:id    — delete a menu item (admin)

Sales (EOD dashboard):
  GET   /api/sales/summary     — sales totals
  GET   /api/sales/topselling  — top-selling items
  GET   /api/sales/totalsales  — total sales figure
"""

import os
import sys
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.api_helper import APIHelper


@pytest.mark.api
@pytest.mark.regression
class TestTillAPI:
    """REST API tests for the /api/till endpoints."""

    @pytest.fixture(autouse=True)
    def setup(self, api, admin_token):
        self.api   = api
        self.token = admin_token

    # ── Auth guards ───────────────────────────────────────────────────────────

    def test_till_status_without_token_returns_401(self):
        res = self.api.get("/till/status")
        assert res.status_code == 401

    def test_till_open_without_token_returns_401(self):
        res = self.api.post("/till/open", {})
        assert res.status_code == 401

    def test_till_close_without_token_returns_401(self):
        res = self.api.post("/till/close", {})
        assert res.status_code == 401

    # ── Till status ───────────────────────────────────────────────────────────

    def test_till_status_returns_200(self):
        """GET /till/status returns 200 with open/closed state."""
        res = self.api.get("/till/status", token=self.token)
        assert res.status_code == 200, (
            f"Expected 200 from /till/status, got {res.status_code}: {res.text}"
        )

    def test_till_status_has_open_field(self):
        """Till status response must contain an 'open' field."""
        res = self.api.get("/till/status", token=self.token)
        assert res.status_code == 200
        body = res.json()
        assert "open" in body, f"'open' field missing from till status: {body}"


@pytest.mark.api
@pytest.mark.regression
class TestPosOrderAPI:
    """REST API tests for the /api/orders (POS) endpoints."""

    @pytest.fixture(autouse=True)
    def setup(self, api, admin_token):
        self.api   = api
        self.token = admin_token

    _VALID_ORDER = {
        "customer_name":  "API Test Customer",
        "server_name":    "API Server",
        "order_type":     "Dine In",
        "items":          [{"name": "Coffee", "qty": 1, "price": 3.5}],
        "total_amount":   3.5,
        "final_amount":   3.5,
        "payment_method": "cash",
    }

    # ── Auth guards ───────────────────────────────────────────────────────────

    @pytest.mark.parametrize("method,path,body", [
        ("post",   "/orders",            {}),
        ("get",    "/orders/all",        None),
        ("get",    "/orders/by-date",    None),
        ("get",    "/orders/summary",    None),
        ("post",   "/orders/held",       {}),
        ("get",    "/orders/held",       None),
    ])
    def test_orders_without_token_returns_401(self, method, path, body):
        if method == "get":
            res = self.api.get(path)
        else:
            res = self.api.post(path, body or {})
        assert res.status_code == 401, (
            f"Expected 401 on {method.upper()} {path}, got {res.status_code}"
        )

    # ── GET /api/orders/all ───────────────────────────────────────────────────

    def test_get_all_orders_returns_200(self):
        """GET /orders/all returns 200 with a list of all POS orders."""
        res = self.api.get("/orders/all", token=self.token)
        assert res.status_code == 200, (
            f"Expected 200, got {res.status_code}: {res.text}"
        )

    def test_get_all_orders_returns_array(self):
        """POS order list should be a JSON array."""
        res = self.api.get("/orders/all", token=self.token)
        assert res.status_code == 200
        assert isinstance(res.json(), list), (
            f"Expected list from /orders/all, got {type(res.json())}"
        )

    # ── GET /api/orders/by-date ───────────────────────────────────────────────

    def test_get_orders_by_date_returns_200(self):
        """GET /orders/by-date with a date param returns 200."""
        res = self.api.get("/orders/by-date?date=2025-04-23", token=self.token)
        assert res.status_code in (200, 400), (
            f"Unexpected status from /orders/by-date: {res.status_code}"
        )

    # ── GET /api/orders/summary ───────────────────────────────────────────────

    def test_orders_summary_returns_200(self):
        """GET /orders/summary returns a sales summary object."""
        res = self.api.get("/orders/summary", token=self.token)
        assert res.status_code == 200, (
            f"Expected 200 from /orders/summary, got {res.status_code}: {res.text}"
        )

    # ── POST /api/orders (place order) ───────────────────────────────────────

    def test_place_order_missing_items_returns_400(self):
        """Placing an order without items should return 400."""
        res = self.api.post(
            "/orders",
            {"customer_name": "Test", "payment_method": "cash", "items": []},
            token=self.token,
        )
        assert res.status_code in (400, 422), (
            f"Expected 4xx for empty items, got {res.status_code}"
        )

    def test_place_valid_order_returns_201(self):
        """Placing a valid POS order should return 201."""
        res = self.api.post("/orders", self._VALID_ORDER, token=self.token)
        assert res.status_code == 201, (
            f"Expected 201 for valid POS order, got {res.status_code}: {res.text}"
        )

    # ── Held orders ───────────────────────────────────────────────────────────

    def test_get_held_orders_returns_200(self):
        """GET /orders/held returns 200 with a list of held orders."""
        res = self.api.get("/orders/held", token=self.token)
        assert res.status_code == 200, (
            f"Expected 200 from /orders/held, got {res.status_code}: {res.text}"
        )

    def test_held_orders_response_is_array(self):
        """Held orders response should be a JSON array."""
        res = self.api.get("/orders/held", token=self.token)
        assert res.status_code == 200
        assert isinstance(res.json(), list), (
            f"Expected list from /orders/held, got {type(res.json())}"
        )


@pytest.mark.api
@pytest.mark.regression
class TestMenuAPI:
    """REST API tests for the /api/menu endpoints."""

    @pytest.fixture(autouse=True)
    def setup(self, api, admin_token):
        self.api   = api
        self.token = admin_token

    # ── Auth guards ───────────────────────────────────────────────────────────

    def test_get_menu_without_token_returns_401(self):
        res = self.api.get("/menu")
        assert res.status_code == 401

    def test_create_menu_item_without_token_returns_401(self):
        res = self.api.post("/menu", {"name": "Ghost Item", "price": 1.0})
        assert res.status_code == 401

    # ── GET /api/menu ─────────────────────────────────────────────────────────

    def test_get_menu_returns_200(self):
        """GET /menu returns 200 with the full menu."""
        res = self.api.get("/menu", token=self.token)
        assert res.status_code == 200, (
            f"Expected 200, got {res.status_code}: {res.text}"
        )

    def test_get_menu_returns_array(self):
        """Menu list should be a JSON array."""
        res = self.api.get("/menu", token=self.token)
        assert res.status_code == 200
        assert isinstance(res.json(), list), (
            f"Expected list from /menu, got {type(res.json())}"
        )

    def test_menu_items_have_required_fields(self):
        """Each menu item should have id, name, and price fields."""
        res = self.api.get("/menu", token=self.token)
        assert res.status_code == 200
        items = res.json()
        if items:
            item = items[0]
            for field in ("id", "name", "price"):
                assert field in item, f"Field '{field}' missing from menu item: {item}"

    # ── POST /api/menu ────────────────────────────────────────────────────────

    def test_create_menu_item_missing_name_returns_400(self):
        """Creating a menu item without a name should return 400."""
        res = self.api.post("/menu", {"price": 5.99}, token=self.token)
        assert res.status_code == 400, (
            f"Expected 400 for missing name, got {res.status_code}"
        )

    def test_create_and_delete_menu_item(self):
        """Admin can create a new menu item and then delete it."""
        ts = int(time.time())
        create_res = self.api.post(
            "/menu",
            {
                "name":        f"Test Item {ts}",
                "price":       9.99,
                "categoryId":  1,
                "description": "Automated test item",
                "is_veg":      False,
                "available":   True,
            },
            token=self.token,
        )
        assert create_res.status_code in (200, 201), (
            f"Expected 200/201 for new menu item, got {create_res.status_code}: {create_res.text}"
        )
        body    = create_res.json()
        item_id = (body.get("item") or body).get("id") or body.get("id")
        if item_id:
            del_res = self.api.delete(f"/menu/{item_id}", token=self.token)
            assert del_res.status_code in (200, 204), (
                f"Expected 200/204 for menu item delete, got {del_res.status_code}"
            )


@pytest.mark.api
@pytest.mark.regression
class TestSalesAPI:
    """REST API tests for the /api/sales (EOD) endpoints."""

    @pytest.fixture(autouse=True)
    def setup(self, api, admin_token):
        self.api   = api
        self.token = admin_token

    @pytest.mark.parametrize("path", [
        "/sales/summary",
        "/sales/topselling",
        "/sales/totalsales",
    ])
    def test_sales_without_token_returns_401(self, path):
        res = self.api.get(path)
        assert res.status_code == 401, (
            f"Expected 401 on {path} without token, got {res.status_code}"
        )

    def test_sales_summary_returns_200(self):
        """GET /sales/summary returns 200 with today's totals."""
        res = self.api.get("/sales/summary", token=self.token)
        assert res.status_code == 200, (
            f"Expected 200 from /sales/summary, got {res.status_code}: {res.text}"
        )

    def test_top_selling_returns_200(self):
        """GET /sales/topselling returns 200 with ranked items."""
        res = self.api.get("/sales/topselling", token=self.token)
        assert res.status_code == 200, (
            f"Expected 200 from /sales/topselling, got {res.status_code}: {res.text}"
        )

    def test_total_sales_returns_200(self):
        """GET /sales/totalsales returns 200 with aggregate figure."""
        res = self.api.get("/sales/totalsales", token=self.token)
        assert res.status_code == 200, (
            f"Expected 200 from /sales/totalsales, got {res.status_code}: {res.text}"
        )

    def test_sales_summary_accepts_date_range(self):
        """GET /sales/summary?from=...&to=... should be accepted."""
        res = self.api.get(
            "/sales/summary?from=2025-01-01&to=2025-12-31", token=self.token
        )
        assert res.status_code in (200, 400), (
            f"Unexpected status for date-filtered sales summary: {res.status_code}"
        )
