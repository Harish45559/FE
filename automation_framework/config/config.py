"""
config/config.py
----------------
Central configuration for the automation framework.
All sensitive values are loaded from environment variables so that
the same codebase can run locally (via a .env file) and in CI/CD
pipelines without code changes.
"""

import os
from dotenv import load_dotenv

# Load .env from the framework root (one level up from this file)
_DOTENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=_DOTENV_PATH)

# ── Application URLs ──────────────────────────────────────────────────────────
BASE_URL = os.environ.get("BASE_URL", "https://fe-2n6s.onrender.com")
API_URL  = os.environ.get("API_URL",  "https://attendance-be-production.onrender.com/api")

# ── Admin credentials ─────────────────────────────────────────────────────────
ADMIN_USERNAME         = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_DEFAULT_PASSWORD = os.environ.get("ADMIN_DEFAULT_PASSWORD", "")

# ── Employee test credentials (non-admin staff account) ───────────────────────
EMPLOYEE_USERNAME = os.environ.get("EMPLOYEE_USERNAME", "Yesh18")
EMPLOYEE_PASSWORD = os.environ.get("EMPLOYEE_PASSWORD", "test123")

# ── Customer test account ─────────────────────────────────────────────────────
CUSTOMER_EMAIL    = os.environ.get("CUSTOMER_EMAIL", "selenium_test@example.com")
CUSTOMER_PASSWORD = os.environ.get("CUSTOMER_PASSWORD", "password1")

# ── Database (PostgreSQL via psycopg2) ────────────────────────────────────────
DB_HOST     = os.environ.get("DB_HOST", "localhost")
DB_PORT     = os.environ.get("DB_PORT", "5432")
DB_NAME     = os.environ.get("DB_NAME", "attendance_db")
DB_USER     = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_DSN      = os.environ.get(
    "DATABASE_URL",
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
)

# ── Browser settings ──────────────────────────────────────────────────────────
BROWSER      = os.environ.get("BROWSER", "chrome")   # chrome | firefox
HEADLESS     = os.environ.get("HEADLESS", "true").lower() == "true"
WINDOW_WIDTH  = int(os.environ.get("WINDOW_WIDTH",  "1920"))
WINDOW_HEIGHT = int(os.environ.get("WINDOW_HEIGHT", "1080"))

# ── Timeouts (seconds) ────────────────────────────────────────────────────────
IMPLICIT_WAIT    = int(os.environ.get("IMPLICIT_WAIT",    "5"))
EXPLICIT_WAIT    = int(os.environ.get("EXPLICIT_WAIT",    "15"))
PAGE_LOAD_TIMEOUT = int(os.environ.get("PAGE_LOAD_TIMEOUT", "30"))

# ── Reporting ─────────────────────────────────────────────────────────────────
SCREENSHOTS_DIR = os.path.join(
    os.path.dirname(__file__), "..", "reports", "screenshots"
)
