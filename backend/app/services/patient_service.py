from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.exceptions import NotFoundError
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate


def list_patients(db: Session, search: str | None, skip: int, limit: int) -> list[Patient]:
    stmt = select(Patient).order_by(Patient.id.desc())
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                Patient.first_name.ilike(like),
                Patient.last_name.ilike(like),
                Patient.phone.ilike(like),
            )
        )
    return list(db.scalars(stmt.offset(skip).limit(limit)))


def get_patient(db: Session, patient_id: int) -> Patient:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise NotFoundError("Patient")
    return patient


def create_patient(db: Session, data: PatientCreate, user_id: int) -> Patient:
    patient = Patient(**data.model_dump(), created_by=user_id)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def update_patient(db: Session, patient_id: int, data: PatientUpdate) -> Patient:
    patient = get_patient(db, patient_id)
    for key, value in data.model_dump().items():
        setattr(patient, key, value)
    db.commit()
    db.refresh(patient)
    return patient


def delete_patient(db: Session, patient_id: int) -> None:
    db.delete(get_patient(db, patient_id))
    db.commit()
