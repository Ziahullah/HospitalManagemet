from sqlalchemy import select
from sqlalchemy.orm import Session

from app.exceptions import ConflictError, NotFoundError
from app.models.doctor import Doctor
from app.schemas.doctor import DoctorCreate, DoctorUpdate


def list_doctors(
    db: Session, specialization: str | None, available: bool | None, skip: int, limit: int
) -> list[Doctor]:
    stmt = select(Doctor).order_by(Doctor.full_name)
    if specialization:
        stmt = stmt.where(Doctor.specialization.ilike(f"%{specialization}%"))
    if available is not None:
        stmt = stmt.where(Doctor.is_available == available)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


def get_doctor(db: Session, doctor_id: int) -> Doctor:
    doctor = db.get(Doctor, doctor_id)
    if not doctor:
        raise NotFoundError("Doctor")
    return doctor


def _ensure_unique_email(db: Session, email: str, exclude_id: int | None = None) -> None:
    stmt = select(Doctor).where(Doctor.email == email.lower())
    if exclude_id is not None:
        stmt = stmt.where(Doctor.id != exclude_id)
    if db.scalar(stmt):
        raise ConflictError("A doctor with this email already exists")


def create_doctor(db: Session, data: DoctorCreate, user_id: int) -> Doctor:
    _ensure_unique_email(db, data.email)
    doctor = Doctor(**data.model_dump(), created_by=user_id)
    doctor.email = doctor.email.lower()
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


def update_doctor(db: Session, doctor_id: int, data: DoctorUpdate) -> Doctor:
    doctor = get_doctor(db, doctor_id)
    _ensure_unique_email(db, data.email, exclude_id=doctor_id)
    for key, value in data.model_dump().items():
        setattr(doctor, key, value)
    doctor.email = doctor.email.lower()
    db.commit()
    db.refresh(doctor)
    return doctor


def delete_doctor(db: Session, doctor_id: int) -> None:
    db.delete(get_doctor(db, doctor_id))
    db.commit()
