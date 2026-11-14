from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

API = "/api/v1/appointments"


def _payload(patient: dict, doctor: dict, when: datetime, **extra: object) -> dict:
    return {
        "patient_id": patient["id"],
        "doctor_id": doctor["id"],
        "scheduled_at": when.isoformat(),
        "reason": "Routine checkup",
        **extra,
    }


def _tomorrow_at(hour: int) -> datetime:
    base = datetime.now(UTC) + timedelta(days=1)
    return base.replace(hour=hour, minute=0, second=0, microsecond=0)


def test_create(client: TestClient, auth_headers: dict, patient: dict, doctor: dict) -> None:
    resp = client.post(API, json=_payload(patient, doctor, _tomorrow_at(10)), headers=auth_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "scheduled"
    assert body["patient"]["first_name"] == "John"
    assert body["doctor"]["full_name"] == "Dr. Sarah Lee"


def test_double_booking_rejected(
    client: TestClient, auth_headers: dict, patient: dict, doctor: dict
) -> None:
    when = _tomorrow_at(10)
    client.post(API, json=_payload(patient, doctor, when), headers=auth_headers)
    clash = client.post(
        API, json=_payload(patient, doctor, when + timedelta(minutes=15)), headers=auth_headers
    )
    assert clash.status_code == 409
    ok = client.post(
        API, json=_payload(patient, doctor, when + timedelta(minutes=30)), headers=auth_headers
    )
    assert ok.status_code == 201


def test_unavailable_doctor(
    client: TestClient, auth_headers: dict, patient: dict, doctor: dict
) -> None:
    from tests.conftest import DOCTOR_PAYLOAD

    client.put(
        f"/api/v1/doctors/{doctor['id']}",
        json={**DOCTOR_PAYLOAD, "is_available": False},
        headers=auth_headers,
    )
    resp = client.post(API, json=_payload(patient, doctor, _tomorrow_at(9)), headers=auth_headers)
    assert resp.status_code == 400


def test_missing_patient_or_doctor(
    client: TestClient, auth_headers: dict, patient: dict, doctor: dict
) -> None:
    when = _tomorrow_at(9)
    assert client.post(
        API, json=_payload({"id": 999}, doctor, when), headers=auth_headers
    ).status_code == 404
    assert client.post(
        API, json=_payload(patient, {"id": 999}, when), headers=auth_headers
    ).status_code == 404


def test_update_status_and_filters(
    client: TestClient, auth_headers: dict, patient: dict, doctor: dict
) -> None:
    when = _tomorrow_at(11)
    appt = client.post(API, json=_payload(patient, doctor, when), headers=auth_headers).json()
    resp = client.put(
        f"{API}/{appt['id']}",
        json=_payload(patient, doctor, when, status="completed", notes="All good"),
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"
    assert resp.json()["notes"] == "All good"

    done = client.get(API, params={"status": "completed"}, headers=auth_headers).json()
    assert len(done) == 1
    assert client.get(API, params={"status": "scheduled"}, headers=auth_headers).json() == []
    by_patient = client.get(API, params={"patient_id": patient["id"]}, headers=auth_headers)
    assert len(by_patient.json()) == 1
    by_doctor = client.get(API, params={"doctor_id": doctor["id"]}, headers=auth_headers)
    assert len(by_doctor.json()) == 1


def test_reschedule_into_conflict(
    client: TestClient, auth_headers: dict, patient: dict, doctor: dict
) -> None:
    a = client.post(API, json=_payload(patient, doctor, _tomorrow_at(9)), headers=auth_headers)
    b = client.post(API, json=_payload(patient, doctor, _tomorrow_at(12)), headers=auth_headers)
    assert a.status_code == b.status_code == 201
    resp = client.put(
        f"{API}/{b.json()['id']}",
        json=_payload(patient, doctor, _tomorrow_at(9), status="scheduled"),
        headers=auth_headers,
    )
    assert resp.status_code == 409


def test_get_and_delete(client: TestClient, auth_headers: dict, patient: dict, doctor: dict) -> None:
    appt = client.post(
        API, json=_payload(patient, doctor, _tomorrow_at(14)), headers=auth_headers
    ).json()
    url = f"{API}/{appt['id']}"
    got = client.get(url, headers=auth_headers).json()
    assert got["scheduled_at"].endswith(("Z", "+00:00"))
    assert client.delete(url, headers=auth_headers).status_code == 204
    assert client.get(url, headers=auth_headers).status_code == 404


def test_deleting_patient_cascades(
    client: TestClient, auth_headers: dict, patient: dict, doctor: dict
) -> None:
    client.post(API, json=_payload(patient, doctor, _tomorrow_at(15)), headers=auth_headers)
    client.delete(f"/api/v1/patients/{patient['id']}", headers=auth_headers)
    assert client.get(API, headers=auth_headers).json() == []


def test_dashboard(client: TestClient, auth_headers: dict, patient: dict, doctor: dict) -> None:
    now = datetime.now(UTC)
    client.post(API, json=_payload(patient, doctor, now), headers=auth_headers)
    stats = client.get("/api/v1/dashboard/stats", headers=auth_headers).json()
    assert stats["total_patients"] == 1
    assert stats["total_doctors"] == 1
    assert stats["available_doctors"] == 1
    assert stats["scheduled_appointments"] == 1
    assert stats["completed_appointments"] == 0
    assert len(stats["todays_appointments"]) == 1
