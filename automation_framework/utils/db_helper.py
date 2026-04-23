"""
utils/db_helper.py
------------------
Lightweight wrapper around psycopg2 for the DB test layer.
Reads connection details from environment variables (same ones used by the
Node.js backend) so no extra configuration is needed.

Usage as a context manager (recommended):

    with DBHelper() as db:
        row = db.fetch_one("SELECT * FROM attendance WHERE id = 1")

Usage as a plain object:

    db = DBHelper()
    rows = db.fetch_all("SELECT * FROM employees")
    db.close()
"""

import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


class DBHelper:
    """Manages a single psycopg2 connection for the duration of a test."""

    def __init__(self):
        dsn = os.environ.get("DATABASE_URL")
        if dsn:
            self._conn = psycopg2.connect(dsn)
        else:
            self._conn = psycopg2.connect(
                host=os.environ.get("DB_HOST", "localhost"),
                port=int(os.environ.get("DB_PORT", "5432")),
                dbname=os.environ.get("DB_NAME", "attendance_db"),
                user=os.environ.get("DB_USER", "postgres"),
                password=os.environ.get("DB_PASSWORD", ""),
            )
        self._conn.autocommit = True

    # ── Context manager protocol ──────────────────────────────────────────────

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False  # do not suppress exceptions

    # ── Query helpers ─────────────────────────────────────────────────────────

    def execute_query(self, sql: str, params=None) -> None:
        """
        Execute a DDL or DML statement that returns no rows (INSERT, UPDATE,
        DELETE, CREATE …).

        Parameters
        ----------
        sql    : str   Raw SQL statement.
        params : tuple Optional parameterised values, e.g. (1, 'active').
        """
        with self._conn.cursor() as cur:
            cur.execute(sql, params)

    def fetch_one(self, sql: str, params=None) -> dict | None:
        """
        Execute *sql* and return the first row as an ordered dict, or None if
        no rows were returned.

        Parameters
        ----------
        sql    : str
        params : tuple  Optional bind parameters.

        Returns
        -------
        dict | None
        """
        with self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None

    def fetch_all(self, sql: str, params=None) -> list[dict]:
        """
        Execute *sql* and return all rows as a list of ordered dicts.

        Parameters
        ----------
        sql    : str
        params : tuple  Optional bind parameters.

        Returns
        -------
        list[dict]
        """
        with self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            return [dict(r) for r in rows]

    # ── Connection management ─────────────────────────────────────────────────

    def close(self) -> None:
        """Close the underlying database connection."""
        if self._conn and not self._conn.closed:
            self._conn.close()
