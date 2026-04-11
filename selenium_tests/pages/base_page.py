from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By


class BasePage:
    def __init__(self, driver, wait):
        self.driver = driver
        self.wait = wait

    def navigate_to(self, url):
        self.driver.get(url)

    def get_current_url(self):
        return self.driver.current_url

    def wait_for_url(self, partial_url, timeout=10):
        from selenium.webdriver.support.ui import WebDriverWait
        WebDriverWait(self.driver, timeout).until(EC.url_contains(partial_url))

    def wait_for_element(self, by, selector):
        return self.wait.until(EC.presence_of_element_located((by, selector)))

    def wait_for_visible(self, by, selector):
        return self.wait.until(EC.visibility_of_element_located((by, selector)))

    def find(self, by, selector):
        return self.driver.find_element(by, selector)

    def find_all(self, by, selector):
        return self.driver.find_elements(by, selector)

    def is_element_present(self, by, selector):
        return len(self.driver.find_elements(by, selector)) > 0
