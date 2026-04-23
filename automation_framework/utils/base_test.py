"""
utils/base_test.py
------------------
BaseTest provides setup_method / teardown_method lifecycle hooks shared by
every UI (Selenium) test class.  Subclass it and pytest will automatically
create a fresh browser for each test method and quit it afterwards.

Features:
- Uses webdriver-manager to auto-download the correct ChromeDriver binary.
- Headless mode is controlled via config.HEADLESS (override with env var HEADLESS=false).
- Takes a failure screenshot via screenshot_helper before quitting the browser.
- Exposes self.driver and self.wait for use in test methods.

Usage:

    from utils.base_test import BaseTest

    class TestLogin(BaseTest):
        def test_page_title(self):
            self.driver.get("https://example.com")
            assert "Example" in self.driver.title
"""

import sys
import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import config
from utils.screenshot_helper import take_screenshot


class BaseTest:
    """
    Base class for all Selenium UI test classes.

    Attributes
    ----------
    driver : selenium.webdriver.Chrome
    wait   : selenium.webdriver.support.ui.WebDriverWait
    """

    driver = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def setup_method(self, method):
        """
        Called by pytest before each test method.
        Initialises ChromeDriver with the options defined in config.
        """
        chrome_options = Options()

        if config.HEADLESS:
            chrome_options.add_argument("--headless=new")
            chrome_options.add_argument(
                f"--window-size={config.WINDOW_WIDTH},{config.WINDOW_HEIGHT}"
            )
        else:
            chrome_options.add_argument("--start-maximized")

        # Stability arguments — important for CI runners
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--disable-extensions")

        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.driver.implicitly_wait(config.IMPLICIT_WAIT)
        self.driver.set_page_load_timeout(config.PAGE_LOAD_TIMEOUT)

        # Explicit-wait instance used in every page object
        self.wait = WebDriverWait(self.driver, config.EXPLICIT_WAIT)

    def teardown_method(self, method):
        """
        Called by pytest after each test method.
        Takes a screenshot if the test failed, then closes the browser.
        """
        if self.driver:
            # pytest stores outcome on the request object — use the private
            # _outcome attribute as a fallback for plain class-based tests
            failed = getattr(
                getattr(method, "_outcome", None), "failed", False
            )
            if failed:
                take_screenshot(self.driver, method.__name__)
            self.driver.quit()
            self.driver = None
