"""
utils/screenshot_helper.py
--------------------------
Saves a PNG screenshot to reports/screenshots/ with a timestamp-prefixed
filename.  Called automatically on test failure from conftest.py and
BaseTest.teardown_method.
"""

import os
from datetime import datetime


def take_screenshot(driver, test_name: str) -> str:
    """
    Capture a screenshot and save it under reports/screenshots/.

    Parameters
    ----------
    driver    : Selenium WebDriver instance
    test_name : Human-readable label used as part of the filename

    Returns
    -------
    str  Absolute path to the saved PNG, or empty string on failure.
    """
    # Build output directory relative to this file's location
    screenshots_dir = os.path.join(
        os.path.dirname(__file__), "..", "reports", "screenshots"
    )
    os.makedirs(screenshots_dir, exist_ok=True)

    # Sanitise the test name so it is safe to use as a filename
    safe_name = (
        test_name.replace("::", "_")
                 .replace("/", "_")
                 .replace("\\", "_")
                 .replace(" ", "_")
    )
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = f"{timestamp}_{safe_name}.png"
    filepath  = os.path.abspath(os.path.join(screenshots_dir, filename))

    try:
        driver.save_screenshot(filepath)
        print(f"\n  [screenshot] Saved: {filepath}")
        return filepath
    except Exception as exc:
        print(f"\n  [screenshot] Failed to save screenshot: {exc}")
        return ""
