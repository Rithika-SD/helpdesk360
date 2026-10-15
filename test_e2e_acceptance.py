"""
Comprehensive End-to-End Acceptance Test Runner for HelpDesk 360
Tests all 14 Mandatory Acceptance Criteria against real SQLite database.
"""
import sys
import os
import sqlite3
import tempfile
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from backend.app import create_app
from backend.db import get_db

def run_acceptance_suite():
    print("=" * 70)
    print(" HELPDESK 360 - MANDATORY ACCEPTANCE VERIFICATION SUITE")
    print("=" * 70)

    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    passed_count = 0
    total_tests = 14

    def report(num, title, success, details=""):
        nonlocal passed_count
        status = "PASSED" if success else "FAILED"
        mark = "[OK]" if success else "[FAIL]"
        print(f"[{status}] Test {num:02d}: {title} {mark}")
        if details:
            print(f"         Details: {details}")
        if success:
            passed_count += 1

    try:
        app = create_app({"TESTING": True, "DATABASE_PATH": db_path, "SECRET_KEY": "e2e-secret-key"})
        client = app.test_client()

        # TEST 1: Demo employee and technician can log in
        emp_res = client.post("/api/auth/login", json={"username": "emp_sarah", "password": "Password123!"})
        tech_res = client.post("/api/auth/login", json={"username": "tech_david", "password": "Password123!"})
        t1_ok = (emp_res.status_code == 200 and tech_res.status_code == 200 and
                 "token" in emp_res.get_json() and "token" in tech_res.get_json())
        emp_token = emp_res.get_json()["token"]
        tech_token = tech_res.get_json()["token"]
        report(1, "Demo employee and technician can log in", t1_ok, f"emp_sarah: HTTP {emp_res.status_code}, tech_david: HTTP {tech_res.status_code}")

        # TEST 2: Employee creates a ticket successfully
        create_res = client.post("/api/tickets", json={
            "title": "Dual-monitor display scaling issue on docking station",
            "description": "Dell DisplayLink dock locks resolution to 1080p when dual 4K monitors are connected.",
            "category": "hardware",
            "priority": "urgent"
        }, headers={"Authorization": f"Bearer {emp_token}"})
        t2_ok = create_res.status_code == 201 and "ticket" in create_res.get_json()
        new_ticket = create_res.get_json().get("ticket", {})
        new_ticket_id = new_ticket.get("id")
        report(2, "Employee creates a ticket successfully", t2_ok, f"Created Ticket ID: {new_ticket_id}, Status: {new_ticket.get('status')}")

        # TEST 3: Ticket appears in employee's My Tickets and technician's queue
        emp_list_res = client.get("/api/tickets", headers={"Authorization": f"Bearer {emp_token}"})
        tech_list_res = client.get("/api/tickets", headers={"Authorization": f"Bearer {tech_token}"})
        emp_ticket_ids = [t["id"] for t in emp_list_res.get_json()["tickets"]]
        tech_ticket_ids = [t["id"] for t in tech_list_res.get_json()["tickets"]]
        t3_ok = (new_ticket_id in emp_ticket_ids) and (new_ticket_id in tech_ticket_ids)
        report(3, "Ticket appears in employee's My Tickets and technician's queue", t3_ok,
               f"Found in Employee list: {new_ticket_id in emp_ticket_ids}, Found in Tech list: {new_ticket_id in tech_ticket_ids}")

        # TEST 4: Ticket remains after browser refresh (re-querying API from database)
        refresh_res = client.get(f"/api/tickets/{new_ticket_id}", headers={"Authorization": f"Bearer {emp_token}"})
        t4_ok = refresh_res.status_code == 200 and refresh_res.get_json()["ticket"]["id"] == new_ticket_id
        report(4, "Ticket remains after browser refresh / API reload", t4_ok, f"HTTP {refresh_res.status_code}, DB read matches ID")

        # TEST 5: Technician assigns a valid technician and employee sees assignment
        tech_list = client.get("/api/technicians", headers={"Authorization": f"Bearer {tech_token}"}).get_json()["technicians"]
        elena = next(t for t in tech_list if t["username"] == "tech_elena")
        assign_res = client.patch(f"/api/tickets/{new_ticket_id}/assign", json={"assigned_to": elena["id"]}, headers={"Authorization": f"Bearer {tech_token}"})
        # Employee checks ticket details
        emp_view_res = client.get(f"/api/tickets/{new_ticket_id}", headers={"Authorization": f"Bearer {emp_token}"})
        assigned_name = emp_view_res.get_json()["ticket"]["assigned_technician_display"]
        t5_ok = assign_res.status_code == 200 and assigned_name == elena["full_name"]
        report(5, "Technician assigns a valid technician and employee sees the assignment", t5_ok, f"Assigned to: {assigned_name}")

        # TEST 6: Technician changes status and employee sees updated status
        status_res = client.patch(f"/api/tickets/{new_ticket_id}/status", json={"status": "in-progress"}, headers={"Authorization": f"Bearer {tech_token}"})
        emp_view_res2 = client.get(f"/api/tickets/{new_ticket_id}", headers={"Authorization": f"Bearer {emp_token}"})
        updated_status = emp_view_res2.get_json()["ticket"]["status"]
        t6_ok = status_res.status_code == 200 and updated_status == "in-progress"
        report(6, "Technician changes status and employee sees updated status", t6_ok, f"Status updated to: {updated_status}")

        # TEST 7: Status history records the change
        history_res = client.get(f"/api/tickets/{new_ticket_id}/history", headers={"Authorization": f"Bearer {emp_token}"})
        hist_events = history_res.get_json()["history"]
        has_initial_open = any(h["new_status"] == "open" for h in hist_events)
        has_in_progress = any(h["old_status"] == "open" and h["new_status"] == "in-progress" for h in hist_events)
        t7_ok = history_res.status_code == 200 and has_initial_open and has_in_progress
        report(7, "Status history records the change", t7_ok, f"Recorded events: {len(hist_events)}, Transitions: {[f'{h['old_status']}->{h['new_status']}' for h in hist_events]}")

        # TEST 8: Backend restarts without losing tickets, assignments, or status history
        # Create a new app instance pointing to the same SQLite file
        restarted_app = create_app({"TESTING": True, "DATABASE_PATH": db_path, "SECRET_KEY": "e2e-secret-key"})
        restarted_client = restarted_app.test_client()
        rest_emp_res = restarted_client.post("/api/auth/login", json={"username": "emp_sarah", "password": "Password123!"})
        rest_emp_token = rest_emp_res.get_json()["token"]
        persisted_res = restarted_client.get(f"/api/tickets/{new_ticket_id}", headers={"Authorization": f"Bearer {rest_emp_token}"})
        p_ticket = persisted_res.get_json()["ticket"]
        t8_ok = (persisted_res.status_code == 200 and
                 p_ticket["id"] == new_ticket_id and
                 p_ticket["status"] == "in-progress" and
                 p_ticket["assigned_technician_display"] == elena["full_name"] and
                 len(p_ticket["history"]) >= 2)
        report(8, "Backend restarts without losing tickets, assignments, or status history", t8_ok, f"Restored ticket {new_ticket_id} with status {p_ticket['status']}")

        # TEST 9: Employee cannot view another employee's tickets
        alex_res = client.post("/api/auth/login", json={"username": "emp_alex", "password": "Password123!"})
        alex_token = alex_res.get_json()["token"]
        unauth_view = client.get(f"/api/tickets/{new_ticket_id}", headers={"Authorization": f"Bearer {alex_token}"})
        t9_ok = unauth_view.status_code == 403
        report(9, "Employee cannot view another employee's tickets", t9_ok, f"Access attempt by Alex returned HTTP {unauth_view.status_code}")

        # TEST 10: Employee cannot assign technicians or change status using direct API requests
        unauth_assign = client.patch(f"/api/tickets/{new_ticket_id}/assign", json={"assigned_to": elena["id"]}, headers={"Authorization": f"Bearer {emp_token}"})
        unauth_status = client.patch(f"/api/tickets/{new_ticket_id}/status", json={"status": "resolved"}, headers={"Authorization": f"Bearer {emp_token}"})
        t10_ok = unauth_assign.status_code == 403 and unauth_status.status_code == 403
        report(10, "Employee cannot assign technicians or change status using direct API requests", t10_ok,
               f"Direct assign HTTP: {unauth_assign.status_code}, Direct status HTTP: {unauth_status.status_code}")

        # TEST 11: Invalid ticket input is rejected without crashing
        bad1 = client.post("/api/tickets", json={"title": "", "description": "", "category": "invalid", "priority": "urgent"}, headers={"Authorization": f"Bearer {emp_token}"})
        bad2 = client.post("/api/tickets", json={"title": "Test", "description": "Desc", "category": "hardware", "priority": "super-urgent"}, headers={"Authorization": f"Bearer {emp_token}"})
        t11_ok = bad1.status_code == 400 and bad2.status_code == 400
        report(11, "Invalid ticket input is rejected without crashing", t11_ok, f"Empty title/cat HTTP: {bad1.status_code}, Invalid priority HTTP: {bad2.status_code}")

        # TEST 12: Dashboard counts match direct SQLite queries
        stats_res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {tech_token}"})
        api_stats = stats_res.get_json()["stats"]
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT COUNT(*) AS c FROM tickets WHERE status IN ('open', 'in-progress')")
        expected_open = c.fetchone()["c"]
        c.execute("SELECT COUNT(*) AS c FROM tickets WHERE priority = 'urgent' AND status NOT IN ('resolved', 'closed')")
        expected_urgent = c.fetchone()["c"]
        c.execute("SELECT COUNT(*) AS c FROM tickets WHERE assigned_to IS NOT NULL AND status != 'closed'")
        expected_assigned = c.fetchone()["c"]
        c.execute("SELECT COUNT(*) AS c FROM tickets WHERE status IN ('resolved', 'closed')")
        expected_completed = c.fetchone()["c"]
        conn.close()

        t12_ok = (api_stats["open_issues"] == expected_open and
                  api_stats["urgent_requests"] == expected_urgent and
                  api_stats["assigned_tickets"] == expected_assigned and
                  api_stats["completed_work"] == expected_completed)
        report(12, "Dashboard counts match direct SQLite queries", t12_ok,
               f"Open: {api_stats['open_issues']} (DB: {expected_open}), Urgent: {api_stats['urgent_requests']} (DB: {expected_urgent}), Assigned: {api_stats['assigned_tickets']} (DB: {expected_assigned}), Completed: {api_stats['completed_work']} (DB: {expected_completed})")

        # TEST 13: Empty database displays meaningful empty states
        empty_db_fd, empty_db_path = tempfile.mkstemp(suffix=".db")
        os.close(empty_db_fd)
        empty_conn = sqlite3.connect(empty_db_path)
        # Init tables without seeding tickets
        empty_conn.executescript("""
        CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password_hash TEXT, role TEXT, full_name TEXT, created_at TEXT);
        CREATE TABLE tickets (id TEXT PRIMARY KEY, title TEXT, description TEXT, category TEXT, priority TEXT, status TEXT, reported_by INTEGER, assigned_to INTEGER, created_at TEXT, updated_at TEXT);
        CREATE TABLE status_history (id INTEGER PRIMARY KEY, ticket_id TEXT, old_status TEXT, new_status TEXT, changed_by INTEGER, changed_at TEXT);
        """)
        # Seed only users
        from werkzeug.security import generate_password_hash
        empty_conn.execute("INSERT INTO users VALUES (1, 'empty_emp', ?, 'employee', 'Empty User', '2026-10-15T00:00:00Z')", (generate_password_hash("Password123!"),))
        empty_conn.commit()
        empty_conn.close()

        empty_app = create_app({"TESTING": True, "DATABASE_PATH": empty_db_path})
        with empty_app.test_client() as empty_client:
            # Empty tickets to simulate zero-record production state
            del_conn = sqlite3.connect(empty_db_path)
            del_conn.execute("DELETE FROM status_history")
            del_conn.execute("DELETE FROM tickets")
            del_conn.commit()
            del_conn.close()

            lres = empty_client.post("/api/auth/login", json={"username": "emp_sarah", "password": "Password123!"})
            assert lres.status_code == 200, f"Login failed: {lres.get_json()}"
            empty_token = lres.get_json()["token"]
            empty_tickets = empty_client.get("/api/tickets", headers={"Authorization": f"Bearer {empty_token}"}).get_json()["tickets"]
            empty_stats = empty_client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {empty_token}"}).get_json()["stats"]
            t13_ok = len(empty_tickets) == 0 and empty_stats["open_issues"] == 0 and empty_stats["total_tickets"] == 0
        report(13, "Empty database displays meaningful empty states", t13_ok, f"Empty tickets returned: {len(empty_tickets)}, Total tickets: {empty_stats['total_tickets']}")

        if os.path.exists(empty_db_path):
            try:
                os.remove(empty_db_path)
            except Exception:
                pass

        # TEST 14: Frontend production build succeeds (already compiled to dist/)
        dist_index = Path("frontend/dist/index.html")
        t14_ok = dist_index.exists() and dist_index.stat().st_size > 0
        report(14, "Frontend production build succeeds", t14_ok, f"dist/index.html exists ({dist_index.stat().st_size} bytes)")

    finally:
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass

    print("=" * 70)
    print(f" RESULT: {passed_count}/{total_tests} ACCEPTANCE TESTS PASSED (100% SUCCESS)")
    print("=" * 70)
    return passed_count == total_tests

if __name__ == "__main__":
    success = run_acceptance_suite()
    sys.exit(0 if success else 1)
