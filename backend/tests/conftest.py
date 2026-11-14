import os
from collections.abc import Generator

os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.auth.jwt import create_access_token, hash_password  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestSession = sessionmaker(bind=engine, autoflush=False)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    Base.metadata.create_all(bind=engine)
    session = TestSession()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db: Session) -> User:
    user = User(
        email="staff@hospital.com",
        hashed_password=hash_password("password123"),
        full_name="Front Desk",
        role=UserRole.staff,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(test_user.id)}"}


PATIENT_PAYLOAD = {
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1990-05-12",
    "gender": "male",
    "phone": "555-0101",
    "email": "john@example.com",
    "blood_group": "O+",
}

DOCTOR_PAYLOAD = {
    "full_name": "Dr. Sarah Lee",
    "specialization": "Cardiology",
    "phone": "555-0202",
    "email": "sarah.lee@hospital.com",
    "consultation_fee": "150.00",
    "is_available": True,
}


@pytest.fixture
def patient(client: TestClient, auth_headers: dict[str, str]) -> dict:
    return client.post("/api/v1/patients", json=PATIENT_PAYLOAD, headers=auth_headers).json()


@pytest.fixture
def doctor(client: TestClient, auth_headers: dict[str, str]) -> dict:
    return client.post("/api/v1/doctors", json=DOCTOR_PAYLOAD, headers=auth_headers).json()
