import os
import tempfile
import pytest
from backend.app import create_app
from backend.db import get_db

@pytest.fixture
def client():
    # Use temporary database for isolated test execution
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    app = create_app({
        "TESTING": True,
        "DATABASE_PATH": db_path,
        "SECRET_KEY": "test-secret-key-12345"
    })

    with app.test_client() as client:
        yield client

    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except PermissionError:
            pass

def login_as(client, username, password="Password123!"):
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.get_json()}"
    data = res.get_json()
    return data["token"], data["user"]

def test_login_success(client):
    res = client.post("/api/auth/login", json={"username": "emp_sarah", "password": "Password123!"})
    assert res.status_code == 200
    data = res.get_json()
    assert "token" in data
    assert data["user"]["username"] == "emp_sarah"
    assert data["user"]["role"] == "employee"

def test_login_invalid_password(client):
    res = client.post("/api/auth/login", json={"username": "emp_sarah", "password": "WrongPassword"})
    assert res.status_code == 401
    assert "error" in res.get_json()

def test_login_missing_fields(client):
    res = client.post("/api/auth/login", json={"username": ""})
    assert res.status_code == 400

def test_employee_creates_ticket(client):
    token, _ = login_as(client, "emp_sarah")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Dual monitor HDMI adapter not detected",
        "description": "After Windows update, external Dell monitor displays black screen through USB-C HDMI adapter.",
        "category": "hardware",
        "priority": "high"
    }
    res = client.post("/api/tickets", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.get_json()
    ticket = data["ticket"]
    assert ticket["title"] == payload["title"]
    assert ticket["status"] == "open"
    assert ticket["reporter_username"] == "emp_sarah"
    assert ticket["assigned_technician_display"] == "Unassigned"
    assert ticket["id"].startswith("HD-")

def test_ticket_validation_rejects_invalid_category_and_priority(client):
    token, _ = login_as(client, "emp_sarah")
    headers = {"Authorization": f"Bearer {token}"}

    # Invalid category
    res = client.post("/api/tickets", json={
        "title": "Valid title",
        "description": "Valid description",
        "category": "invalid-cat",
        "priority": "low"
    }, headers=headers)
    assert res.status_code == 400
    assert "category" in res.get_json().get("details", {})

    # Invalid priority
    res = client.post("/api/tickets", json={
        "title": "Valid title",
        "description": "Valid description",
        "category": "software",
        "priority": "extreme"
    }, headers=headers)
    assert res.status_code == 400
    assert "priority" in res.get_json().get("details", {})

    # Missing title and description
    res = client.post("/api/tickets", json={
        "title": "",
        "description": "",
        "category": "software",
        "priority": "low"
    }, headers=headers)
    assert res.status_code == 400

def test_employee_sees_only_own_tickets(client):
    sarah_token, sarah_user = login_as(client, "emp_sarah")
    alex_token, alex_user = login_as(client, "emp_alex")

    # Sarah listing
    res = client.get("/api/tickets", headers={"Authorization": f"Bearer {sarah_token}"})
    assert res.status_code == 200
    sarah_tickets = res.get_json()["tickets"]
    for t in sarah_tickets:
        assert t["reported_by"] == sarah_user["id"]

    # Alex listing
    res = client.get("/api/tickets", headers={"Authorization": f"Bearer {alex_token}"})
    assert res.status_code == 200
    alex_tickets = res.get_json()["tickets"]
    for t in alex_tickets:
        assert t["reported_by"] == alex_user["id"]

def test_technician_sees_all_tickets(client):
    tech_token, _ = login_as(client, "tech_david")
    res = client.get("/api/tickets", headers={"Authorization": f"Bearer {tech_token}"})
    assert res.status_code == 200
    tickets = res.get_json()["tickets"]
    # We seeded 5 sample tickets across sarah and alex
    assert len(tickets) >= 5

def test_employee_cannot_view_another_employees_ticket(client):
    # HD-1001 is reported by emp_sarah
    alex_token, _ = login_as(client, "emp_alex")
    res = client.get("/api/tickets/HD-1001", headers={"Authorization": f"Bearer {alex_token}"})
    assert res.status_code == 403
    assert "Forbidden" in res.get_json()["error"]

def test_employee_cannot_assign_technician(client):
    sarah_token, _ = login_as(client, "emp_sarah")
    res = client.patch("/api/tickets/HD-1001/assign", json={"assigned_to": 3}, headers={"Authorization": f"Bearer {sarah_token}"})
    assert res.status_code == 403

def test_employee_cannot_change_ticket_status(client):
    sarah_token, _ = login_as(client, "emp_sarah")
    res = client.patch("/api/tickets/HD-1001/status", json={"status": "resolved"}, headers={"Authorization": f"Bearer {sarah_token}"})
    assert res.status_code == 403

def test_technician_can_assign_valid_technician(client):
    tech_token, _ = login_as(client, "tech_david")
    # Fetch technician list to get Elena's ID
    t_res = client.get("/api/technicians", headers={"Authorization": f"Bearer {tech_token}"})
    elena = next(t for t in t_res.get_json()["technicians"] if t["username"] == "tech_elena")

    # Assign HD-1001 to Elena
    res = client.patch("/api/tickets/HD-1001/assign", json={"assigned_to": elena["id"]}, headers={"Authorization": f"Bearer {tech_token}"})
    assert res.status_code == 200
    updated = res.get_json()["ticket"]
    assert updated["assigned_to"] == elena["id"]
    assert updated["assigned_technician_display"] == elena["full_name"]

def test_technician_assign_rejects_employee_or_invalid_id(client):
    tech_token, _ = login_as(client, "tech_david")
    # Try to assign to employee Sarah (ID 1)
    res = client.patch("/api/tickets/HD-1001/assign", json={"assigned_to": 1}, headers={"Authorization": f"Bearer {tech_token}"})
    assert res.status_code == 400
    assert "cannot be assigned as technician" in res.get_json()["error"]

    # Try non-existent ID
    res = client.patch("/api/tickets/HD-1001/assign", json={"assigned_to": 9999}, headers={"Authorization": f"Bearer {tech_token}"})
    assert res.status_code == 400
    assert "not found" in res.get_json()["error"]

def test_technician_status_update_and_history(client):
    tech_token, tech_user = login_as(client, "tech_david")
    headers = {"Authorization": f"Bearer {tech_token}"}

    # HD-1001 is open -> change to in-progress
    res = client.patch("/api/tickets/HD-1001/status", json={"status": "in-progress"}, headers=headers)
    assert res.status_code == 200
    ticket = res.get_json()["ticket"]
    assert ticket["status"] == "in-progress"

    # Verify history
    h_res = client.get("/api/tickets/HD-1001/history", headers=headers)
    assert h_res.status_code == 200
    history = h_res.get_json()["history"]
    latest_event = history[-1]
    assert latest_event["old_status"] == "open"
    assert latest_event["new_status"] == "in-progress"
    assert latest_event["changed_by"] == tech_user["id"]

def test_dashboard_stats_accuracy(client):
    tech_token, _ = login_as(client, "tech_david")
    res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {tech_token}"})
    assert res.status_code == 200
    stats = res.get_json()["stats"]

    # Verify keys
    assert "open_issues" in stats
    assert "urgent_requests" in stats
    assert "assigned_tickets" in stats
    assert "completed_work" in stats

    # In seed data:
    # HD-1001: open, high, unassigned
    # HD-1002: in-progress, urgent, assigned
    # HD-1003: resolved, medium, assigned
    # HD-1004: closed, low, assigned
    # HD-1005: open, urgent, unassigned
    #
    # open_issues: open or in-progress -> HD-1001, HD-1002, HD-1005 = 3
    # urgent_requests: urgent & status NOT in (resolved, closed) -> HD-1002, HD-1005 = 2
    # assigned_tickets: assigned_to IS NOT NULL and status != 'closed' -> HD-1002, HD-1003 = 2
    # completed_work: status in (resolved, closed) -> HD-1003, HD-1004 = 2
    assert stats["open_issues"] == 3
    assert stats["urgent_requests"] == 2
    assert stats["assigned_tickets"] == 2
    assert stats["completed_work"] == 2

def test_filtering_and_sorting(client):
    tech_token, _ = login_as(client, "tech_david")
    headers = {"Authorization": f"Bearer {tech_token}"}

    # Filter by category
    res = client.get("/api/tickets?category=hardware", headers=headers)
    assert res.status_code == 200
    for t in res.get_json()["tickets"]:
        assert t["category"] == "hardware"

    # Filter by priority
    res = client.get("/api/tickets?priority=urgent", headers=headers)
    assert res.status_code == 200
    for t in res.get_json()["tickets"]:
        assert t["priority"] == "urgent"

    # Search by keyword
    res = client.get("/api/tickets?search=VPN", headers=headers)
    assert res.status_code == 200
    assert len(res.get_json()["tickets"]) >= 1
    assert "VPN" in res.get_json()["tickets"][0]["title"]

    # Sort urgent first
    res = client.get("/api/tickets?sort=priority", headers=headers)
    assert res.status_code == 200
    tickets = res.get_json()["tickets"]
    first_two_priorities = [t["priority"] for t in tickets[:2]]
    assert all(p == "urgent" for p in first_two_priorities)

def test_database_persistence_across_restart():
    # Verify that data survives app shutdown and reload on the same database file
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    try:
        # First instance: create app, create ticket, update status
        app1 = create_app({"TESTING": True, "DATABASE_PATH": db_path})
        with app1.test_client() as client1:
            token, _ = login_as(client1, "emp_sarah")
            res = client1.post("/api/tickets", json={
                "title": "Persistent ticket test across server reboot",
                "description": "Checking SQLite disk persistence across application restarts.",
                "category": "software",
                "priority": "urgent"
            }, headers={"Authorization": f"Bearer {token}"})
            assert res.status_code == 201
            created_id = res.get_json()["ticket"]["id"]

            # Technician assigns and changes status
            tech_token, _ = login_as(client1, "tech_david")
            client1.patch(f"/api/tickets/{created_id}/status", json={"status": "in-progress"}, headers={"Authorization": f"Bearer {tech_token}"})

        # Simulate complete server restart by creating fresh app instance with same DB path
        app2 = create_app({"TESTING": True, "DATABASE_PATH": db_path})
        with app2.test_client() as client2:
            tech_token2, _ = login_as(client2, "tech_david")
            res = client2.get(f"/api/tickets/{created_id}", headers={"Authorization": f"Bearer {tech_token2}"})
            assert res.status_code == 200
            t = res.get_json()["ticket"]
            assert t["id"] == created_id
            assert t["status"] == "in-progress"
            assert len(t["history"]) == 2  # initial 'open' and updated 'in-progress'
    finally:
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except PermissionError:
                pass

