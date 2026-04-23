"""
utils/wait_helper.py
--------------------
Thin wrapper around Selenium's WebDriverWait that exposes descriptively-named
helper methods.  Every page-object and test that needs an explicit wait should
use this class rather than instantiating WebDriverWait directly.
"""

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException


class WaitHelper:
    """Provides explicit-wait utilities built on top of WebDriverWait."""

    def __init__(self, driver, timeout: int = 15):
        self.driver  = driver
        self.timeout = timeout
        self._wait   = WebDriverWait(driver, timeout)

    # ── Presence / Visibility ─────────────────────────────────────────────────

    def wait_for_element(self, locator: tuple):
        """
        Wait until a DOM element matching *locator* is present (not necessarily
        visible).

        Parameters
        ----------
        locator : tuple  e.g. (By.CSS_SELECTOR, ".some-class")

        Returns
        -------
        WebElement
        """
        return self._wait.until(
            EC.presence_of_element_located(locator),
            message=f"Element not found in DOM: {locator}",
        )

    def wait_for_visible(self, locator: tuple):
        """Wait until the element is present *and* visible."""
        return self._wait.until(
            EC.visibility_of_element_located(locator),
            message=f"Element not visible: {locator}",
        )

    # ── Clickability ──────────────────────────────────────────────────────────

    def wait_for_clickable(self, locator: tuple):
        """Wait until the element is visible and enabled (clickable)."""
        return self._wait.until(
            EC.element_to_be_clickable(locator),
            message=f"Element not clickable: {locator}",
        )

    # ── Text ──────────────────────────────────────────────────────────────────

    def wait_for_text(self, locator: tuple, text: str):
        """
        Wait until *text* is present in the element identified by *locator*.

        Returns
        -------
        bool  True once the condition is met.
        """
        return self._wait.until(
            EC.text_to_be_present_in_element(locator, text),
            message=f"Text '{text}' not found in element {locator}",
        )

    # ── URL ───────────────────────────────────────────────────────────────────

    def wait_for_url_contains(self, partial_url: str):
        """
        Block until the browser's current URL contains *partial_url*.

        Returns
        -------
        bool
        """
        return self._wait.until(
            EC.url_contains(partial_url),
            message=f"URL did not contain '{partial_url}' within {self.timeout}s",
        )

    # ── Disappearance ─────────────────────────────────────────────────────────

    def wait_for_element_to_disappear(self, locator: tuple):
        """
        Wait until the element is either removed from the DOM or becomes
        invisible (useful for loading spinners).

        Returns
        -------
        bool
        """
        return self._wait.until(
            EC.invisibility_of_element_located(locator),
            message=f"Element still visible/present: {locator}",
        )

    # ── Staleness ─────────────────────────────────────────────────────────────

    def wait_for_staleness(self, element):
        """
        Wait until a previously-found WebElement is no longer attached to the
        DOM (e.g. after a page refresh or React re-render removes the node).
        """
        return self._wait.until(
            EC.staleness_of(element),
            message="Element is still attached to the DOM",
        )

    # ── Convenience: element count ────────────────────────────────────────────

    def wait_for_elements(self, locator: tuple):
        """
        Wait until at least one element matching *locator* is present and
        return the full list.
        """
        return self._wait.until(
            EC.presence_of_all_elements_located(locator),
            message=f"No elements found for locator: {locator}",
        )
