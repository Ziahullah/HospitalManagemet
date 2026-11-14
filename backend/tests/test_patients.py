from fastapi.testclient import TestClient

from tests.conftest import PATIENT_PAYLOAD

API = "/api/v1/patients"


def test_requires_auth(client: TestClient) -> None:
    assert client.get(API).status_code == 401


def test_create_and_get(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.post(API, json=PATIENT_PAYLOAD, headers=auth_headers)
    assert resp.status_code == 201
    pid = resp.json()["id"]
    got = client.get(f"{API}/{pid}", headers=auth_headers)
    assert got.status_code == 200
    assert got.json()["first_name"] == "John"


def test_validation(client: TestClient, auth_headers: dict[str, str]) -> None:
    bad_blood = {**PATIENT_PAYLOAD, "blood_group": "Z+"}
    assert client.post(API, json=bad_blood, headers=auth_headers).status_code == 422
    future = {**PATIENT_PAYLOAD, "date_of_birth": "2999-01-01"}
    assert client.post(API, json=future, headers=auth_headers).status_code == 422


def test_list_and_search(client: TestClient, auth_headers: dict[str, str]) -> None:
    client.post(API, json=PATIENT_PAYLOAD, headers=auth_headers)
    other = {**PATIENT_PAYLOAD, "first_name": "Alice", "last_name": "Smith", "phone": "777-1234"}
    client.post(API, json=other, headers=auth_headers)
    assert len(client.get(API, headers=auth_headers).json()) == 2
    found = client.get(API, params={"search": "ali"}, headers=auth_headers).json()
    assert [p["first_name"] for p in found] == ["Alice"]
    by_phone = client.get(API, params={"search": "777"}, headers=auth_headers).json()
    assert len(by_phone) == 1


def test_update(client: TestClient, auth_headers: dict[str, str], patient: dict) -> None:
    payload = {**PATIENT_PAYLOAD, "phone": "999-9999"}
    resp = client.put(f"{API}/{patient['id']}", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["phone"] == "999-9999"


def test_delete(client: TestClient, auth_headers: dict[str, str], patient: dict) -> None:
    assert client.delete(f"{API}/{patient['id']}", headers=auth_headers).status_code == 204
    assert client.get(f"{API}/{patient['id']}", headers=auth_headers).status_code == 404


def test_not_found(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get(f"{API}/9999", headers=auth_headers)
    assert resp.status_code == 404
    assert resp.json()["code"] == "NOT_FOUND"
    assert client.put(f"{API}/9999", json=PATIENT_PAYLOAD, headers=auth_headers).status_code == 404
    assert client.delete(f"{API}/9999", headers=auth_headers).status_code == 404
