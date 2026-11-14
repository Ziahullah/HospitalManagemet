from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth.jwt import create_refresh_token
from app.models.user import User
from app.services.auth_service import get_or_create_google_user

API = "/api/v1/auth"


def test_register(client: TestClient) -> None:
    resp = client.post(f"{API}/register", json={"email": "New@Test.com", "password": "password123"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "new@test.com"
    assert body["role"] == "staff"
    assert "hashed_password" not in body


def test_register_duplicate(client: TestClient, test_user: User) -> None:
    resp = client.post(f"{API}/register", json={"email": test_user.email, "password": "password123"})
    assert resp.status_code == 409


def test_register_short_password(client: TestClient) -> None:
    resp = client.post(f"{API}/register", json={"email": "a@b.com", "password": "short"})
    assert resp.status_code == 422


def test_login_success(client: TestClient, test_user: User) -> None:
    resp = client.post(f"{API}/login", data={"username": test_user.email, "password": "password123"})
    assert resp.status_code == 200
    assert {"access_token", "refresh_token"} <= resp.json().keys()


def test_login_wrong_password(client: TestClient, test_user: User) -> None:
    resp = client.post(f"{API}/login", data={"username": test_user.email, "password": "nope12345"})
    assert resp.status_code == 401


def test_login_inactive(client: TestClient, db: Session, test_user: User) -> None:
    test_user.is_active = False
    db.commit()
    resp = client.post(f"{API}/login", data={"username": test_user.email, "password": "password123"})
    assert resp.status_code == 403


def test_me(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get(f"{API}/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "staff@hospital.com"


def test_me_unauthorized(client: TestClient) -> None:
    assert client.get(f"{API}/me").status_code == 401
    bad = {"Authorization": "Bearer not-a-token"}
    assert client.get(f"{API}/me", headers=bad).status_code == 401


def test_refresh_token_rejected_as_access(client: TestClient, test_user: User) -> None:
    headers = {"Authorization": f"Bearer {create_refresh_token(test_user.id)}"}
    assert client.get(f"{API}/me", headers=headers).status_code == 401


def test_update_me(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.put(f"{API}/me", json={"full_name": "Reception"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Reception"


def test_refresh_rotates(client: TestClient, test_user: User) -> None:
    tokens = client.post(
        f"{API}/login", data={"username": test_user.email, "password": "password123"}
    ).json()
    resp = client.post(f"{API}/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 200
    assert resp.json()["refresh_token"] != tokens["refresh_token"]
    # old refresh token is revoked
    again = client.post(f"{API}/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert again.status_code == 401


def test_refresh_invalid(client: TestClient, test_user: User) -> None:
    assert client.post(f"{API}/refresh", json={"refresh_token": "junk"}).status_code == 401
    # valid JWT that was never stored
    unknown = create_refresh_token(test_user.id)
    assert client.post(f"{API}/refresh", json={"refresh_token": unknown}).status_code == 401


def test_google_not_configured(client: TestClient) -> None:
    resp = client.get(f"{API}/google", follow_redirects=False)
    assert resp.status_code == 501


def test_google_redirect(client: TestClient, monkeypatch) -> None:  # noqa: ANN001
    from app.config import settings

    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "abc")
    resp = client.get(f"{API}/google", follow_redirects=False)
    assert resp.status_code == 307
    assert "accounts.google.com" in resp.headers["location"]


def test_google_user_create_and_link(db: Session, test_user: User) -> None:
    new = get_or_create_google_user(db, {"id": "g1", "email": "g@x.com", "name": "G"})
    assert new.google_id == "g1"
    assert get_or_create_google_user(db, {"id": "g1", "email": "g@x.com"}).id == new.id
    linked = get_or_create_google_user(db, {"id": "g2", "email": test_user.email})
    assert linked.id == test_user.id
    assert linked.google_id == "g2"


def test_health(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "healthy"}
