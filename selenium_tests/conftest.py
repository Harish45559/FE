import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

# Re-export so existing imports like `from conftest import BASE_URL` still work
from config import BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD

SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "screenshots")


def pytest_addoption(parser):
    parser.addoption(
        "--headed",
        action="store_true",
        default=False,
        help="Run in headed (visible browser) mode. Default is headless.",
    )


@pytest.fixture(scope="function")
def driver(request):
    options = Options()
    headed = request.config.getoption("--headed")
    if not headed:
        options.add_argument("--headless=new")
        options.add_argument("--window-size=1920,1080")
    else:
        options.add_argument("--start-maximized")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    d = webdriver.Chrome(options=options)
    d.implicitly_wait(5)
    yield d
    d.quit()


@pytest.fixture(scope="function")
def wait(driver):
    return WebDriverWait(driver, 10)


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Auto-screenshot on any test failure."""
    outcome = yield
    rep = outcome.get_result()
    if rep.when == "call" and rep.failed:
        driver = item.funcargs.get("driver")
        if driver:
            os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
            safe = rep.nodeid.replace("::", "_").replace("/", "_").replace("\\", "_")
            path = os.path.join(SCREENSHOTS_DIR, f"{safe}.png")
            try:
                driver.save_screenshot(path)
                print(f"\n  Screenshot saved: {path}")
            except Exception:
                pass
