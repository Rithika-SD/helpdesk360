import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from werkzeug.security import generate_password_hash
from backend.config import Config

from flask import has_app_context, current_app

def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()

def get_db(db_path=None):
    if db_path is None:
        if has_app_context() and current_app.config.get("DATABASE_PATH"):
            db_path = current_app.config["DATABASE_PATH"]
        else:
            db_path = Config.DATABASE_PATH
    
    # Ensure parent directory exists
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('employee', 'technician')),
        full_name TEXT NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('hardware', 'network', 'software', 'account-access')),
        priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
        status TEXT NOT NULL CHECK(status IN ('open', 'in-progress', 'resolved', 'closed')),
        reported_by INTEGER NOT NULL,
        assigned_to INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by INTEGER NOT NULL,
        changed_at TEXT NOT NULL,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_reported_by ON tickets(reported_by);
    CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_status_history_ticket_id ON status_history(ticket_id);
    """)

    conn.commit()
    conn.close()

def seed_data(db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()

    # 1. Seed demo users if not present
    demo_users = [
        ("emp_sarah", "Password123!", "employee", "Sarah Connor"),
        ("emp_alex", "Password123!", "employee", "Alex Johnson"),
        ("tech_david", "Password123!", "technician", "David Miller"),
        ("tech_elena", "Password123!", "technician", "Elena Rostova"),
    ]

    for username, password, role, full_name in demo_users:
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        if not row:
            hashed = generate_password_hash(password)
            cursor.execute(
                "INSERT INTO users (username, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, ?)",
                (username, hashed, role, full_name, utc_now_iso())
            )
    conn.commit()

    # Lookup user IDs
    cursor.execute("SELECT id, username FROM users")
    user_map = {row["username"]: row["id"] for row in cursor.fetchall()}

    # 2. Seed sample tickets if tickets table is empty
    cursor.execute("SELECT COUNT(*) AS count FROM tickets")
    if cursor.fetchone()["count"] == 0:
        sample_tickets = [
            (
                "HD-1001",
                "Laptop display flickering and overheating",
                "Dell Latitude 7420 external monitor and built-in screen flicker intermittently under load. Fan makes loud clicking noise.",
                "hardware",
                "high",
                "open",
                user_map["emp_sarah"],
                None,
                "2026-10-15T09:15:00Z",
                "2026-10-15T09:15:00Z",
            ),
            (
                "HD-1002",
                "VPN gateway connection timeout in European region",
                "Unable to establish persistent tunnel to EMEA gateways. Connection drops every 5 minutes during remote sync.",
                "network",
                "urgent",
                "in-progress",
                user_map["emp_sarah"],
                user_map["tech_david"],
                "2026-10-15T10:00:00Z",
                "2026-10-15T10:30:00Z",
            ),
            (
                "HD-1003",
                "Docker Desktop license activation failing",
                "Corporate license key activation throws 403 authorization error after system update to version 4.30.",
                "software",
                "medium",
                "resolved",
                user_map["emp_alex"],
                user_map["tech_elena"],
                "2026-10-14T14:20:00Z",
                "2026-10-15T08:45:00Z",
            ),
            (
                "HD-1004",
                "Requesting read-only access to staging PostgreSQL replica",
                "Need read credentials for analytics reconciliation sprint for Q3 service review.",
                "account-access",
                "low",
                "closed",
                user_map["emp_alex"],
                user_map["tech_david"],
                "2026-10-13T11:00:00Z",
                "2026-10-14T16:00:00Z",
            ),
            (
                "HD-1005",
                "Production badge scanner offline at building 4 entrance",
                "Physical badge reader is unresponsive; LED indicator remains solid red. Employees queued at gate.",
                "hardware",
                "urgent",
                "open",
                user_map["emp_alex"],
                None,
                "2026-10-15T11:30:00Z",
                "2026-10-15T11:30:00Z",
            ),
        ]

        for ticket in sample_tickets:
            cursor.execute("""
            INSERT INTO tickets (id, title, description, category, priority, status, reported_by, assigned_to, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, ticket)

        # Seed initial status history
        histories = [
            ("HD-1001", None, "open", user_map["emp_sarah"], "2026-10-15T09:15:00Z"),
            ("HD-1002", None, "open", user_map["emp_sarah"], "2026-10-15T10:00:00Z"),
            ("HD-1002", "open", "in-progress", user_map["tech_david"], "2026-10-15T10:30:00Z"),
            ("HD-1003", None, "open", user_map["emp_alex"], "2026-10-14T14:20:00Z"),
            ("HD-1003", "open", "in-progress", user_map["tech_elena"], "2026-10-14T15:00:00Z"),
            ("HD-1003", "in-progress", "resolved", user_map["tech_elena"], "2026-10-15T08:45:00Z"),
            ("HD-1004", None, "open", user_map["emp_alex"], "2026-10-13T11:00:00Z"),
            ("HD-1004", "open", "in-progress", user_map["tech_david"], "2026-10-13T13:00:00Z"),
            ("HD-1004", "in-progress", "resolved", user_map["tech_david"], "2026-10-14T15:00:00Z"),
            ("HD-1004", "resolved", "closed", user_map["tech_david"], "2026-10-14T16:00:00Z"),
            ("HD-1005", None, "open", user_map["emp_alex"], "2026-10-15T11:30:00Z"),
        ]

        for h in histories:
            cursor.execute("""
            INSERT INTO status_history (ticket_id, old_status, new_status, changed_by, changed_at)
            VALUES (?, ?, ?, ?, ?)
            """, h)

        conn.commit()

    conn.close()

def generate_next_ticket_id(conn):
    """Generates next ticket id like HD-1006 by finding highest existing HD-xxxx number."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM tickets WHERE id LIKE 'HD-%'")
    rows = cursor.fetchall()
    highest = 1000
    for r in rows:
        ticket_id = r["id"]
        try:
            num = int(ticket_id.split("-")[1])
            if num > highest:
                highest = num
        except (IndexError, ValueError):
            pass
    return f"HD-{highest + 1}"
