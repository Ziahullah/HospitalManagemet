from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.patient import Gender

BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}


class PatientBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    date_of_birth: date
    gender: Gender
    phone: str = Field(min_length=5, max_length=30)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=500)
    blood_group: str | None = None
    medical_history: str | None = None

    @field_validator("blood_group")
    @classmethod
    def check_blood_group(cls, v: str | None) -> str | None:
        if v is not None and v not in BLOOD_GROUPS:
            raise ValueError(f"blood_group must be one of {sorted(BLOOD_GROUPS)}")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def check_dob(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("date_of_birth cannot be in the future")
        return v


class PatientCreate(PatientBase):
    pass


class PatientUpdate(PatientBase):
    pass


class PatientResponse(PatientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None
