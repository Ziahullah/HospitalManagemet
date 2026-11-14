from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.user import User
from app.schemas.appointment import AppointmentResponse
from app.schemas.dashboard import DashboardStats
from app.services import appointment_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _count(db: Session, stmt) -> int:  # noqa: ANN001
    return db.scalar(stmt) or 0


@router.get("/stats", response_model=DashboardStats)
async def stats(
    db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> DashboardStats:
    start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    todays = appointment_service.appointments_between(db, start, start + timedelta(days=1))
    appt_count = select(func.count(Appointment.id))
    return DashboardStats(
        total_patients=_count(db, select(func.count(Patient.id))),
        total_doctors=_count(db, select(func.count(Doctor.id))),
        available_doctors=_count(
            db, select(func.count(Doctor.id)).where(Doctor.is_available.is_(True))
        ),
        scheduled_appointments=_count(
            db, appt_count.where(Appointment.status == AppointmentStatus.scheduled)
        ),
        completed_appointments=_count(
            db, appt_count.where(Appointment.status == AppointmentStatus.completed)
        ),
        todays_appointments=[AppointmentResponse.model_validate(a) for a in todays],
    )
