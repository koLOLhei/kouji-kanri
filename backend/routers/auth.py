"""Authentication router."""

import hashlib
import secrets
import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.tenant import Tenant
from models.platform import LoginHistory
from schemas.auth import LoginRequest, TokenResponse, UserInfo
from services.auth_service import verify_password, hash_password, create_access_token, get_current_user
from services.errors import AppError

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── IP-based rate limiting ────────────────────────────────────────────────────
# In-memory rate limiting: {ip: [(timestamp, ...), ...]}
_failed_attempts: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_WINDOW = 900  # 15 minutes in seconds
_RATE_LIMIT_MAX = 5


def _check_rate_limit(ip: str) -> None:
    """Raise 429 if too many failed attempts from this IP in the last 15 minutes."""
    now = time.time()
    cutoff = now - _RATE_LIMIT_WINDOW
    # Purge old entries
    _failed_attempts[ip] = [t for t in _failed_attempts[ip] if t > cutoff]
    if len(_failed_attempts[ip]) >= _RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="ログイン試行回数が多すぎます。しばらくしてから再試行してください")


def _record_failed_attempt(ip: str) -> None:
    _failed_attempts[ip].append(time.time())


# ── C18: Per-email account lockout ───────────────────────────────────────────
# Separate from the IP limiter: attackers behind proxies/VPNs can rotate IPs
# but the targeted email stays constant.  Lock after 10 failures within 15 min.
_email_attempts: dict[str, list[float]] = {}
_EMAIL_LOCKOUT_WINDOW = 900   # 15 minutes
_EMAIL_LOCKOUT_MAX = 10       # allow up to 10 failures before locking


def _check_email_lockout(email: str) -> None:
    """Raise 429 if this email has exceeded its failure threshold."""
    now = time.monotonic()
    attempts = _email_attempts.get(email, [])
    # Remove stale entries outside the window
    attempts = [t for t in attempts if now - t < _EMAIL_LOCKOUT_WINDOW]
    _email_attempts[email] = attempts
    if len(attempts) >= _EMAIL_LOCKOUT_MAX:
        raise HTTPException(
            status_code=429,
            detail="このアカウントへのログイン試行が上限に達しました。しばらくしてから再試行してください",
        )


def _record_email_failure(email: str) -> None:
    now = time.monotonic()
    if email not in _email_attempts:
        _email_attempts[email] = []
    _email_attempts[email].append(now)


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    # Check both IP-level and per-email lockouts before touching the DB
    _check_rate_limit(client_ip)
    _check_email_lockout(req.email)  # C18

    user = db.query(User).filter(User.email == req.email, User.is_active == True).first()
    if not user or not verify_password(req.password, user.password_hash):
        # 失敗ログ記録 — メールの存在有無に関わらず必ず記録
        _record_failed_attempt(client_ip)
        _record_email_failure(req.email)  # C18
        print(f"[security] Failed login attempt: {req.email} from {client_ip}", flush=True)
        if user:
            db.add(LoginHistory(user_id=user.id, tenant_id=user.tenant_id,
                ip_address=client_ip,
                user_agent=request.headers.get("user-agent", "")[:500], success=False))
            db.commit()
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")

    # A5: Re-hash legacy SHA256 passwords with bcrypt on first successful login
    if not user.password_hash.startswith(("$2b$", "$2a$")):
        user.password_hash = hash_password(req.password)
        print(f"[auth] Upgraded password hash to bcrypt for user {user.id}", flush=True)

    # ログイン成功記録
    db.add(LoginHistory(user_id=user.id, tenant_id=user.tenant_id,
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent", "")[:500], success=True))
    db.commit()

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    token = create_access_token({"sub": user.id, "tenant_id": user.tenant_id, "role": user.role, "token_version": user.token_version})

    return TokenResponse(
        access_token=token,
        user=UserInfo(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            tenant_id=user.tenant_id,
            tenant_name=tenant.name if tenant else "",
        ),
    )


@router.get("/me", response_model=UserInfo)
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    return UserInfo(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        tenant_id=user.tenant_id,
        tenant_name=tenant.name if tenant else "",
    )


# ── D29: Password reset ───────────────────────────────────────────────────────
# Reset tokens are stored in-memory (keyed by hashed token) for simplicity.
# In production, move these to a DB table with an expiry column.
_reset_tokens: dict[str, tuple[str, float]] = {}  # hashed_token -> (user_id, expiry_monotonic)
_RESET_TOKEN_TTL = 3600  # 1 hour


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    D29: Accept an email address and generate a password-reset token.
    We always return 200 (even for unknown emails) to prevent user enumeration.
    The token is logged to stdout; in production it would be emailed via Resend/SMTP.
    """
    user = db.query(User).filter(User.email == req.email, User.is_active == True).first()
    if user:
        raw_token = secrets.token_urlsafe(32)
        hashed = hashlib.sha256(raw_token.encode()).hexdigest()
        expiry = time.monotonic() + _RESET_TOKEN_TTL
        _reset_tokens[hashed] = (user.id, expiry)
        # Send password reset email via Resend API
        from services.email_service import send_password_reset_email
        result = send_password_reset_email(req.email, raw_token)
        if result.get("status") in ("dev_mode", "failed"):
            # Fallback: log token so developers can still test locally
            print(
                f"[password-reset] token for {req.email}: {raw_token}  (expires in 1 hour)",
                flush=True,
            )
    # Always return success — never reveal whether the email exists
    return {"detail": "パスワードリセットのメールを送信しました（登録済みの場合）"}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """D29: Verify the reset token and update the user's password."""
    # Purge expired tokens
    now = time.monotonic()
    expired_keys = [k for k, (_, exp) in _reset_tokens.items() if now > exp]
    for k in expired_keys:
        del _reset_tokens[k]

    hashed = hashlib.sha256(req.token.encode()).hexdigest()
    entry = _reset_tokens.get(hashed)
    if not entry or now > entry[1]:
        raise AppError(400, "無効または期限切れのトークンです", "INVALID_RESET_TOKEN")

    user_id, _ = entry
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise AppError(400, "ユーザーが見つかりません", "USER_NOT_FOUND")

    if len(req.new_password) < 8:
        raise AppError(400, "パスワードは8文字以上にしてください", "PASSWORD_TOO_SHORT")

    user.password_hash = hash_password(req.new_password)
    # Invalidate all existing sessions by bumping token_version
    if hasattr(user, "token_version"):
        user.token_version = (user.token_version or 0) + 1
    db.commit()
    del _reset_tokens[hashed]
    return {"detail": "パスワードを更新しました"}
