# Attendance System — Python Selenium Automation Framework

A production-quality QA automation framework for the Attendance & Online
Ordering system.  It covers UI (Selenium), REST API (requests), and
database (psycopg2) test layers, wired together with pytest and pytest-html.

---

## Stack

| Layer     | Tool / Library              |
|-----------|-----------------------------|
| UI        | Selenium 4 + WebDriver Manager |
| API       | requests                    |
| Database  | psycopg2-binary             |
| Test runner | pytest 8                  |
| Reporting | pytest-html (self-contained)|
| CI/CD     | Jenkins (Jenkinsfile)       |
| Config    | python-dotenv               |

---

## Folder Structure

```
automation_framework/
├── tests/
│   ├── ui/                  # Selenium browser tests
│   │   ├── test_clock_in.py
│   │   ├── test_clock_out.py
│   │   ├── test_dashboard.py
│   │   ├── test_manual_entry.py
│   │   └── test_customer_flow.py
│   ├── api/                 # REST API tests (no browser)
│   │   ├── test_auth_api.py
│   │   ├── test_attendance_api.py
│   │   ├── test_employee_api.py
│   │   └── test_order_api.py
│   └── db/                  # Direct database tests
│       ├── test_timezone_validation.py
│       └── test_break_calculation.py
├── pages/                   # Page Object Model
│   ├── base_page.py
│   ├── login_page.py
│   ├── dashboard_page.py
│   ├── clock_in_page.py
│   ├── clock_out_page.py
│   ├── attendance_records_page.py
│   ├── manual_entry_page.py
│   └── customer/
│       ├── menu_page.py
│       ├── cart_page.py
│       └── payment_page.py
├── utils/
│   ├── base_test.py         # BaseTest class with setup/teardown
│   ├── wait_helper.py       # Explicit-wait utility wrappers
│   ├── screenshot_helper.py # Auto-screenshot on failure
│   ├── db_helper.py         # psycopg2 wrapper
│   └── api_helper.py        # requests wrapper
├── config/
│   ├── config.py            # All settings from env vars
│   └── pytest.ini           # Markers & addopts
├── data/
│   ├── clock_in_data.csv    # Data-driven clock-in scenarios
│   ├── employee_data.csv    # Employee creation test data
│   └── attendance_data.json # JSON test data (API + DB tests)
├── reports/
│   └── screenshots/         # Auto-saved failure screenshots
├── conftest.py              # Shared fixtures (driver, tokens, db)
├── requirements.txt
├── Jenkinsfile
└── README.md
```

---

## Setup

### 1. Prerequisites

- Python 3.11+
- Google Chrome (latest stable)
- PostgreSQL access (for DB tests only)

### 2. Create a virtual environment

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create `automation_framework/.env`:

```dotenv
# Application
BASE_URL=https://fe-2n6s.onrender.com
API_URL=https://attendance-be-production.onrender.com/api

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_DEFAULT_PASSWORD=your_admin_password_here

# Employee test account
EMPLOYEE_USERNAME=Yesh18
EMPLOYEE_PASSWORD=test123

# Customer test account (session fixture will register if it does not exist)
CUSTOMER_EMAIL=selenium_session@test.com
CUSTOMER_PASSWORD=password1

# Database (only needed for db/ tests)
DATABASE_URL=postgresql://user:password@host:5432/attendance_db

# Browser
HEADLESS=true
```

---

## Running Tests

### Run everything

```bash
cd automation_framework
pytest
```

### Run by layer

```bash
# API tests only (fast, no browser)
pytest tests/api/ -m api

# Database tests only
pytest tests/db/ -m db

# UI smoke tests (browser, critical paths)
pytest tests/ui/ -m smoke

# Full UI regression
pytest tests/ui/ -m regression
```

### Run in headed (visible browser) mode

```bash
pytest tests/ui/ --headed
```

### Run a specific test file

```bash
pytest tests/api/test_auth_api.py -v
```

### Run in parallel (requires pytest-xdist)

```bash
pytest tests/api/ -n 4
```

---

## Data-Driven Tests

### CSV (clock-in scenarios)

`data/clock_in_data.csv` is read at collection time using Python's `csv`
module.  Each row becomes a separate parametrised test case visible in the
HTML report.

```csv
employee_id,pin,expected_result,test_case
1,1234,success,valid_employee
99,0000,error,invalid_employee
```

### JSON (attendance API + DB tests)

`data/attendance_data.json` contains nested arrays for valid clock-in,
invalid clock-in, and timezone scenarios.  Tests use `@pytest.mark.parametrize`
with list comprehensions to turn JSON arrays into test cases.

---

## Reports

HTML reports are written to `reports/` after each run:

```
reports/report.html          — combined (default addopts)
reports/api_report.html      — Jenkins API stage
reports/smoke_report.html    — Jenkins smoke stage
reports/regression_report.html
reports/screenshots/         — PNG screenshots on failure
```

Open any `.html` file directly in a browser — they are self-contained (no
external CDN dependencies).

---

## Architecture — Page Object Model

Every page in the application has a corresponding Python class under `pages/`.
Page objects:

- Encapsulate element locators as class-level tuples `(By.X, "selector")`
- Expose human-readable methods (`login()`, `enter_pin()`, `get_error_message()`)
- Never contain assertions — those live in the test files
- Inherit from `BasePage` for common Selenium operations

```python
# Example usage in a test
from pages.login_page import LoginPage

page = LoginPage(self.driver, self.wait).open()
page.login("admin", "secret")
assert "/dashboard" in self.driver.current_url
```

---

## CI/CD — Jenkins

The `Jenkinsfile` defines four stages that run in order:

1. **Install** — `pip install -r requirements.txt`
2. **API Tests** — fast, no browser required
3. **DB Tests** — direct PostgreSQL queries
4. **UI Smoke** — browser tests marked `@pytest.mark.smoke`
5. **UI Regression** — full suite, runs on `main` branch only

Credentials (`ADMIN_DEFAULT_PASSWORD`, `DATABASE_URL`) are injected from
Jenkins' Credentials store — never hardcoded.

---

## Contributing

- Add new page objects under `pages/` following the existing pattern.
- Add test data rows to the CSV/JSON files rather than hardcoding values.
- Mark every test with at least one of: `ui`, `api`, `db`, `smoke`, `regression`.
- Run `pytest --co -q` to confirm test collection before pushing.
