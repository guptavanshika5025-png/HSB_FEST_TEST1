# Postman Testing Guide — Zenith '26 Fest Management System API

This testing checklist covers the 18 API verification requests for the **Zenith '26 College Fest Management System**, mapping directly to concepts in **PM2-01 (How Software Works)** and **PM2-02 (API Contracts & Architecture)**.

---

## 1. Prerequisites & Setup

1. **Start the FastAPI Server**:
   ```bash
   cd zenith26-fest-system
   .\venv\Scripts\activate
   uvicorn backend.main:app --reload
   ```
   Confirm the server is running at `http://localhost:9000`.

2. **Import Collection into Postman**:
   - Open Postman Desktop App (or Web Client).
   - Click **Import** (top left).
   - Drag & drop `zenith26-api.postman_collection.json`.
   - Ensure the collection variable `baseUrl` is set to `http://localhost:9000`.

---

## 2. Testing Checklist (18 Requests)

### Folder 1: Events Endpoints

#### Request 1: `GET /api/events` (All Events)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events`
- **Expected Status**: `200 OK`
- **Verification**:
  - Response is a JSON array with 14 seed items.
  - Each item includes `available_seats` equal to `capacity` (when zero registrations exist).

#### Request 2: `GET /api/events?category=Technical`
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events?category=Technical`
- **Expected Status**: `200 OK`
- **Verification**:
  - All returned events have `"category": "Technical"` (e.g., Code Sprint 2.0, Robo Race, AI Pitch Fest, Web Design Rumble).

#### Request 3: `GET /api/events?category=Cultural`
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events?category=Cultural`
- **Expected Status**: `200 OK`
- **Verification**:
  - Only Cultural events returned (Battle of Bands, Dance Fiesta, Nukkad Natak, Fashion Fusion, Open Mic Night).

#### Request 4: `GET /api/events?search=Code`
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events?search=Code`
- **Expected Status**: `200 OK`
- **Verification**:
  - Matches "Code Sprint 2.0" and "Intro to Vibe Coding" (case-insensitive substring match).

#### Request 5: `GET /api/events?search=NonExistentTitleXYZ`
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events?search=NonExistentTitleXYZ`
- **Expected Status**: `200 OK`
- **Verification**:
  - Returns empty array `[]`.

#### Request 6: `GET /api/events/1` (Valid ID)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events/1`
- **Expected Status**: `200 OK`
- **Verification**:
  - Single object for "Code Sprint 2.0", `id: 1`, `capacity: 100`, `available_seats: 100`.

#### Request 7: `GET /api/events/9999` (Invalid ID)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events/9999`
- **Expected Status**: `404 Not Found`
- **Response Body**:
  ```json
  {
    "detail": "Event with ID 9999 not found."
  }
  ```

---

### Folder 2: Registration Endpoints & Validation Discipline

#### Request 8: `POST /api/events/1/register` (Successful Registration)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/events/1/register`
- **Headers**: `Content-Type: application/json`
- **Body (raw JSON)**:
  ```json
  {
    "student_name": "Priya Sharma",
    "roll_number": "CS26-1042",
    "email": "priya.sharma@campus.edu",
    "phone": "+91 9876543210"
  }
  ```
- **Expected Status**: `201 Created`
- **Verification**:
  - Returns confirmation object with `id`, `event_id: 1`, `student_name: "Priya Sharma"`, and `registered_at` server timestamp.

#### Request 9: Check Seat Count Drop
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/events/1`
- **Expected Status**: `200 OK`
- **Verification**:
  - `available_seats` has dropped from `100` to `99`.

#### Request 10: `POST /api/events/1/register` (Duplicate Registration — Same Email)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/events/1/register`
- **Body**: (Identical to Request 8)
- **Expected Status**: `409 Conflict`
- **Response Body**:
  ```json
  {
    "detail": "Already registered for this event."
  }
  ```

#### Request 11: `POST /api/events/1/register` (Missing Name)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/events/1/register`
- **Body**:
  ```json
  {
    "student_name": "",
    "roll_number": "CS26-1042",
    "email": "student2@campus.edu"
  }
  ```
- **Expected Status**: `400 Bad Request`
- **Response Body**:
  ```json
  {
    "detail": "Student name, roll number, and email are required."
  }
  ```

#### Request 12: `POST /api/events/1/register` (Invalid Email Without '@')
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/events/1/register`
- **Body**:
  ```json
  {
    "student_name": "Aarav Gupta",
    "roll_number": "CS26-1043",
    "email": "invalidemailaddress"
  }
  ```
- **Expected Status**: `400 Bad Request`
- **Response Body**:
  ```json
  {
    "detail": "Invalid email address. Email must contain '@' with domain."
  }
  ```

#### Request 13: `POST /api/events/9999/register` (Non-existent Event)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/events/9999/register`
- **Body**:
  ```json
  {
    "student_name": "Aarav Gupta",
    "roll_number": "CS26-1043",
    "email": "aarav@campus.edu"
  }
  ```
- **Expected Status**: `404 Not Found`

---

### Folder 3: Admin & Dashboard Endpoints

#### Request 14: `GET /api/registrations` (All Registrations)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/registrations`
- **Expected Status**: `200 OK`
- **Verification**:
  - Returns array of registered students, each containing `event_title` (e.g. "Code Sprint 2.0").

#### Request 15: `GET /api/registrations?event_id=1` (Filter by Event)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/registrations?event_id=1`
- **Expected Status**: `200 OK`
- **Verification**:
  - Returns only registrations where `event_id == 1`.

#### Request 16: `GET /api/stats` (Computed Admin Metrics)
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/stats`
- **Expected Status**: `200 OK`
- **Verification**:
  - `total_events`: 14 (or more if events created)
  - `total_registrations`: at least 1
  - `overall_utilization_pct`: accurately calculated `(total_registrations / total_capacity) * 100` rounded to 1 decimal.
  - `events_by_category`: counts per category.

---

### Folder 4: Stretch Capabilities

#### Request 17: `POST /api/events` (Admin Adds Event)
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/events`
- **Body**:
  ```json
  {
    "title": "Overnight Hackathon 2026",
    "category": "Technical",
    "description": "Build intelligent campus apps in a 24-hour sprint.",
    "event_date": "2026-11-14",
    "event_time": "08:00 PM",
    "venue": "Innovation Hub",
    "capacity": 50,
    "fee": 100,
    "icon": "🚀"
  }
  ```
- **Expected Status**: `201 Created`
- **Verification**:
  - Event created with new ID and `available_seats: 50`.

#### Request 18: `DELETE /api/registrations/{id}` (Admin Cancels Registration)
- **Method**: `DELETE`
- **URL**: `{{baseUrl}}/api/registrations/1`
- **Expected Status**: `200 OK`
- **Verification**:
  - Returns confirmation message; calling `GET /api/events/1` immediately reflects that `available_seats` has restored back to `100`.
