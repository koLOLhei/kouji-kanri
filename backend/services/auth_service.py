"""JWT authentication service."""

from datetime import datetime, timezone, timedelta

import hashlib

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.user import User

security = HTTPBearer()

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, stored: str) -> bool:
    """Verify password against stored hash (bcrypt or legacy SHA256)."""
    # Bcrypt hashes start with $2b$ or $2a$
    if stored.startswith(("$2b$", "$2a$")):
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
        except Exception:
            return False
    # Legacy SHA256 fallback (format: salt:hash or salt$hash)
    for sep in (":", "$"):
        if sep in stored:
            parts = stored.split(sep, 1)
            if len(parts) == 2:
                salt, hashed = parts
                return hashlib.sha256((salt + plain).encode()).hexdigest() == hashed
    return False


def create_access_token(data: dict) -> str:
    # C20: Role-based session timeout.
    role = data.get("role", "worker")
    if role in ("super_admin", "admin"):
        expire_minutes = 120   # 2 hours for admin roles
    else:
        expire_minutes = settings.access_token_expire_minutes  # 8 hours for workers
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="無効なトークン")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="無効なトークン")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="ユーザーが見つかりません")
    # Verify token_version to support role-change/deactivation revocation
    token_tv = payload.get("token_version", 0)
    if token_tv != user.token_version:
        raise HTTPException(status_code=401, detail="セッションが無効です。再ログインしてください")
    return user


def require_role(*roles: str):
    """Role-based access control dependency."""
    def check(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="権限がありません")
        return user
    return check
