import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Support local imports
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.database import get_db_connection, init_db
from backend.models import (
    EventCreate,
    EventDetail,
    EventOut,
    RegistrationDetailOut,
    RegistrationIn,
    RegistrationOut,
    StatsOut,
)
from backend.seed_data import seed_events

FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title="Zenith '26 Fest Management System API",
    description="API for the Zenith '26 College Fest Management System",
    version="1.0.0",
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """Initializes the database and seeds initial events from events_seed.xlsx on startup."""
    init_db()
    seed_events()

# ==========================================
# API Endpoints
# ==========================================

@app.get("/api/events", response_model=List[EventOut], tags=["Events"])
def get_events(
    category: Optional[str] = Query(None, description="Filter by event category"),
    search: Optional[str] = Query(None, description="Search in event title (case-insensitive)"),
):
    """
    List events with computed live available_seats.
    Supports optional category filtering and title search.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT e.*, 
               COALESCE(r.reg_count, 0) AS registration_count
        FROM events e
        LEFT JOIN (
            SELECT event_id, COUNT(*) AS reg_count
            FROM registrations
            GROUP BY event_id
        ) r ON e.id = r.event_id
        WHERE 1=1
    """
    params = []

    if category and category.strip().lower() != "all":
        query += " AND LOWER(e.category) = LOWER(?)"
        params.append(category.strip())

    if search and search.strip():
        query += " AND LOWER(e.title) LIKE LOWER(?)"
        params.append(f"%{search.strip()}%")

    query += " ORDER BY e.id ASC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    events = []
    for row in rows:
        reg_count = row["registration_count"]
        capacity = row["capacity"]
        available_seats = max(0, capacity - reg_count)
        events.append(
            EventOut(
                id=row["id"],
                title=row["title"],
                category=row["category"],
                description=row["description"],
                event_date=row["event_date"],
                event_time=row["event_time"],
                venue=row["venue"],
                capacity=capacity,
                fee=row["fee"],
                icon=row["icon"],
                available_seats=available_seats,
            )
        )
    return events


@app.get("/api/events/{event_id}", response_model=EventDetail, tags=["Events"])
def get_event(event_id: int):
    """
    Get detailed information for a single event by ID, including live available_seats.
    Returns 404 if the event does not exist.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT e.*, 
               COALESCE(r.reg_count, 0) AS registration_count
        FROM events e
        LEFT JOIN (
            SELECT event_id, COUNT(*) AS reg_count
            FROM registrations
            GROUP BY event_id
        ) r ON e.id = r.event_id
        WHERE e.id = ?
    """, (event_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found."
        )

    reg_count = row["registration_count"]
    capacity = row["capacity"]
    available_seats = max(0, capacity - reg_count)

    return EventDetail(
        id=row["id"],
        title=row["title"],
        category=row["category"],
        description=row["description"],
        event_date=row["event_date"],
        event_time=row["event_time"],
        venue=row["venue"],
        capacity=capacity,
        fee=row["fee"],
        icon=row["icon"],
        available_seats=available_seats,
    )


