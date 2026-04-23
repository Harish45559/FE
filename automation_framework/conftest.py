"""
conftest.py
-----------
Root-level pytest configuration and shared fixtures for the automation framework.

Session-scoped fixtures (created once per test run):
  driver         — Shared Selenium WebDriver instance (UI tests)
  admin_token    — JWT obtained by logging in as admin via the API
  customer_token — JWT obtained by registering/logging in a test customer

Function-scoped fixtures (re-created for each test):
  api            — APIHelper instance pointing at the backend
  db             — DBHelper instance (closes after each test)

Hooks:
  pytest_runtest_makereport — auto-screenshot on UI test failure
"""

import os
import sys
import time

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

# Make sure imports resolve regardless of working directory
sys.path.insert(0, os.path.dirname(__file__))

from config.config import (
    BASE_URL,
    API_URL,
    ADMIN_USERNAME,
    ADMIN_DEFAULT_PASSWORD,
    CUSTOMER_EMAIL,
    CUSTOMER_PASSWORD,
    HEADLESS,
    WINDOW_WIDTH,
    WINDOW_HEIGHT,
    IMPLICIT_WAIT,
    EXPLICIT_WAIT,
    PAGE_LOAD_TIMEOUT,
)
from utils.api_helper import APIHelper
from utils.db_helper import DBHelper
from utils.screenshot_helper import take_screenshot


# ── pytest option: --headed ───────────────────────────────────────────────────

def pytest_addoption(parser):
    parser.addoption(
        "--headed",
        action="store_true",
        default=False,
        help="Run browser in headed (visible) mode. Default is headless.",
    )


# ── Shared WebDriver ──────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def driver(request):
    """
    Session-scoped Chrome WebDriver.
    Headless by default; pass --headed flag to see the browser.
    """
    options = Options()
    headed = request.config.getoption("--headed", default=False)

    if not headed and HEADLESS:
        options.add_argument("--headless=new")
        options.add_argument(f"--window-size={WINDOW_WIDTH},{WINDOW_HEIGHT}")
    else:
        options.add_argument("--start-maximized")

    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-extensions")

    service = Service(ChromeDriverManager().install())
    d = webdriver.Chrome(service=service, options=options)
    d.implicitly_wait(IMPLICIT_WAIT)
    d.set_page_load_timeout(PAGE_LOAD_TIMEOUT)

    yield d
    d.quit()


@pytest.fixture(scope="session")
def wait(driver):
    """Session-scoped WebDriverWait tied to the shared driver."""
    return WebDriverWait(driver, EXPLICIT_WAIT)


# ── API helper ────────────────────────────────────────────────────────────────

@pytest.fixture
def api():
    """
    Function-scoped APIHelper instance.
    A new requests.Session is created for each test to avoid state leakage.
    """
    return APIHelper(base_url=API_URL)


# ── Admin JWT token ───────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def admin_token():
    """
    Log in as admin via the API and return the JWT token.
    The token is cached for the entire test session.

    Raises
    ------
    pytest.skip  if the backend is unreachable or credentials are incorrect.
    """
    helper = APIHelper(base_url=API_URL)
    res = None
    for attempt in range(5):
        try:
            res = helper.post("/auth/login", {
                "username": ADMIN_USERNAME,
                "password": ADMIN_DEFAULT_PASSWORD,
            })
        except Exception as exc:
            pytest.skip(f"Cannot reach backend API ({API_URL}): {exc}")

        if res.status_code == 200:
            return res.json()["token"]
        if res.status_code == 429:
            time.sleep(10)  # back off and retry on rate limit
            continue
        break

    pytest.skip(
        f"Admin login failed ({res.status_code if res else 'no response'}): "
        f"{res.text[:200] if res else ''}. "
        "Set ADMIN_DEFAULT_PASSWORD in your .env file."
    )


# ── Customer JWT token ────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def customer_token():
    """
    Register (or log in if already registered) a test customer and return
    their JWT.  The token is cached for the entire test session.
    """
    helper = APIHelper(base_url=API_URL)
    ts = int(time.time())
    email = CUSTOMER_EMAIL or f"selenium_session_{ts}@test.com"
    password = CUSTOMER_PASSWORD or "password1"

    # Try register first
    try:
        reg_res = helper.post("/customer/auth/register", {
            "name":          "Selenium Test Customer",
            "email":         email,
            "phone":         "07700 900000",
            "address_line1": "1 Selenium Way",
            "city":          "London",
            "postcode":      "EC1A 1BB",
            "password":      password,
        })
    except Exception as exc:
        pytest.skip(f"Cannot reach backend API: {exc}")

    if reg_res.status_code == 201:
        return reg_res.json()["token"]

    # Already registered — log in
    login_res = helper.post("/customer/auth/login", {
        "email":    email,
        "password": password,
    })
    if login_res.status_code == 200:
        return login_res.json()["token"]

    pytest.skip(
        f"Could not obtain customer token "
        f"(register: {reg_res.status_code}, login: {login_res.status_code})"
    )


# ── Database helper ───────────────────────────────────────────────────────────

@pytest.fixture
def db():
    """
    Function-scoped DBHelper.  Closes the connection after each test.
    Tests that need a DB are skipped automatically if the DB is unreachable.
    """
    helper = None
    try:
        helper = DBHelper()
    except Exception as exc:
        pytest.skip(f"Database not reachable: {exc}")
    yield helper
    if helper:
        helper.close()


# ── Auto-screenshot on failure ────────────────────────────────────────────────

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Capture a screenshot whenever a UI (Selenium) test fails.
    Only fires when the 'driver' fixture is present in the test's fixtures.
    """
    outcome = yield
    report  = outcome.get_result()

    if report.when == "call" and report.failed:
        driver_instance = item.funcargs.get("driver")
        if driver_instance:
            take_screenshot(driver_instance, item.nodeid)
