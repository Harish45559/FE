"""
pages/base_page.py
------------------
BasePage is the parent class for every page object in this framework.
It wraps low-level Selenium operations behind readable methods so that
individual page objects stay concise and test files never touch the driver
directly.
"""

import sys
import os

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, NoSuchElementException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import config


class BasePage:
    """
    Provides generic Selenium interactions shared across all page objects.

    Parameters
    ----------
    driver : selenium.webdriver.Chrome  (or any WebDriver)
    wait   : WebDriverWait  (optional — created from config if omitted)
    """

    def __init__(self, driver, wait=None):
        self.driver = driver
        self.wait   = wait or WebDriverWait(driver, config.EXPLICIT_WAIT)

    # ── Navigation ────────────────────────────────────────────────────────────

    def navigate_to(self, url: str):
        """Load *url* in the browser."""
        self.driver.get(url)

    def get_current_url(self) -> str:
        return self.driver.current_url

    def wait_for_url_contains(self, text: str, timeout: int = None):
        """Block until the current URL contains *text*."""
        t = timeout or config.EXPLICIT_WAIT
        WebDriverWait(self.driver, t).until(EC.url_contains(text))

    # ── Element finders ───────────────────────────────────────────────────────

    def find(self, locator: tuple):
        """Return the first element matching *locator* (By, selector)."""
        return self.driver.find_element(*locator)

    def find_all(self, locator: tuple):
        """Return all elements matching *locator*."""
        return self.driver.find_elements(*locator)

    # ── Waits ─────────────────────────────────────────────────────────────────

    def wait_for_element(self, locator: tuple):
        """Wait until element is present in DOM."""
        return self.wait.until(EC.presence_of_element_located(locator))

    def wait_for_visible(self, locator: tuple):
        """Wait until element is visible."""
        return self.wait.until(EC.visibility_of_element_located(locator))

    def wait_for_clickable(self, locator: tuple):
        """Wait until element is visible and enabled."""
        return self.wait.until(EC.element_to_be_clickable(locator))

    def wait_for_invisible(self, locator: tuple):
        """Wait until element is gone / invisible (useful for spinners)."""
        return self.wait.until(EC.invisibility_of_element_located(locator))

    # ── Interactions ──────────────────────────────────────────────────────────

    def click(self, locator: tuple):
        """Wait for element to be clickable then click it."""
        self.wait_for_clickable(locator).click()

    def type_text(self, locator: tuple, text: str):
        """Clear the field then type *text*."""
        field = self.wait_for_visible(locator)
        field.clear()
        field.send_keys(text)

    def get_text(self, locator: tuple) -> str:
        """Return the visible text of the element."""
        return self.wait_for_visible(locator).text

    # ── Assertions / predicates ───────────────────────────────────────────────

    def is_visible(self, locator: tuple) -> bool:
        """Return True if the element exists and is displayed."""
        try:
            return self.driver.find_element(*locator).is_displayed()
        except (NoSuchElementException, TimeoutException):
            return False

    def is_element_present(self, locator: tuple) -> bool:
        """Return True if at least one element matches *locator* in the DOM."""
        return len(self.driver.find_elements(*locator)) > 0
