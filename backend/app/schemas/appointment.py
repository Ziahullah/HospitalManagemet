from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.appointment import AppointmentStatus


class AppointmentBase(BaseModel):
    patient_id: int
    doctor_id: int
    scheduled_at: datetime
    reason: str = Field(min_length=1, max_length=255)
    notes: str | None = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(AppointmentBase):
    status: AppointmentStatus = AppointmentStatus.scheduled


class PersonSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int


class PatientSummary(PersonSummary):
    first_name: str
    last_name: str


class DoctorSummary(PersonSummary):
    full_name: str
    specialization: str


class AppointmentResponse(AppointmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: AppointmentStatus
    patient: PatientSummary
    doctor: DoctorSummary
    created_at: datetime
    updated_at: datetime | None

    @field_validator("scheduled_at")
    @classmethod
    def assume_utc(cls, v: datetime) -> datetime:
        return v.replace(tzinfo=UTC) if v.tzinfo is None else v
