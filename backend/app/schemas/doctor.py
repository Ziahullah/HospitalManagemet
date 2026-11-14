from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class DoctorBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    specialization: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=5, max_length=30)
    email: EmailStr
    consultation_fee: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)
    is_available: bool = True


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(DoctorBase):
    pass


class DoctorResponse(DoctorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime | None
