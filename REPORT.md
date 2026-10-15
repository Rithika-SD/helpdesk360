# HelpDesk 360 • System Architecture & Verification Report

## 1. Problem Statement

In fast-paced enterprise environments, IT support requests frequently become bottlenecked or lost when managed across unstructured communication channels such as email and instant messaging. Common problems include:
- Lack of centralized visibility into incident volume, urgency, and resolution progress.
- Absence of role-based separation: employees either cannot track their issue status or possess unintended administrative power over tickets.
- Missing accountability: changes to ticket states lack timestamps and audit logs of which technician took action.
- Ephemeral storage: prototype systems rely on in-memory collections or localStorage that lose state upon server restart.

**HelpDesk 360** was engineered to solve these operational deficiencies within the constraints of a 3-hour hackathon, delivering a production-grade, persistent, full-stack IT service management platform.

---

## 2. Solution Overview

HelpDesk 360 provides a cohesive SaaS platform with tailored role experiences:
1. **Employees** submit issues through a validated form, track their reported incidents in real time, view assigned technicians, and inspect the chronological status transition history.
2. **Technicians** monitor a prioritized queue (urgent requests sorted first), search and filter across categories and statuses, assign or reassign tickets to verified technicians, and transition ticket lifecycle states.
3. **Operations Summary Dashboard** calculates live metrics directly from SQLite database queries (Open Issues, Urgent Requests, Assigned Tickets, Completed Work) alongside category and priority distribution breakdowns.
4. **Auditability**: Every status update writes an immutable entry into the `status_history` table with UTC timestamps and user attribution.

---

## 3. System Architecture

The application adopts a decoupled client-server architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Tier                           │
│  React 19 + Vite 6 + Tailwind CSS + Lucide Icons           │
│  - AuthContext (JWT session persistence)                   │
│  - ToastContext (non-blocking notification system)         │
│  - Dynamic Role-Based Views (Employee / Technician)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
               JSON over HTTPS │ Bearer Token Auth
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Tier                        │
│  Python 3.12 + Flask REST API                              │
│  - werkzeug.security (PBKDF2 Password Hashing)             │
│  - PyJWT (Token Generation & Validation)                   │
│  - Route Blueprints: Auth, Tickets, Dashboard              │
│  - Strict Backend Role Guard Decorators                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                Parameterized  │ PRAGMA foreign_keys = ON
                SQL Execution  │ ACID Transactions
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Tier                             │
│  SQLite3 Local Persistent Database (`backend/helpdesk.db`) │
│  - users: Credentials & roles                              │
│  - tickets: Core incident records                           │
│  - status_history: Immutable transition audit log           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Database Design & Schema

The persistent SQLite schema enforces referential integrity through foreign key constraints (`PRAGMA foreign_keys = ON;`) and stores all dates in ISO-8601 UTC format.

### 4.1. Table: `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique user identifier |
| `username` | TEXT | UNIQUE NOT NULL COLLATE NOCASE | System login name |
| `password_hash` | TEXT | NOT NULL | Secure Werkzeug PBKDF2-SHA256 hash |
| `role` | TEXT | NOT NULL CHECK(role IN ('employee', 'technician')) | Role discriminator |
| `full_name` | TEXT | NOT NULL | Display name |
| `created_at` | TEXT | NOT NULL | ISO-8601 UTC creation timestamp |

### 4.2. Table: `tickets`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Formatted ID (`HD-1001`, `HD-1002`, etc.) |
| `title` | TEXT | NOT NULL | Brief summary (max 200 chars) |
| `description` | TEXT | NOT NULL | Detailed problem description (max 3000 chars) |
| `category` | TEXT | NOT NULL CHECK(category IN ('hardware', 'network', 'software', 'account-access')) | Issue category |
| `priority` | TEXT | NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'urgent')) | Urgency level |
| `status` | TEXT | NOT NULL CHECK(status IN ('open', 'in-progress', 'resolved', 'closed')) | Lifecycle status |
| `reported_by` | INTEGER | NOT NULL REFERENCES users(id) ON DELETE RESTRICT | Creator user ID |
| `assigned_to` | INTEGER | REFERENCES users(id) ON DELETE SET NULL | Assigned technician ID (nullable) |
| `created_at` | TEXT | NOT NULL | ISO-8601 UTC timestamp |
| `updated_at` | TEXT | NOT NULL | ISO-8601 UTC timestamp |

### 4.3. Table: `status_history`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique history record ID |
| `ticket_id` | TEXT | NOT NULL REFERENCES tickets(id) ON DELETE CASCADE | Associated ticket |
| `old_status` | TEXT | NULLABLE | Previous status (NULL for initial creation) |
| `new_status` | TEXT | NOT NULL | New status value |
| `changed_by` | INTEGER | NOT NULL REFERENCES users(id) ON DELETE RESTRICT | Actor who initiated change |
| `changed_at` | TEXT | NOT NULL | ISO-8601 UTC change timestamp |

---

## 5. Business Logic & Governance Rules

### 5.1. Ticket Submission Rules
- **Fields**: Title (required), Description (required), Category (required), Priority (required).
- **Allowed Categories**: Exactly `hardware`, `network`, `software`, `account-access`.
- **Allowed Priorities**: Exactly `low`, `medium`, `high`, `urgent`.
- **Initial Status**: Always initializes to `open`.
- **Duplicate Guard**: Client disables submit button during request flight; server validates field lengths and ensures ticket IDs increment monotonically (`HD-1001` -> `HD-1002`).

