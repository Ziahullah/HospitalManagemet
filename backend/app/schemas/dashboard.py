from pydantic import BaseModel

from app.schemas.appointment import AppointmentResponse


class DashboardStats(BaseModel):
    total_patients: int
    total_doctors: int
    available_doctors: int
    scheduled_appointments: int
    completed_appointments: int
    todays_appointments: list[AppointmentResponse]
