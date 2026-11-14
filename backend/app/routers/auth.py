import logging
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth import google
from app.auth.dependencies import get_current_user
from app.auth.jwt import verify_password
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import RefreshRequest, RegisterRequest, Token, UserResponse, UserUpdate
from app.services import auth_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(req: RegisterRequest, db: Session = Depends(get_db)) -> User:
    return auth_service.register_user(db, req)


@router.post("/login", response_model=Token)
async def login(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> Token:
    user = auth_service.get_user_by_email(db, form.username)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    return auth_service.issue_tokens(db, user)


@router.post("/refresh", response_model=Token)
async def refresh(req: RefreshRequest, db: Session = Depends(get_db)) -> Token:
    return auth_service.rotate_refresh_token(db, req.refresh_token)


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> User:
    user.full_name = data.full_name
    db.commit()
    db.refresh(user)
    return user


@router.get("/google")
async def google_login() -> RedirectResponse:
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google login is not configured")
    return RedirectResponse(google.build_authorize_url())


@router.get("/google/callback")
async def google_callback(
    code: str, db: Session = Depends(get_db)
) -> RedirectResponse:  # pragma: no cover - requires Google
    try:
        info = await google.exchange_code(code)
    except Exception:
        logger.exception("Google OAuth exchange failed")
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=google")
    user = auth_service.get_or_create_google_user(db, info)
    tokens = auth_service.issue_tokens(db, user)
    fragment = urlencode(
        {"access_token": tokens.access_token, "refresh_token": tokens.refresh_token}
    )
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback#{fragment}")
