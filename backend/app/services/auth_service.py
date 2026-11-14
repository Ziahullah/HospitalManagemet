from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.jwt import create_access_token, create_refresh_token, decode_token, hash_password
from app.config import settings
from app.exceptions import AppException, ConflictError
from app.models.user import RefreshToken, User
from app.schemas.auth import RegisterRequest, Token


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def register_user(db: Session, req: RegisterRequest) -> User:
    if get_user_by_email(db, req.email):
        raise ConflictError("Email already registered")
    user = User(
        email=req.email.lower(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def issue_tokens(db: Session, user: User) -> Token:
    refresh = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            user_id=user.id,
            token=refresh,
            expires_at=datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    db.commit()
    return Token(access_token=create_access_token(user.id), refresh_token=refresh)


def rotate_refresh_token(db: Session, token: str) -> Token:
    invalid = AppException("Invalid refresh token", "INVALID_TOKEN", 401)
    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise invalid
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token == token))
    if not stored or stored.revoked:
        raise invalid
    user = db.get(User, stored.user_id)
    if not user or not user.is_active:
        raise invalid
    stored.revoked = True
    return issue_tokens(db, user)


def get_or_create_google_user(db: Session, info: dict[str, Any]) -> User:
    user = db.scalar(select(User).where(User.google_id == info["id"]))
    if user:
        return user
    user = get_user_by_email(db, info["email"])
    if user:
        user.google_id = info["id"]
    else:
        user = User(
            email=info["email"].lower(),
            full_name=info.get("name"),
            google_id=info["id"],
            avatar_url=info.get("picture"),
        )
        db.add(user)
    db.commit()
    db.refresh(user)
    return user
