from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.doctor import Doctor
from app.models.user import User
from app.schemas.doctor import DoctorCreate, DoctorResponse, DoctorUpdate
from app.services import doctor_service

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.get("", response_model=list[DoctorResponse])
async def list_doctors(
    specialization: str | None = None,
    available: bool | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Doctor]:
    return doctor_service.list_doctors(db, specialization, available, skip, limit)


@router.post("", response_model=DoctorResponse, status_code=201)
async def create_doctor(
    data: DoctorCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Doctor:
    return doctor_service.create_doctor(db, data, user.id)


@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(
    doctor_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> Doctor:
    return doctor_service.get_doctor(db, doctor_id)


@router.put("/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(
    doctor_id: int,
    data: DoctorUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Doctor:
    return doctor_service.update_doctor(db, doctor_id, data)


@router.delete("/{doctor_id}", status_code=204)
async def delete_doctor(
    doctor_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> None:
    doctor_service.delete_doctor(db, doctor_id)