### 5.2. Priority & Sorting Rules
- Technicians view tickets sorted with **Urgent** priority at the head of the queue, followed by High, Medium, and Low.
- SQL Sorting expression:
  ```sql
  ORDER BY CASE priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
  END ASC, datetime(created_at) DESC
  ```

### 5.3. Assignment Rules
- Only users with role `technician` can assign or reassign tickets.
- The target assignee must exist in the `users` table and possess `role == 'technician'`. Attempting to assign an employee returns `HTTP 400 Bad Request`.
- Tickets may be set to `Unassigned` by submitting `null`.

### 5.4. Status Transition & History Rules
- Only technicians can alter ticket statuses.
- Allowed values: `open`, `in-progress`, `resolved`, `closed`.
- Every transition updates `tickets.updated_at` and appends a row to `status_history`.

### 5.5. Dashboard Metric Definitions
1. **Open Issues**: `COUNT(*) WHERE status IN ('open', 'in-progress')`
2. **Urgent Requests**: `COUNT(*) WHERE priority = 'urgent' AND status NOT IN ('resolved', 'closed')`
3. **Assigned Tickets**: `COUNT(*) WHERE assigned_to IS NOT NULL AND status != 'closed'`
4. **Completed Work**: `COUNT(*) WHERE status IN ('resolved', 'closed')`

---

## 6. Security and Role-Based Authorization

1. **Backend Enforced**: Authorization checks are executed at the route handler level using `@login_required` and `@role_required('technician')`.
2. **Data Isolation**: When an employee queries `GET /api/tickets`, the query appends `WHERE reported_by = ?`.
3. **Horizontal Access Protection**: If an employee requests `GET /api/tickets/{id}` for a ticket reported by another user, the server rejects the request with `403 Forbidden`.
4. **SQL Injection Prevention**: All queries utilize parameterized SQLite bindings.
5. **Session Security**: Stateless JWT tokens signed with HMAC-SHA256 expire after 24 hours.

---

## 7. Actual Test Scenarios and Observed Results

All test scenarios were executed programmatically against live SQLite databases via `pytest` and the end-to-end acceptance suite (`test_e2e_acceptance.py`).

| Scenario # | Scenario Description | Inputs / Action | Expected Result | Observed Result | Verdict |
|---|---|---|---|---|---|
| **Scenario 1** | Authentication with valid & invalid credentials | POST `/api/auth/login` with `emp_sarah` / `Password123!` and `emp_sarah` / `WrongPassword` | Valid credentials return HTTP 200 + JWT; invalid credentials return HTTP 401 | HTTP 200 + valid JWT received; HTTP 401 with `"Invalid username or password"` on wrong password | **PASSED** |
| **Scenario 2** | Ticket creation & duplicate/input validation | POST `/api/tickets` with empty title and invalid category `gaming` | HTTP 400 with structured validation errors | HTTP 400 returned: `{"category": "Invalid category...", "title": "Title is required."}` | **PASSED** |
| **Scenario 3** | Employee data isolation | `emp_alex` attempts to access Sarah's ticket `GET /api/tickets/HD-1001` | HTTP 403 Forbidden returned | HTTP 403 returned with `"Forbidden. You are not authorized to view tickets submitted by other users."` | **PASSED** |
| **Scenario 4** | Technician ticket assignment | `tech_david` patches HD-1001 to assign `tech_elena` (ID 4) | Assigned technician updates to Elena Rostova | HTTP 200 returned; DB updated; employee view displays `assigned_technician_display: "Elena Rostova"` | **PASSED** |
| **Scenario 5** | Status change and history audit tracking | `tech_david` transitions HD-1001 from `open` to `in-progress` | Ticket status updates; `status_history` logs transition with actor & UTC time | HTTP 200 returned; history contains `old_status: "open"`, `new_status: "in-progress"`, `changed_by: 3` | **PASSED** |
| **Scenario 6** | Role enforcement on administrative actions | `emp_sarah` attempts direct API call `PATCH /api/tickets/HD-1001/status` | Rejected with HTTP 403 Forbidden | HTTP 403 returned with `"Forbidden. Role 'employee' does not have permission..."` | **PASSED** |
| **Scenario 7** | SQLite persistence across full server restart | Create ticket `HD-1006`, assign technician, change status, restart app with same DB file | Ticket, assignment, and status history survive completely intact | Restored ticket `HD-1006` found with status `in-progress`, assignee Elena, and 2 history events | **PASSED** |
| **Scenario 8** | Dashboard query accuracy | Query `GET /api/dashboard/stats` and cross-reference direct SQL count queries | API numbers match raw database records exactly | API matches DB: Open Issues (4), Urgent (3), Assigned (3), Completed (2) | **PASSED** |

---

## 8. Limitations

1. **Stateless JWT Blacklisting**: In this hackathon release, logout clears client storage; immediate server-side revocation would require an in-memory or database token denylist.
2. **File Attachments**: Tickets currently support rich textual descriptions and error logs. Binary screenshot uploads were omitted to keep dependencies minimal without requiring cloud object storage (S3/GCS).
3. **Real-time WebSockets**: Dashboard metrics and queues refresh on user actions and on-demand via the "Refresh" button rather than over WebSockets or Server-Sent Events.

---

## 9. Future Improvements

1. **File & Log Attachments**: Add multipart/form-data upload support to store error logs and screenshots locally or on object storage.
2. **Live Push Notifications**: Implement Server-Sent Events (SSE) to notify employees instantly when a technician updates their ticket.
3. **SLA & Escalation Rules**: Automatically escalate high/urgent tickets that remain unassigned for over 2 hours.
4. **Email & Webhook Integration**: Trigger Slack/Teams webhook alerts on critical infrastructure outages.
