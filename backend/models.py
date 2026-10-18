from typing import Optional, Dict
from pydantic import BaseModel, Field

class EventOut(BaseModel):
    id: int = Field(..., description="Unique event ID")
    title: str = Field(..., description="Event title")
    category: str = Field(..., description="Category (Technical, Cultural, Sports, Gaming, Workshop)")
    description: Optional[str] = Field(None, description="Detailed description of the event")
    event_date: str = Field(..., description="Event date (ISO format YYYY-MM-DD)")
    event_time: str = Field(..., description="Event start time (e.g. 10:00 AM)")
    venue: str = Field(..., description="Campus venue location")
    capacity: int = Field(..., description="Maximum registration capacity")
    fee: int = Field(0, description="Registration fee in INR (0 means free)")
    icon: Optional[str] = Field(None, description="Event emoji icon")
    available_seats: int = Field(..., description="Remaining available registration seats")

    class Config:
        from_attributes = True

class EventDetail(EventOut):
    """Event detail view response model, sharing the EventOut contract."""
    pass

class RegistrationIn(BaseModel):
    student_name: str = Field(..., description="Full name of student")
    roll_number: str = Field(..., description="Student college roll/ID number")
    email: str = Field(..., description="Student email address")
    phone: Optional[str] = Field(None, description="Optional phone number")

class RegistrationOut(BaseModel):
    id: int = Field(..., description="Unique registration ID")
    event_id: int = Field(..., description="Registered event ID")
    student_name: str = Field(..., description="Student name")
    registered_at: str = Field(..., description="Server timestamp of registration")

    class Config:
        from_attributes = True

class RegistrationDetailOut(BaseModel):
    id: int = Field(..., description="Unique registration ID")
    event_id: int = Field(..., description="Registered event ID")
    student_name: str = Field(..., description="Student name")
    roll_number: str = Field(..., description="Student roll number")
    email: str = Field(..., description="Student email")
    phone: Optional[str] = Field(None, description="Phone number")
    registered_at: str = Field(..., description="Registration timestamp")
    event_title: str = Field(..., description="Title of the registered event")

    class Config:
        from_attributes = True

class StatsOut(BaseModel):
    total_events: int = Field(..., description="Total number of events")
    total_registrations: int = Field(..., description="Total registrations across all events")
    total_capacity: int = Field(..., description="Sum of capacities of all events")
    overall_utilization_pct: float = Field(..., description="Percentage of seats booked (rounded to 1 decimal)")
    upcoming_events_count: int = Field(..., description="Events scheduled today or in the future")
    events_by_category: Dict[str, int] = Field(..., description="Mapping of category name to event count")

# Stretch goal model for admin adding an event
class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Event title")
    category: str = Field(..., min_length=1, description="Event category")
    description: Optional[str] = Field(None, description="Event description")
    event_date: str = Field(..., min_length=1, description="Date in YYYY-MM-DD format")
    event_time: str = Field(..., min_length=1, description="Time string, e.g. 10:00 AM")
    venue: str = Field(..., min_length=1, description="Venue location")
    capacity: int = Field(..., gt=0, description="Total capacity (must be > 0)")
    fee: int = Field(0, ge=0, description="Fee in INR (>= 0)")
    icon: Optional[str] = Field("🎉", description="Emoji icon")
