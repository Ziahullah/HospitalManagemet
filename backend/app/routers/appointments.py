from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentResponse, AppointmentUpdate
from app.services import appointment_service

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("", response_model=list[AppointmentResponse])
async def list_appointments(
    status: AppointmentStatus | None = None,
    patient_id: int | None = None,
    doctor_id: int | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Appointment]:
    return appointment_service.list_appointments(db, status, patient_id, doctor_id, skip, limit)


@router.post("", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    data: AppointmentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Appointment:
    return appointment_service.create_appointment(db, data, user.id)


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> Appointment:
    return appointment_service.get_appointment(db, appointment_id)


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    data: AppointmentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Appointment:
    return appointment_service.update_appointment(db, appointment_id, data)


@router.delete("/{appointment_id}", status_code=204)
async def delete_appointment(
    appointment_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> None:
    appointment_service.delete_appointment(db, appointment_id)
