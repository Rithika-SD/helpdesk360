from flask import Blueprint, jsonify, g
from backend.db import get_db
from backend.auth import login_required

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

@dashboard_bp.route("/stats", methods=["GET"])
@login_required
def get_stats():
    conn = get_db()
    cursor = conn.cursor()

    # 1. Real database-derived statistics per exact specifications:
    # - Open issues: tickets whose status is open or in-progress
    cursor.execute("SELECT COUNT(*) AS count FROM tickets WHERE status IN ('open', 'in-progress')")
    open_issues = cursor.fetchone()["count"]

    # - Urgent requests: unresolved tickets with urgent priority
    cursor.execute("SELECT COUNT(*) AS count FROM tickets WHERE priority = 'urgent' AND status NOT IN ('resolved', 'closed')")
    urgent_requests = cursor.fetchone()["count"]

    # - Assigned tickets: tickets with a valid assigned technician that are not closed
    cursor.execute("SELECT COUNT(*) AS count FROM tickets WHERE assigned_to IS NOT NULL AND status != 'closed'")
    assigned_tickets = cursor.fetchone()["count"]

    # - Completed work: tickets with resolved or closed status
    cursor.execute("SELECT COUNT(*) AS count FROM tickets WHERE status IN ('resolved', 'closed')")
    completed_work = cursor.fetchone()["count"]

    # Total ticket count
    cursor.execute("SELECT COUNT(*) AS count FROM tickets")
    total_tickets = cursor.fetchone()["count"]

    # Category breakdown
    cursor.execute("""
    SELECT category, COUNT(*) as count 
    FROM tickets 
    GROUP BY category
    """)
    category_counts = {row["category"]: row["count"] for row in cursor.fetchall()}
    # Ensure all four categories exist in map
    for cat in ["hardware", "network", "software", "account-access"]:
        category_counts.setdefault(cat, 0)

    # Priority breakdown
    cursor.execute("""
    SELECT priority, COUNT(*) as count 
    FROM tickets 
    GROUP BY priority
    """)
    priority_counts = {row["priority"]: row["count"] for row in cursor.fetchall()}
    for prio in ["low", "medium", "high", "urgent"]:
        priority_counts.setdefault(prio, 0)

    # Status breakdown
    cursor.execute("""
    SELECT status, COUNT(*) as count 
    FROM tickets 
    GROUP BY status
    """)
    status_counts = {row["status"]: row["count"] for row in cursor.fetchall()}
    for stat in ["open", "in-progress", "resolved", "closed"]:
        status_counts.setdefault(stat, 0)

    # Employee-specific metrics if current user is an employee
    my_stats = None
    if g.current_user["role"] == "employee":
        user_id = g.current_user["id"]
        cursor.execute("SELECT COUNT(*) AS count FROM tickets WHERE reported_by = ?", (user_id,))
        my_total = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) AS count FROM tickets WHERE reported_by = ? AND status IN ('open', 'in-progress')", (user_id,))
        my_open = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) AS count FROM tickets WHERE reported_by = ? AND status IN ('resolved', 'closed')", (user_id,))
        my_completed = cursor.fetchone()["count"]

        my_stats = {
            "total": my_total,
            "open": my_open,
            "completed": my_completed
        }

    # Recent activity log (up to 8 events)
    cursor.execute("""
    SELECT sh.id, sh.ticket_id, sh.old_status, sh.new_status, sh.changed_at,
           t.title AS ticket_title,
           u.full_name AS changed_by_name, u.role AS changed_by_role
    FROM status_history sh
    JOIN tickets t ON sh.ticket_id = t.id
    JOIN users u ON sh.changed_by = u.id
    ORDER BY datetime(sh.changed_at) DESC
    LIMIT 8
    """)
    recent_activity = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return jsonify({
        "stats": {
            "open_issues": open_issues,
            "urgent_requests": urgent_requests,
            "assigned_tickets": assigned_tickets,
            "completed_work": completed_work,
            "total_tickets": total_tickets,
            "category_counts": category_counts,
            "priority_counts": priority_counts,
            "status_counts": status_counts,
            "my_stats": my_stats
        },
        "recent_activity": recent_activity
    }), 200
