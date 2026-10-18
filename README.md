# Zenith '26 — College Fest Management System ⚡

A full-stack, production-grade College Fest Management application built as a vibe-coding capstone project for **PM2-01 (How Software Works)** and **PM2-02 (Front-End, Back-End & Mobile)**.

The system features an energetic student-facing event registration portal alongside a real-time admin operations dashboard, built upon a decoupled client-server architecture with SQLite persistence.

---

## 🏛️ System Architecture & Tech Stack

| Layer | Technology | Role & Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML5, Tailwind CSS (Play CDN), Vanilla JavaScript | Responsive cards, category filter pills, instant search, accessible registration modal, admin utilization data tables, and live state feedback. |
| **Backend** | Python 3, FastAPI, Uvicorn, Pydantic | RESTful API service, business validation rules, capacity enforcement, live metric aggregation, and static asset serving. |
| **Database** | SQLite3 (`fest.db`) | Local ACID relational storage with foreign key constraints, `UNIQUE(event_id, email)` deduplication, and zero stale counters. |
| **Seed Data** | `openpyxl`, `data/events_seed.xlsx` | 14 curated fest events pre-loaded automatically on startup from a spreadsheet. |
| **API Testing** | Postman | End-to-end contract testing with 18 automated requests covering status codes `200`, `201`, `400`, `404`, and `409`. |

---

## 🚀 Quick Start Guide

### 1. Clone / Navigate to Project Directory
```bash
cd zenith26-fest-system
```

### 2. Set Up Virtual Environment & Install Dependencies
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate

# Install required packages
pip install -r requirements.txt
```

### 3. Run the Application
```bash
uvicorn backend.main:app --reload
```

The application starts immediately on port 9000. On initial boot, the database schema is created and all 14 events are seeded from `data/events_seed.xlsx`.

---

## 🌐 Application URLs

- **Student Event Portal**: [http://localhost:9000/](http://localhost:9000/)
- **Admin Operations Dashboard**: [http://localhost:9000/admin.html](http://localhost:9000/admin.html)
- **Interactive Swagger API Docs**: [http://localhost:9000/docs](http://localhost:9000/docs)
- **Alternative Redoc API Documentation**: [http://localhost:9000/redoc](http://localhost:9000/redoc)

---

## 📡 API Contract Specification

All endpoints follow strict REST conventions:

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | List all events with live `available_seats`. Supports `?category=` and `?search=`. | `200 OK` |
| `GET` | `/api/events/{event_id}` | Detailed event information by ID with available seats. | `200 OK`, `404 Not Found` |
| `POST` | `/api/events/{event_id}/register` | Registers a student. Validates required fields, email format, capacity, and duplicate registrations. | `201 Created`, `400 Bad Request`, `404 Not Found`, `409 Conflict` |
| `GET` | `/api/registrations` | Fetch registrations joined with `event_title`. Supports `?event_id=`. | `200 OK` |
| `GET` | `/api/stats` | Aggregated dashboard statistics computed live from the database. | `200 OK` |
| `POST` | `/api/events` | *(Stretch)* Admin adds a new event to the fest calendar. | `201 Created`, `400 Bad Request` |
| `DELETE` | `/api/registrations/{id}` | *(Stretch)* Admin cancels a registration and frees the reserved seat. | `200 OK`, `404 Not Found` |

---

## 🛡️ "Never Trust the Client": Server-Side Validation Discipline

As highlighted in **PM2-01 & PM2-02**, while the frontend provides immediate visual feedback (disabling buttons, checking missing fields, regex checking), the server enforces validation independently:
1. **Event Existence**: Returns `404 Not Found` if `event_id` does not exist in SQLite.
2. **Field Presence**: Rejects missing or whitespace-only names, roll numbers, or emails with `400 Bad Request`.
3. **Email Structure**: Verifies that the email contains `@` with a domain; returns `400 Bad Request` if invalid.
4. **Capacity Protection**: Checks live registrations count against total event capacity; returns `409 Conflict ("Event is full")` if fully booked.
5. **Duplicate Prevention**: Queries the database for existing `(event_id, email)` tuples; returns `409 Conflict ("Already registered for this event")` upon re-attempt.

---

## 🧪 Postman API Testing

1. Import `zenith26-api.postman_collection.json` into Postman.
2. Verify that `baseUrl` is set to `http://localhost:9000`.
3. Refer to `Postman-Testing-Commands-Zenith26.md` for the full 18-request testing procedure.

---

## 📂 Project Directory Structure

```text
zenith26-fest-system/
├── backend/
│   ├── main.py                          # FastAPI application, route handlers & static file mounting
│   ├── database.py                      # SQLite connection helper & schema creation
│   ├── models.py                        # Pydantic schemas (EventOut, RegistrationIn, StatsOut, etc.)
│   └── seed_data.py                     # Excel data loader reading data/events_seed.xlsx
├── frontend/
│   ├── index.html                       # Student event portal & registration modal
│   ├── admin.html                       # Admin operations & utilization dashboard
│   └── js/
│       ├── app.js                       # Student portal UI logic, debounced search, API registration
│       └── admin.js                     # Admin dashboard UI logic, live charts, roster & event actions
├── data/
│   └── events_seed.xlsx                 # Companion Excel spreadsheet containing 14 seed events
├── requirements.txt                     # Python package dependencies
├── README.md                            # Comprehensive project guide and reference
├── zenith26-api.postman_collection.json # Exported Postman collection for contract testing
└── Postman-Testing-Commands-Zenith26.md # 18-step testing command reference guide
```
