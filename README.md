# HelpDesk 360 • Enterprise IT Incident & Service Platform

HelpDesk 360 is a full-stack, enterprise-grade IT HelpDesk and incident management web application. Built for rapid triage and tracking during a 3-hour hackathon, HelpDesk 360 enables employees to submit IT tickets, while technicians prioritize, assign, and resolve tickets across an audited lifecycle.

---

## 🚀 Key Features

- **Role-Based Workflows**:
  - **Employee**: Create IT support tickets, track ticket status, view personal ticket history, and access status timeline. Strict security prevents employees from viewing or tampering with peers' tickets.
  - **Technician**: Access global queue, search tickets, filter by status/priority/category, sort by urgency (urgent-first), assign or reassign technicians, and transition ticket statuses with recorded audit history.
- **Accurate Real-Time Dashboard**:
  - Live, database-derived metrics for **Open Issues**, **Urgent Requests**, **Assigned Tickets**, and **Completed Work**.
  - Dynamic category and priority distribution breakdowns.
  - Real-time audit log of recent status changes.
- **Strict Ticket Lifecyle & Validation**:
  - Categories: `hardware`, `network`, `software`, `account-access`.
  - Priorities: `low`, `medium`, `high`, `urgent`.
  - Allowed Statuses: `open`, `in-progress`, `resolved`, `closed`.
  - Duplicate submission guard and server-side validation.
- **Audited Status History**:
  - Every status transition is immutably logged into `status_history` with the timestamp in UTC and the actor's identity.
- **Persistent Local Database**:
  - SQLite database persists on disk (`backend/helpdesk.db`) across server reboots.

---

## 🛠️ Architecture & Tech Stack

```
                          ┌───────────────────────────┐
                          │   React 19 + Vite 6 UI   │
                          │   (Tailwind CSS + Lucide) │
                          └─────────────┬─────────────┘
                                        │
                         HTTP REST API  │ Bearer JWT Auth
                                        ▼
                          ┌───────────────────────────┐
                          │   Flask RESTful Backend   │
                          │   (Python 3.12 + PyJWT)   │
                          └─────────────┬─────────────┘
                                        │
                               SQL      │ PRAGMA foreign_keys = ON
                                        ▼
                          ┌───────────────────────────┐
                          │    Persistent SQLite DB   │
                          │   (users, tickets,        │
                          │    status_history)        │
                          └───────────────────────────┘
```

- **Frontend**: React, Vite, Tailwind CSS, Lucide React icons.
- **Backend**: Python 3 Flask REST API with Flask-CORS, Werkzeug security password hashing, and PyJWT authentication.
- **Database**: SQLite3 with foreign key enforcement and UTC ISO-8601 timestamps.

---

## 📋 Prerequisites

- **Python**: 3.10+ (tested on Python 3.12)
- **Node.js**: v18+ (tested on Node.js v24)
- **npm**: 9+

---

## ⚡ Quick Start & Installation

### 1. Clone & Set Up Backend

```powershell
# Navigate to workspace root
cd "c:\Users\RITHIKA\Documents\RAALE AT 12\HELPDESK"

# Create Python virtual environment
python -m venv backend/venv

# Activate virtual environment
# Windows PowerShell:
.\backend\venv\Scripts\Activate.ps1
# Or Command Prompt:
# backend\venv\Scripts\activate.bat

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Set Up Frontend

```powershell
cd frontend
npm install
```

---

## 🏃 Running the Application

### Start Backend API Server (Port 5000)

```powershell
# From project root:
backend\venv\Scripts\python.exe -m backend.app
# Backend runs at: http://127.0.0.1:5000
```

### Start Frontend Dev Server (Port 5173)

```powershell
# In a separate terminal, from the frontend directory:
cd frontend
npm run dev
# Frontend runs at: http://localhost:5173
```

Open your browser at **http://localhost:5173**.

---

## 👤 Seeded Demo Credentials

HelpDesk 360 automatically seeds sample users and tickets upon initial start. You can also click the **1-Click Test** buttons on the Login page to instantly authenticate.

| Username | Password | Role | Full Name | Primary Responsibilities |
|---|---|---|---|---|
| `tech_david` | `Password123!` | Technician | David Miller | Lead Support Engineer |
| `tech_elena` | `Password123!` | Technician | Elena Rostova | Infrastructure Specialist |
| `emp_sarah` | `Password123!` | Employee | Sarah Connor | Staff (Hardware & Network requests) |
| `emp_alex` | `Password123!` | Employee | Alex Johnson | Staff (Software & Account requests) |

---

## 🧪 Testing

### Run Backend Unit & Integration Tests (16 Tests)

```powershell
backend\venv\Scripts\pytest.exe backend\tests -v
```

### Run Mandatory E2E Acceptance Verification (14 Tests)

```powershell
backend\venv\Scripts\python.exe test_e2e_acceptance.py
```

### Run Frontend Production Build

```powershell
cd frontend
npm run build
```

---

## 🛡️ Security & Role Restrictions

- **Password Hashing**: Stored using PBKDF2 with SHA-256 via Werkzeug.
- **JWT Authorization**: Enforced on every API request. Tokens include expiration, user ID, username, and role.
- **Tenant Isolation**: Employees can strictly only read and query tickets where `reported_by == current_user.id`. Direct query manipulation or ID guessing responds with `403 Forbidden`.
- **Administrative Endpoints**: Route decorators (`@role_required('technician')`) strictly prevent employee users from assigning technicians or transitioning status.
- **Parameterized SQL**: All SQLite database queries use parameterized placeholders (`?`) to prevent SQL injection.

---

## 📂 Project Structure

```
HELPDESK/
├── backend/
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth_routes.py         # Login, logout, current user
│   │   ├── ticket_routes.py       # Create, list, assign, status update, history
│   │   └── dashboard_routes.py    # Database-derived stats and activity feed
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_api.py            # 16 Pytest test cases
│   ├── __init__.py
│   ├── app.py                     # Flask application factory
│   ├── auth.py                    # JWT helpers & security decorators
│   ├── config.py                  # Environment config
│   ├── db.py                      # SQLite connection, schema & seeding
│   ├── helpdesk.db                # SQLite database file (created on start)
│   └── requirements.txt           # Minimal, stable dependencies
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js          # Configurable API client with auth interceptor
│   │   ├── components/
│   │   │   ├── CategoryBadge.jsx
│   │   │   ├── ConfirmationModal.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── PriorityBadge.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── TicketDetailsModal.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx    # Auth state & session persistence
│   │   │   └── ToastContext.jsx   # Feedback toasts
│   │   ├── pages/
│   │   │   ├── DashboardView.jsx  # DB-derived analytics & activity
│   │   │   ├── EmployeeView.jsx   # Ticket submission & My Tickets
│   │   │   ├── LoginPage.jsx      # Auth UI with 1-click test buttons
│   │   │   └── TechnicianView.jsx # Queue, triage, assign & status change
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── .env.example
├── .gitignore
├── README.md
├── REPORT.md
└── test_e2e_acceptance.py
```

---

## 🔧 Troubleshooting

1. **PowerShell execution policy blocks `npm`**:
   Run using `cmd.exe /c "npm run dev"` or `npm.cmd run dev`.
2. **CORS Errors**:
   The backend enables CORS for all origins by default in development. Configure `CORS_ORIGINS` in `.env` if targeting custom ports.
3. **Database Reset**:
   To re-initialize the sample database to default seed state, delete `backend/helpdesk.db` and restart the backend.
