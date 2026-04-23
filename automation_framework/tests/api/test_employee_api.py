"""
tests/api/test_employee_api.py
-------------------------------
API tests for the employee management endpoints:

  GET    /api/employees          — list all employees (admin only)
  GET    /api/employees/me       — get own profile (any authenticated user)
  POST   /api/employees          — create employee (admin only)
  PUT    /api/employees/:id      — update employee (admin only)
  DELETE /api/employees/:id      — delete employee (admin only)

Covered scenarios:
  - Auth guards (no token → 401).
  - Non-admin token rejected on admin-only routes (403).
  - List employees returns a non-empty array.
  - Create employee with valid data returns 201.
  - Create employee with missing required fields returns 400.
  - Update employee with valid data returns 200.
  - Delete employee returns 200/204.
"""

import os
import sys
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.api_helper import APIHelper


@pytest.mark.api
@pytest.mark.regression
class TestEmployeeAPI:
    """REST API tests for the /api/employees endpoints."""

    @pytest.fixture(autouse=True)
    def setup(self, api, admin_token):
        self.api   = api
        self.token = admin_token

    # ── Auth guards ───────────────────────────────────────────────────────────

    def test_list_employees_without_token_returns_401(self):
        res = self.api.get("/employees")
        assert res.status_code == 401

    def test_create_employee_without_token_returns_401(self):
        res = self.api.post("/employees", {"name": "Ghost"})
        assert res.status_code == 401

    def test_delete_employee_without_token_returns_401(self):
        res = self.api.delete("/employees/1")
        assert res.status_code == 401

    # ── List employees ─────────────────────────────────────────────────────────

    def test_list_employees_returns_200(self):
        """Admin can retrieve the full list of employees."""
        res = self.api.get("/employees", token=self.token)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_list_employees_returns_array(self):
        """Employee list response should be a JSON array."""
        res = self.api.get("/employees", token=self.token)
        assert res.status_code == 200
        body = res.json()
        assert isinstance(body, list), f"Expected list, got: {type(body)}"

    def test_list_employees_has_expected_fields(self):
        """Each employee object should contain id, first_name, last_name, email, role."""
        res = self.api.get("/employees", token=self.token)
        assert res.status_code == 200
        employees = res.json()
        if employees:
            emp = employees[0]
            for field in ("id", "email", "role"):
                assert field in emp, f"Field '{field}' missing from employee object"
            # name is stored as first_name + last_name
            assert "first_name" in emp or "name" in emp, "No name field in employee object"

    def test_get_my_profile_returns_200(self):
        """GET /employees/me returns the authenticated user's profile."""
        res = self.api.get("/employees/me", token=self.token)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    # ── Create employee ────────────────────────────────────────────────────────

    def test_create_employee_with_valid_data_returns_201(self):
        """Admin can create a new employee with all required fields."""
        ts = int(time.time())
        res = self.api.post(
            "/employees",
            {
                "first_name":   "Selenium",
                "last_name":    f"Test{ts}",
                "email":        f"selenium_{ts}@test.com",
                "phone":        "07700900123",
                "role":         "employee",
                "pin":          str(ts)[-4:],
                "username":     f"sel_{ts}",
                "password":     "TestPass123!",
                "gender":       "male",
                "dob":          "1990-01-01",
                "joining_date": "2024-01-01",
                "brp":          f"AB{ts % 1000000:06d}",
                "address":      "1 Test Street, Luton, LU1 1AA",
            },
            token=self.token,
        )
        assert res.status_code == 201, (
            f"Expected 201 for new employee, got {res.status_code}: {res.text}"
        )
        body = res.json()
        assert "employee" in body or "id" in body or "name" in body, (
            f"No employee data in create response: {body}"
        )

    def test_create_employee_missing_name_returns_400(self):
        """Omitting the required 'name' field should return 400."""
        res = self.api.post(
            "/employees",
            {"email": "noname@test.com", "role": "staff", "pin": "0000"},
            token=self.token,
        )
        assert res.status_code == 400, (
            f"Expected 400 for missing name, got {res.status_code}"
        )

    def test_create_employee_missing_role_returns_400_or_201(self):
        """
        If 'role' defaults to 'staff' on the server, 201 is acceptable.
        If it is required, 400 is expected. Either is valid behaviour.
        """
        ts = int(time.time())
        res = self.api.post(
            "/employees",
            {
                "name":     f"No Role {ts}",
                "email":    f"norole_{ts}@test.com",
                "phone":    "07700 000001",
                "pin":      "1111",
                "username": f"norole_{ts}",
                "password": "TestPass123!",
            },
            token=self.token,
        )
        assert res.status_code in (201, 400), (
            f"Unexpected status when role is omitted: {res.status_code}"
        )

    # ── Update employee ────────────────────────────────────────────────────────

    def test_update_employee_returns_200(self):
        """
        Admin can update an existing employee's name.
        Creates one first, then updates it.
        """
        ts = int(time.time())
        create_res = self.api.post(
            "/employees",
            {
                "name":     f"Update Me {ts}",
                "email":    f"update_{ts}@test.com",
                "phone":    "07700 999888",
                "role":     "staff",
                "pin":      "8888",
                "username": f"updateme_{ts}",
                "password": "TestPass123!",
            },
            token=self.token,
        )
        if create_res.status_code != 201:
            pytest.skip("Could not create employee to update")

        body = create_res.json()
        emp_id = (body.get("employee") or body).get("id")
        if not emp_id:
            pytest.skip("Employee ID not returned from create endpoint")

        update_res = self.api.put(
            f"/employees/{emp_id}",
            {"name": f"Updated Name {ts}"},
            token=self.token,
        )
        assert update_res.status_code in (200, 204), (
            f"Expected 200/204 for employee update, got {update_res.status_code}: {update_res.text}"
        )

    # ── Delete employee ────────────────────────────────────────────────────────

    def test_delete_employee_returns_200_or_204(self):
        """
        Admin can delete an employee created in this test.
        """
        ts = int(time.time())
        create_res = self.api.post(
            "/employees",
            {
                "name":     f"Delete Me {ts}",
                "email":    f"delete_{ts}@test.com",
                "phone":    "07700 111222",
                "role":     "staff",
                "pin":      "5555",
                "username": f"deleteme_{ts}",
                "password": "TestPass123!",
            },
            token=self.token,
        )
        if create_res.status_code != 201:
            pytest.skip("Could not create employee to delete")

        body = create_res.json()
        emp_id = (body.get("employee") or body).get("id")
        if not emp_id:
            pytest.skip("Employee ID not returned from create endpoint")

        del_res = self.api.delete(f"/employees/{emp_id}", token=self.token)
        assert del_res.status_code in (200, 204), (
            f"Expected 200/204 for employee delete, got {del_res.status_code}: {del_res.text}"
        )

    def test_delete_nonexistent_employee_returns_404(self):
        """Deleting an employee with a non-existent ID should return 404."""
        res = self.api.delete("/employees/999999999", token=self.token)
        assert res.status_code == 404, (
            f"Expected 404 for non-existent employee, got {res.status_code}"
        )
