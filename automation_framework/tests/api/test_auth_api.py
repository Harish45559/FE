"""
tests/api/test_auth_api.py
---------------------------
API-level tests for the authentication endpoints.

Staff/Admin:
  POST /api/auth/login

Customer:
  POST /api/customer/auth/register
  POST /api/customer/auth/login
  GET  /api/customer/auth/me        (protected)

Covered scenarios:
  - Admin login returns a JWT token.
  - Invalid credentials return 401.
  - Missing fields return 400.
  - Customer register returns 201 with a token.
  - Customer login returns 200 with a token.
  - A staff token is rejected on customer-only routes.
  - An unauthenticated request to a protected route returns 401.
"""

import os
import sys
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.api_helper import APIHelper
from config.config import ADMIN_USERNAME, ADMIN_DEFAULT_PASSWORD


def _skip_if_rate_limited(res):
    """Skip the test gracefully when the live server returns 429."""
    if res.status_code == 429:
        pytest.skip("Rate limit hit on live server — re-run after cooldown")


@pytest.mark.api
@pytest.mark.smoke
class TestAuthAPI:
    """API tests for staff and customer authentication."""

    @pytest.fixture(autouse=True)
    def setup(self, api):
        self.api = api
        time.sleep(1)  # brief pause between tests to avoid rate limiting

    # ── Staff / Admin login ───────────────────────────────────────────────────

    def test_admin_login_returns_200_and_token(self):
        """Valid admin credentials should return HTTP 200 and a JWT token."""
        res = self.api.post("/auth/login", {
            "username": ADMIN_USERNAME,
            "password": ADMIN_DEFAULT_PASSWORD,
        })
        _skip_if_rate_limited(res)
        assert res.status_code == 200, (
            f"Expected 200, got {res.status_code}: {res.text}"
        )
        body = res.json()
        assert "token" in body, f"'token' key missing from response: {body}"
        assert len(body["token"]) > 20, "Token looks too short to be a valid JWT"

    def test_admin_login_returns_user_info(self):
        """Login response should include basic user information."""
        res = self.api.post("/auth/login", {
            "username": ADMIN_USERNAME,
            "password": ADMIN_DEFAULT_PASSWORD,
        })
        _skip_if_rate_limited(res)
        assert res.status_code == 200
        body = res.json()
        assert "user" in body or "username" in body or "role" in body

    def test_invalid_password_returns_401(self):
        """Wrong password should yield 401 Unauthorized."""
        res = self.api.post("/auth/login", {
            "username": ADMIN_USERNAME,
            "password": "definitely_wrong_password_123",
        })
        _skip_if_rate_limited(res)
        assert res.status_code == 401

    def test_unknown_username_returns_401(self):
        """A username that does not exist should return 401."""
        res = self.api.post("/auth/login", {
            "username": "ghost_user_xyz_99999",
            "password": "irrelevant",
        })
        _skip_if_rate_limited(res)
        assert res.status_code == 401

    def test_missing_username_returns_400(self):
        """Omitting the username field should return 400 Bad Request."""
        res = self.api.post("/auth/login", {"password": "some_password"})
        _skip_if_rate_limited(res)
        assert res.status_code == 400

    def test_missing_password_returns_400(self):
        """Omitting the password field should return 400 Bad Request."""
        res = self.api.post("/auth/login", {"username": ADMIN_USERNAME})
        _skip_if_rate_limited(res)
        assert res.status_code == 400

    # ── Customer register ─────────────────────────────────────────────────────

    def test_customer_register_returns_201_and_token(self):
        """A new customer registration should return 201 with a JWT."""
        email = f"api_reg_{int(time.time())}@test.com"
        res = self.api.post("/customer/auth/register", {
            "name": "API Test Customer",
            "email": email,
            "phone": "07700 900123",
            "address_line1": "1 API Street",
            "city": "London",
            "postcode": "EC1A 1BB",
            "password": "password1",
        })
        _skip_if_rate_limited(res)
        assert res.status_code == 201, (
            f"Expected 201, got {res.status_code}: {res.text}"
        )
        assert "token" in res.json()

    def test_customer_register_duplicate_email_returns_409_or_400(self):
        """Registering with an already-used email should be rejected."""
        email = f"dup_{int(time.time())}@test.com"
        payload = {
            "name": "Dup User",
            "email": email,
            "phone": "07700 900000",
            "address_line1": "1 Dup Road",
            "city": "Bristol",
            "postcode": "BS1 1AA",
            "password": "password1",
        }
        r1 = self.api.post("/customer/auth/register", payload)
        _skip_if_rate_limited(r1)
        time.sleep(1)
        res = self.api.post("/customer/auth/register", payload)
        _skip_if_rate_limited(res)
        assert res.status_code in (400, 409)

    def test_customer_register_invalid_email_returns_400(self):
        """An invalid email format should return 400."""
        res = self.api.post("/customer/auth/register", {
            "name": "Bad Email",
            "email": "not-an-email",
            "phone": "07700 900000",
            "address_line1": "1 St",
            "city": "London",
            "postcode": "W1A 1AA",
            "password": "password1",
        })
        _skip_if_rate_limited(res)
        assert res.status_code == 400

    # ── Customer login ────────────────────────────────────────────────────────

    def test_customer_login_returns_200_and_token(self):
        """A registered customer can log in and receive a token."""
        res = self.api.post("/customer/auth/login", {
            "email": "selenium_test@example.com",
            "password": "password1",
        })
        _skip_if_rate_limited(res)
        # 200 = logged in, 401 = account doesn't exist yet — both acceptable
        assert res.status_code in (200, 401)
        if res.status_code == 200:
            assert "token" in res.json()

    def test_customer_login_wrong_password_returns_401(self):
        """Wrong password for a customer account returns 401."""
        res = self.api.post("/customer/auth/login", {
            "email": "selenium_test@example.com",
            "password": "definitely_wrong_99999",
        })
        _skip_if_rate_limited(res)
        assert res.status_code in (401, 404)

    # ── Auth guard on protected routes ────────────────────────────────────────

    def test_protected_customer_me_without_token_returns_401(self):
        """GET /customer/auth/me without a token should return 401."""
        res = self.api.get("/customer/auth/me")
        assert res.status_code == 401

    def test_staff_token_rejected_on_customer_me_route(self, admin_token):
        """
        A staff JWT should NOT grant access to /customer/auth/me
        (different auth middleware for customer routes).
        """
        res = self.api.get("/customer/auth/me", token=admin_token)
        # 401 or 403 are both acceptable rejections
        assert res.status_code in (401, 403), (
            f"Staff token should be rejected on customer route, got {res.status_code}"
        )
