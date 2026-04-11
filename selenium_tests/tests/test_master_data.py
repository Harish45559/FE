import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from selenium.webdriver.support import expected_conditions as EC
from pages.login_page import LoginPage
from pages.master_data_page import MasterDataPage
from config import BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD


def admin_login(driver, wait):
    LoginPage(driver, wait).open().login(ADMIN_USERNAME, ADMIN_PASSWORD)
    wait.until(EC.url_contains("/dashboard"))


def employee_login(driver, wait):
    LoginPage(driver, wait).open().login(EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD)
    wait.until(EC.url_contains("/attendance"))


class TestMasterData:

    def test_admin_can_access_master_data(self, driver, wait):
        admin_login(driver, wait)
        page = MasterDataPage(driver, wait).open()
        assert page.is_loaded()

    def test_master_data_shows_correct_heading(self, driver, wait):
        admin_login(driver, wait)
        page = MasterDataPage(driver, wait).open()
        assert "master" in page.get_heading().lower()

    def test_employee_cannot_access_master_data(self, driver, wait):
        employee_login(driver, wait)
        driver.get(f"{BASE_URL}/master-data")
        wait.until(EC.url_contains("/attendance"))
        assert "/master-data" not in driver.current_url

    def test_unauthenticated_cannot_access_master_data(self, driver, wait):
        driver.get(f"{BASE_URL}/master-data")
        wait.until(EC.url_contains("/login"))
        assert "/login" in driver.current_url
