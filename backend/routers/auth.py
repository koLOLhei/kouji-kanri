"""Authentication router."""

import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.tenant import Tenant
from models.platform import LoginHistory
from schemas.auth import LoginRequest, TokenResponse, UserInfo
from services.auth_service import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

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


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    user = db.query(User).filter(User.email == req.email, User.is_active == True).first()
    if not user or not verify_password(req.password, user.password_hash):
        # 失敗ログ記録 — メールの存在有無に関わらず必ず記録
        _record_failed_attempt(client_ip)
        print(f"[security] Failed login attempt: {req.email} from {client_ip}", flush=True)
        if user:
            db.add(LoginHistory(user_id=user.id, tenant_id=user.tenant_id,
                ip_address=client_ip,
                user_agent=request.headers.get("user-agent", "")[:500], success=False))
            db.commit()
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")

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
