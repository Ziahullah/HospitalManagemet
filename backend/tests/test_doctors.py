from fastapi.testclient import TestClient

from tests.conftest import DOCTOR_PAYLOAD

API = "/api/v1/doctors"


def test_create(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.post(API, json=DOCTOR_PAYLOAD, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["specialization"] == "Cardiology"


def test_duplicate_email(client: TestClient, auth_headers: dict[str, str], doctor: dict) -> None:
    dup = {**DOCTOR_PAYLOAD, "email": "SARAH.LEE@hospital.com"}
    assert client.post(API, json=dup, headers=auth_headers).status_code == 409


def test_negative_fee(client: TestClient, auth_headers: dict[str, str]) -> None:
    bad = {**DOCTOR_PAYLOAD, "consultation_fee": "-1"}
    assert client.post(API, json=bad, headers=auth_headers).status_code == 422


def test_filters(client: TestClient, auth_headers: dict[str, str]) -> None:
    client.post(API, json=DOCTOR_PAYLOAD, headers=auth_headers)
    other = {
        **DOCTOR_PAYLOAD,
        "full_name": "Dr. Ken Wu",
        "specialization": "Neurology",
        "email": "ken@hospital.com",
        "is_available": False,
    }
    client.post(API, json=other, headers=auth_headers)
    neuro = client.get(API, params={"specialization": "neuro"}, headers=auth_headers).json()
    assert [d["full_name"] for d in neuro] == ["Dr. Ken Wu"]
    avail = client.get(API, params={"available": True}, headers=auth_headers).json()
    assert [d["full_name"] for d in avail] == ["Dr. Sarah Lee"]


def test_get_update_delete(client: TestClient, auth_headers: dict[str, str], doctor: dict) -> None:
    url = f"{API}/{doctor['id']}"
    assert client.get(url, headers=auth_headers).status_code == 200
    updated = client.put(url, json={**DOCTOR_PAYLOAD, "is_available": False}, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["is_available"] is False
    assert client.delete(url, headers=auth_headers).status_code == 204
    assert client.get(url, headers=auth_headers).status_code == 404


def test_update_email_conflict(
    client: TestClient, auth_headers: dict[str, str], doctor: dict
) -> None:
    other = client.post(
        API, json={**DOCTOR_PAYLOAD, "email": "other@hospital.com"}, headers=auth_headers
    ).json()
    resp = client.put(f"{API}/{other['id']}", json=DOCTOR_PAYLOAD, headers=auth_headers)
    assert resp.status_code == 409
