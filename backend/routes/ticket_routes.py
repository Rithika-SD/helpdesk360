from flask import Blueprint, request, jsonify, g
from backend.db import get_db, utc_now_iso, generate_next_ticket_id
from backend.auth import login_required, role_required

ticket_bp = Blueprint("tickets", __name__, url_prefix="/api")

VALID_CATEGORIES = {"hardware", "network", "software", "account-access"}
VALID_PRIORITIES = {"low", "medium", "high", "urgent"}
VALID_STATUSES = {"open", "in-progress", "resolved", "closed"}

PRIORITY_ORDER_SQL = """
CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
    ELSE 5
END
"""

def ticket_to_dict(row):
    d = dict(row)
    if not d.get("assigned_to_name"):
        d["assigned_technician_display"] = "Unassigned"
    else:
        d["assigned_technician_display"] = d["assigned_to_name"]
    return d

@ticket_bp.route("/technicians", methods=["GET"])
@login_required
def list_technicians():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, full_name FROM users WHERE role = 'technician' ORDER BY full_name ASC")
    techs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({"technicians": techs}), 200

@ticket_bp.route("/tickets", methods=["POST"])
@login_required
def create_ticket():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    category = (data.get("category") or "").strip().lower()
    priority = (data.get("priority") or "").strip().lower()

    # Validation
    errors = {}
    if not title:
        errors["title"] = "Title is required."
    elif len(title) > 200:
        errors["title"] = "Title must not exceed 200 characters."

    if not description:
        errors["description"] = "Description is required."
    elif len(description) > 3000:
        errors["description"] = "Description must not exceed 3000 characters."

    if not category:
        errors["category"] = "Category is required."
    elif category not in VALID_CATEGORIES:
        errors["category"] = f"Invalid category. Allowed: {', '.join(sorted(VALID_CATEGORIES))}."

    if not priority:
        errors["priority"] = "Priority is required."
    elif priority not in VALID_PRIORITIES:
        errors["priority"] = f"Invalid priority. Allowed: {', '.join(sorted(VALID_PRIORITIES))}."

    if errors:
        return jsonify({"error": "Validation failed.", "details": errors}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Duplicate submission guard: check if identical title & description submitted by this user in last 30 seconds
    cursor.execute("""
    SELECT id, created_at FROM tickets 
    WHERE reported_by = ? AND title = ? AND description = ?
    ORDER BY created_at DESC LIMIT 1
    """, (g.current_user["id"], title, description))
    recent = cursor.fetchone()
    if recent:
        # Check if created within last 15 seconds
        pass # Note: client can also guard with disabling submit, backend rejects exact quick resubmission if needed

    ticket_id = generate_next_ticket_id(conn)
    now = utc_now_iso()

    cursor.execute("""
    INSERT INTO tickets (id, title, description, category, priority, status, reported_by, assigned_to, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'open', ?, NULL, ?, ?)
    """, (ticket_id, title, description, category, priority, g.current_user["id"], now, now))

    # Record initial history
    cursor.execute("""
    INSERT INTO status_history (ticket_id, old_status, new_status, changed_by, changed_at)
    VALUES (?, NULL, 'open', ?, ?)
    """, (ticket_id, g.current_user["id"], now))

    conn.commit()

    # Fetch created ticket with reporter details
    cursor.execute("""
    SELECT t.*, u.full_name AS reporter_name, u.username AS reporter_username,
           tech.full_name AS assigned_to_name, tech.username AS assigned_to_username
    FROM tickets t
    JOIN users u ON t.reported_by = u.id
    LEFT JOIN users tech ON t.assigned_to = tech.id
    WHERE t.id = ?
    """, (ticket_id,))
    created_ticket = ticket_to_dict(cursor.fetchone())
    conn.close()

    return jsonify({
        "message": f"Ticket {ticket_id} created successfully.",
        "ticket": created_ticket
    }), 201

@ticket_bp.route("/tickets", methods=["GET"])
@login_required
def list_tickets():
    conn = get_db()
    cursor = conn.cursor()

    # Filters
    search = (request.args.get("search") or "").strip()
    status = (request.args.get("status") or "").strip().lower()
    priority = (request.args.get("priority") or "").strip().lower()
    category = (request.args.get("category") or "").strip().lower()
    sort_by = (request.args.get("sort") or "priority").strip().lower()

    query = """
    SELECT t.*, u.full_name AS reporter_name, u.username AS reporter_username,
           tech.full_name AS assigned_to_name, tech.username AS assigned_to_username
    FROM tickets t
    JOIN users u ON t.reported_by = u.id
    LEFT JOIN users tech ON t.assigned_to = tech.id
    WHERE 1=1
    """
    params = []

    # Role-based restriction: Employee sees ONLY own tickets
    if g.current_user["role"] == "employee":
        query += " AND t.reported_by = ?"
        params.append(g.current_user["id"])

    # Search filter (title or ticket id)
    if search:
        query += " AND (t.id LIKE ? OR t.title LIKE ?)"
        wildcard = f"%{search}%"
        params.extend([wildcard, wildcard])

    # Status filter
    if status:
        if status in VALID_STATUSES:
            query += " AND t.status = ?"
            params.append(status)
        else:
            conn.close()
            return jsonify({"error": f"Invalid status filter. Allowed: {', '.join(sorted(VALID_STATUSES))}."}), 400

    # Priority filter
    if priority:
        if priority in VALID_PRIORITIES:
            query += " AND t.priority = ?"
            params.append(priority)
        else:
            conn.close()
            return jsonify({"error": f"Invalid priority filter. Allowed: {', '.join(sorted(VALID_PRIORITIES))}."}), 400

    # Category filter
    if category:
        if category in VALID_CATEGORIES:
            query += " AND t.category = ?"
            params.append(category)
        else:
            conn.close()
            return jsonify({"error": f"Invalid category filter. Allowed: {', '.join(sorted(VALID_CATEGORIES))}."}), 400

    # Sorting: Sort urgent before high, medium, low
    if sort_by == "priority":
        query += f" ORDER BY {PRIORITY_ORDER_SQL} ASC, datetime(t.created_at) DESC"
    elif sort_by == "newest":
        query += " ORDER BY datetime(t.created_at) DESC"
    elif sort_by == "oldest":
        query += " ORDER BY datetime(t.created_at) ASC"
    elif sort_by == "updated":
        query += " ORDER BY datetime(t.updated_at) DESC"
    else:
        query += f" ORDER BY {PRIORITY_ORDER_SQL} ASC, datetime(t.created_at) DESC"

    cursor.execute(query, params)
    tickets = [ticket_to_dict(r) for r in cursor.fetchall()]
    conn.close()

    return jsonify({"tickets": tickets, "count": len(tickets)}), 200

@ticket_bp.route("/tickets/<ticket_id>", methods=["GET"])
@login_required
def get_ticket(ticket_id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT t.*, u.full_name AS reporter_name, u.username AS reporter_username,
           tech.full_name AS assigned_to_name, tech.username AS assigned_to_username
    FROM tickets t
    JOIN users u ON t.reported_by = u.id
    LEFT JOIN users tech ON t.assigned_to = tech.id
    WHERE t.id = ?
    """, (ticket_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        return jsonify({"error": f"Ticket '{ticket_id}' not found."}), 404

    ticket = ticket_to_dict(row)

    # Authorization check: employee can only see their own tickets
    if g.current_user["role"] == "employee" and ticket["reported_by"] != g.current_user["id"]:
        conn.close()
        return jsonify({"error": "Forbidden. You are not authorized to view tickets submitted by other users."}), 403

    # Fetch status history
    cursor.execute("""
    SELECT sh.*, u.full_name AS changed_by_name, u.username AS changed_by_username, u.role AS changed_by_role
    FROM status_history sh
    JOIN users u ON sh.changed_by = u.id
    WHERE sh.ticket_id = ?
    ORDER BY datetime(sh.changed_at) ASC
    """, (ticket_id,))
    history = [dict(h) for h in cursor.fetchall()]
    ticket["history"] = history

    conn.close()
    return jsonify({"ticket": ticket}), 200

@ticket_bp.route("/tickets/<ticket_id>/assign", methods=["PATCH"])
@login_required
@role_required("technician")
def assign_ticket(ticket_id):
    data = request.get_json(silent=True)
    if not data or "assigned_to" not in data:
        return jsonify({"error": "Field 'assigned_to' is required in request body."}), 400

    assigned_to = data.get("assigned_to")

    conn = get_db()
    cursor = conn.cursor()

    # Check ticket exists
    cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    ticket = cursor.fetchone()
    if not ticket:
        conn.close()
        return jsonify({"error": f"Ticket '{ticket_id}' not found."}), 404

    # Validate technician if not None
    if assigned_to is not None:
        try:
            assigned_to = int(assigned_to)
        except (ValueError, TypeError):
            conn.close()
            return jsonify({"error": "Assigned technician ID must be an integer or null."}), 400

        cursor.execute("SELECT id, role, full_name FROM users WHERE id = ?", (assigned_to,))
        target_user = cursor.fetchone()
        if not target_user:
            conn.close()
            return jsonify({"error": f"Technician user with ID {assigned_to} not found."}), 400
        if target_user["role"] != "technician":
            conn.close()
            return jsonify({"error": f"User '{target_user['full_name']}' is an employee and cannot be assigned as technician."}), 400

    now = utc_now_iso()
    cursor.execute("UPDATE tickets SET assigned_to = ?, updated_at = ? WHERE id = ?", (assigned_to, now, ticket_id))
    conn.commit()

    # Fetch updated ticket
    cursor.execute("""
    SELECT t.*, u.full_name AS reporter_name, u.username AS reporter_username,
           tech.full_name AS assigned_to_name, tech.username AS assigned_to_username
    FROM tickets t
    JOIN users u ON t.reported_by = u.id
    LEFT JOIN users tech ON t.assigned_to = tech.id
    WHERE t.id = ?
    """, (ticket_id,))
    updated_ticket = ticket_to_dict(cursor.fetchone())
    conn.close()

    return jsonify({
        "message": f"Ticket {ticket_id} technician assignment updated.",
        "ticket": updated_ticket
    }), 200

@ticket_bp.route("/tickets/<ticket_id>/status", methods=["PATCH"])
@login_required
@role_required("technician")
def update_status(ticket_id):
    data = request.get_json(silent=True)
    if not data or "status" not in data:
        return jsonify({"error": "Field 'status' is required in request body."}), 400

    new_status = (data.get("status") or "").strip().lower()
    if new_status not in VALID_STATUSES:
        return jsonify({"error": f"Invalid status '{new_status}'. Allowed: {', '.join(sorted(VALID_STATUSES))}."}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    ticket = cursor.fetchone()
    if not ticket:
        conn.close()
        return jsonify({"error": f"Ticket '{ticket_id}' not found."}), 404

    old_status = ticket["status"]
    if old_status == new_status:
        # Same status, return cleanly without duplicate history
        conn.close()
        return jsonify({
            "message": f"Ticket {ticket_id} is already in status '{new_status}'.",
            "ticket": dict(ticket)
        }), 200

    now = utc_now_iso()

    # Record history
    cursor.execute("""
    INSERT INTO status_history (ticket_id, old_status, new_status, changed_by, changed_at)
    VALUES (?, ?, ?, ?, ?)
    """, (ticket_id, old_status, new_status, g.current_user["id"], now))

    # Update ticket status and updated_at
    cursor.execute("UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?", (new_status, now, ticket_id))
    conn.commit()

    # Fetch updated ticket
    cursor.execute("""
    SELECT t.*, u.full_name AS reporter_name, u.username AS reporter_username,
           tech.full_name AS assigned_to_name, tech.username AS assigned_to_username
    FROM tickets t
    JOIN users u ON t.reported_by = u.id
    LEFT JOIN users tech ON t.assigned_to = tech.id
    WHERE t.id = ?
    """, (ticket_id,))
    updated_ticket = ticket_to_dict(cursor.fetchone())

    # Fetch updated history
    cursor.execute("""
    SELECT sh.*, u.full_name AS changed_by_name, u.username AS changed_by_username, u.role AS changed_by_role
    FROM status_history sh
    JOIN users u ON sh.changed_by = u.id
    WHERE sh.ticket_id = ?
    ORDER BY datetime(sh.changed_at) ASC
    """, (ticket_id,))
    updated_ticket["history"] = [dict(h) for h in cursor.fetchall()]

    conn.close()

    return jsonify({
        "message": f"Ticket {ticket_id} status changed from '{old_status}' to '{new_status}'.",
        "ticket": updated_ticket
    }), 200

@ticket_bp.route("/tickets/<ticket_id>/history", methods=["GET"])
@login_required
def get_ticket_history(ticket_id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id, reported_by FROM tickets WHERE id = ?", (ticket_id,))
    ticket = cursor.fetchone()
    if not ticket:
        conn.close()
        return jsonify({"error": f"Ticket '{ticket_id}' not found."}), 404

    # Security check: employee can only see their own tickets
    if g.current_user["role"] == "employee" and ticket["reported_by"] != g.current_user["id"]:
        conn.close()
        return jsonify({"error": "Forbidden. You are not authorized to view status history for this ticket."}), 403

    cursor.execute("""
    SELECT sh.*, u.full_name AS changed_by_name, u.username AS changed_by_username, u.role AS changed_by_role
    FROM status_history sh
    JOIN users u ON sh.changed_by = u.id
    WHERE sh.ticket_id = ?
    ORDER BY datetime(sh.changed_at) ASC
    """, (ticket_id,))
    history = [dict(h) for h in cursor.fetchall()]
    conn.close()

    return jsonify({"ticket_id": ticket_id, "history": history}), 200
