from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.exceptions import BadRequestError, ConflictError, NotFoundError
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate
from app.services.doctor_service import get_doctor
from app.services.patient_service import get_patient

SLOT_MINUTES = 30


def _to_utc(value: datetime) -> datetime:
    """Treat naive datetimes as UTC and normalise everything to UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _base_query():  # noqa: ANN202 - SQLAlchemy Select type is verbose
    return select(Appointment).options(
        joinedload(Appointment.patient), joinedload(Appointment.doctor)
    )


def list_appointments(
    db: Session,
    status: AppointmentStatus | None,
    patient_id: int | None,
    doctor_id: int | None,
    skip: int,
    limit: int,
) -> list[Appointment]:
    stmt = _base_query().order_by(Appointment.scheduled_at.desc())
    if status:
        stmt = stmt.where(Appointment.status == status)
    if patient_id:
        stmt = stmt.where(Appointment.patient_id == patient_id)
    if doctor_id:
        stmt = stmt.where(Appointment.doctor_id == doctor_id)
    return list(db.scalars(stmt.offset(skip).limit(limit)).unique())


def appointments_between(db: Session, start: datetime, end: datetime) -> list[Appointment]:
    stmt = (
        _base_query()
        .where(Appointment.scheduled_at >= start, Appointment.scheduled_at < end)
        .order_by(Appointment.scheduled_at)
    )
    return list(db.scalars(stmt).unique())


def get_appointment(db: Session, appointment_id: int) -> Appointment:
    appt = db.scalar(_base_query().where(Appointment.id == appointment_id))
    if not appt:
        raise NotFoundError("Appointment")
    return appt


def _check_doctor_slot(
    db: Session, doctor_id: int, when: datetime, exclude_id: int | None = None
) -> None:
    window = timedelta(minutes=SLOT_MINUTES)
    stmt = select(Appointment.id).where(
        Appointment.doctor_id == doctor_id,
        Appointment.status == AppointmentStatus.scheduled,
        Appointment.scheduled_at > when - window,
        Appointment.scheduled_at < when + window,
    )
    if exclude_id is not None:
        stmt = stmt.where(Appointment.id != exclude_id)
    if db.scalar(stmt):
        raise ConflictError(
            f"Doctor already has an appointment within {SLOT_MINUTES} minutes of this time"
        )


def create_appointment(db: Session, data: AppointmentCreate, user_id: int) -> Appointment:
    get_patient(db, data.patient_id)
    doctor = get_doctor(db, data.doctor_id)
    if not doctor.is_available:
        raise BadRequestError("Doctor is not currently available for appointments")
    when = _to_utc(data.scheduled_at)
    _check_doctor_slot(db, doctor.id, when)
    appt = Appointment(**data.model_dump(exclude={"scheduled_at"}), scheduled_at=when,
                       created_by=user_id)
    db.add(appt)
    db.commit()
    return get_appointment(db, appt.id)


def update_appointment(db: Session, appointment_id: int, data: AppointmentUpdate) -> Appointment:
    appt = get_appointment(db, appointment_id)
    get_patient(db, data.patient_id)
    get_doctor(db, data.doctor_id)
    when = _to_utc(data.scheduled_at)
    if data.status == AppointmentStatus.scheduled:
        _check_doctor_slot(db, data.doctor_id, when, exclude_id=appointment_id)
    for key, value in data.model_dump(exclude={"scheduled_at"}).items():
        setattr(appt, key, value)
    appt.scheduled_at = when
    db.commit()
    db.expire_all()
    return get_appointment(db, appointment_id)


def delete_appointment(db: Session, appointment_id: int) -> None:
    db.delete(get_appointment(db, appointment_id))
    db.commit()
