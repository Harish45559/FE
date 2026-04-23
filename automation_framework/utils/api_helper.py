"""
utils/api_helper.py
-------------------
Thin wrapper around the `requests` library that targets the attendance
backend REST API.  All API tests and conftest fixtures use this class to
avoid repeating URL assembly and header logic across test files.

Usage:

    api = APIHelper()
    resp = api.post("/auth/login", {"username": "admin", "password": "secret"})
    token = resp.json()["token"]
    resp = api.get("/employees", token=token)
"""

import sys
import os

import requests

# Allow running from any working directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config.config import API_URL


class APIHelper:
    """Wraps requests with base-URL resolution and Bearer-token injection."""

    def __init__(self, base_url: str = API_URL):
        self.base_url = base_url.rstrip("/")
        self._session = requests.Session()

    # ── Private helpers ───────────────────────────────────────────────────────

    def _headers(self, token: str | None = None) -> dict:
        h = {"Content-Type": "application/json", "Accept": "application/json"}
        if token:
            h["Authorization"] = f"Bearer {token}"
        return h

    def _url(self, endpoint: str) -> str:
        return f"{self.base_url}/{endpoint.lstrip('/')}"

    # ── Public methods ────────────────────────────────────────────────────────

    def get(self, endpoint: str, token: str | None = None, **kwargs) -> requests.Response:
        """
        HTTP GET request.

        Parameters
        ----------
        endpoint : str  Path relative to API base URL, e.g. "/employees".
        token    : str  Optional JWT.  Adds Authorization header when provided.
        **kwargs        Forwarded to requests.Session.get (params, timeout …).

        Returns
        -------
        requests.Response
        """
        return self._session.get(
            self._url(endpoint),
            headers=self._headers(token),
            **kwargs,
        )

    def post(
        self,
        endpoint: str,
        data: dict,
        token: str | None = None,
        **kwargs,
    ) -> requests.Response:
        """
        HTTP POST with a JSON body.

        Parameters
        ----------
        endpoint : str
        data     : dict  Request body serialised as JSON.
        token    : str   Optional JWT.
        **kwargs         Forwarded to requests.Session.post.

        Returns
        -------
        requests.Response
        """
        return self._session.post(
            self._url(endpoint),
            json=data,
            headers=self._headers(token),
            **kwargs,
        )

    def patch(
        self,
        endpoint: str,
        data: dict,
        token: str | None = None,
        **kwargs,
    ) -> requests.Response:
        """
        HTTP PATCH with a JSON body.

        Parameters
        ----------
        endpoint : str
        data     : dict  Partial update payload.
        token    : str   Optional JWT.
        **kwargs         Forwarded to requests.Session.patch.

        Returns
        -------
        requests.Response
        """
        return self._session.patch(
            self._url(endpoint),
            json=data,
            headers=self._headers(token),
            **kwargs,
        )

    def put(
        self,
        endpoint: str,
        data: dict,
        token: str | None = None,
        **kwargs,
    ) -> requests.Response:
        """HTTP PUT with a JSON body."""
        return self._session.put(
            self._url(endpoint),
            json=data,
            headers=self._headers(token),
            **kwargs,
        )

    def delete(
        self,
        endpoint: str,
        token: str | None = None,
        **kwargs,
    ) -> requests.Response:
        """HTTP DELETE."""
        return self._session.delete(
            self._url(endpoint),
            headers=self._headers(token),
            **kwargs,
        )