@app.post(
    "/api/events/{event_id}/register",
    response_model=RegistrationOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Registrations"]
)
def register_for_event(event_id: int, registration: RegistrationIn):
    """
    Registers a student for an event with rigorous server-side validation:
    - Event must exist (404)
    - Name, roll number, email must not be empty (400)
    - Email must contain '@' (400)
    - Event must not be at capacity (409)
    - Student email must not already be registered for this event (409)
    """
    # 1. Clean input
    student_name = registration.student_name.strip() if registration.student_name else ""
    roll_number = registration.roll_number.strip() if registration.roll_number else ""
    email = registration.email.strip().lower() if registration.email else ""
    phone = registration.phone.strip() if registration.phone else None

    # 2. Server-side field presence validation
    if not student_name or not roll_number or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student name, roll number, and email are required."
        )

    # 3. Email format validation
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address. Email must contain '@' with domain."
        )

    conn = get_db_connection()
    cursor = conn.cursor()

    # 4. Event existence check
    cursor.execute("SELECT id, title, capacity FROM events WHERE id = ?", (event_id,))
    event_row = cursor.fetchone()
    if not event_row:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found."
        )

    capacity = event_row["capacity"]

    # 5. Check duplicate registration
    cursor.execute(
        "SELECT id FROM registrations WHERE event_id = ? AND LOWER(email) = ?",
        (event_id, email)
    )
    duplicate_row = cursor.fetchone()
    if duplicate_row:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already registered for this event."
        )

    # 6. Check capacity
    cursor.execute("SELECT COUNT(*) AS count FROM registrations WHERE event_id = ?", (event_id,))
    current_reg_count = cursor.fetchone()["count"]
    if current_reg_count >= capacity:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event is full."
        )

    # 7. Insert registration
    registered_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO registrations (event_id, student_name, roll_number, email, phone, registered_at)
        VALUES (?, ?, ?, ?, ?, ?);
    """, (event_id, student_name, roll_number, email, phone, registered_at))
    reg_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return RegistrationOut(
        id=reg_id,
        event_id=event_id,
        student_name=student_name,
        registered_at=registered_at,
    )


@app.get("/api/registrations", response_model=List[RegistrationDetailOut], tags=["Registrations"])
def get_registrations(event_id: Optional[int] = Query(None, description="Filter by event ID")):
    """
    Get all registrations, joined with event title so admin dashboard doesn't need second lookup.
    Supports optional filtering by event_id.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT r.id, r.event_id, r.student_name, r.roll_number, r.email, r.phone, r.registered_at,
               e.title AS event_title
        FROM registrations r
        JOIN events e ON r.event_id = e.id
    """
    params = []
    if event_id is not None:
        query += " WHERE r.event_id = ?"
        params.append(event_id)

    query += " ORDER BY r.registered_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    registrations = []
    for r in rows:
        registrations.append(
            RegistrationDetailOut(
                id=r["id"],
                event_id=r["event_id"],
                student_name=r["student_name"],
                roll_number=r["roll_number"],
                email=r["email"],
                phone=r["phone"],
                registered_at=r["registered_at"],
                event_title=r["event_title"],
            )
        )
    return registrations


@app.get("/api/stats", response_model=StatsOut, tags=["Stats"])
def get_stats():
    """
    Returns live statistics computed on demand from the database:
    - total_events
    - total_registrations
    - total_capacity
    - overall_utilization_pct (rounded to 1 decimal)
    - upcoming_events_count (events with event_date today or later)
    - events_by_category (dict of category -> count)
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, category, event_date, capacity FROM events;")
    events = cursor.fetchall()

    cursor.execute("SELECT COUNT(*) AS count FROM registrations;")
    total_registrations = cursor.fetchone()["count"]

    conn.close()

    total_events = len(events)
    total_capacity = sum(e["capacity"] for e in events)

    today_str = datetime.now().strftime("%Y-%m-%d")
    upcoming_events_count = sum(1 for e in events if e["event_date"] >= today_str)

    events_by_category = {}
    for e in events:
        cat = e["category"]
        events_by_category[cat] = events_by_category.get(cat, 0) + 1

    overall_utilization_pct = 0.0
    if total_capacity > 0:
        overall_utilization_pct = round((total_registrations / total_capacity) * 100, 1)

    return StatsOut(
        total_events=total_events,
        total_registrations=total_registrations,
        total_capacity=total_capacity,
        overall_utilization_pct=overall_utilization_pct,
        upcoming_events_count=upcoming_events_count,
        events_by_category=events_by_category,
    )


# ==========================================
# Stretch Endpoints
# ==========================================

@app.post(
    "/api/events",
    response_model=EventOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Admin - Stretch"]
)
def create_event(event_in: EventCreate):
    """
    Stretch Goal 1: Lets the admin add a new event with rigorous server-side validation.
    """
    title = event_in.title.strip()
    category = event_in.category.strip()
    description = event_in.description.strip() if event_in.description else ""
    event_date = event_in.event_date.strip()
    event_time = event_in.event_time.strip()
    venue = event_in.venue.strip()
    capacity = event_in.capacity
    fee = event_in.fee
    icon = event_in.icon.strip() if event_in.icon else "🎉"

    if not title or not category or not event_date or not event_time or not venue:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title, category, event date, event time, and venue are required."
        )

    if capacity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Capacity must be a positive integer greater than 0."
        )

    if fee < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fee cannot be negative."
        )

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO events (title, category, description, event_date, event_time, venue, capacity, fee, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (title, category, description, event_date, event_time, venue, capacity, fee, icon))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return EventOut(
        id=new_id,
        title=title,
        category=category,
        description=description,
        event_date=event_date,
        event_time=event_time,
        venue=venue,
        capacity=capacity,
        fee=fee,
        icon=icon,
        available_seats=capacity,
    )


@app.delete("/api/registrations/{registration_id}", tags=["Admin - Stretch"])
def delete_registration(registration_id: int):
    """
    Stretch Goal 2: Lets the admin cancel a registration by ID.
    Returns 200 on success, or 404 if registration not found.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, event_id FROM registrations WHERE id = ?", (registration_id,))
    reg = cursor.fetchone()
    if not reg:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration with ID {registration_id} not found."
        )

    cursor.execute("DELETE FROM registrations WHERE id = ?", (registration_id,))
    conn.commit()
    conn.close()

    return {
        "message": "Registration cancelled successfully.",
        "registration_id": registration_id,
        "event_id": reg["event_id"]
    }


# ==========================================
# Frontend Static Files Serving (Step 4)
# ==========================================

# Mount JavaScript assets at /js
app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")

@app.get("/", include_in_schema=False)
def serve_index():
    """Serves the student portal index.html"""
    return FileResponse(FRONTEND_DIR / "index.html")

@app.get("/admin.html", include_in_schema=False)
def serve_admin():
    """Serves the admin dashboard admin.html"""
    return FileResponse(FRONTEND_DIR / "admin.html")

@app.get("/favicon.ico", include_in_schema=False)
def serve_favicon():
    """Returns empty or default favicon response to avoid browser 404s"""
    favicon_path = FRONTEND_DIR / "favicon.ico"
    if favicon_path.exists():
        return FileResponse(favicon_path)
    return FileResponse(FRONTEND_DIR / "index.html")
