"""Authentication router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.tenant import Tenant
from schemas.auth import LoginRequest, TokenResponse, UserInfo
from services.auth_service import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email, User.is_active == True).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    token = create_access_token({"sub": user.id, "tenant_id": user.tenant_id, "role": user.role})

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
