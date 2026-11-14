from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.patient import Patient
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientResponse, PatientUpdate
from app.services import patient_service

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=list[PatientResponse])
async def list_patients(
    search: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Patient]:
    return patient_service.list_patients(db, search, skip, limit)


@router.post("", response_model=PatientResponse, status_code=201)
async def create_patient(
    data: PatientCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Patient:
    return patient_service.create_patient(db, data, user.id)


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> Patient:
    return patient_service.get_patient(db, patient_id)


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    data: PatientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Patient:
    return patient_service.update_patient(db, patient_id, data)


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(
    patient_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> None:
    patient_service.delete_patient(db, patient_id)
