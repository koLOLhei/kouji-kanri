"""Test configuration — Postgres test DB + 2 tenants for tenant isolation tests."""

from __future__ import annotations

import os
import uuid

import pytest

# Force test DB before any backend imports
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://koheiogawa@localhost:5432/kouji_kanri_test",
)
os.environ.setdefault("KOUJI_SKIP_SECURITY_CHECK", "1")

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from database import Base, engine, SessionLocal  # noqa: E402
from main import app  # noqa: E402
from models.tenant import Tenant  # noqa: E402
from models.user import User  # noqa: E402
from services.auth_service import hash_password  # noqa: E402


# ── テストセッション全体での DB 初期化 ───────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Drop, recreate, and build full schema from SQLAlchemy models for tests.

    旧版は Alembic マイグレーションを利用していたが、新規モデル
    (estimate_section/item/quantity 等) と既存モデルへの拡張カラム
    (Tenant.invoice_registration_number, Estimate.parent_estimate_id 等)
    にマイグレーションファイルが追従していないため、本番起動と同様に
    Base.metadata.create_all + _add_missing_columns 方式で構築する。
    """
    # 完全なクリーンスレートから始める
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()

    # 全モデルを import してから create_all (auto-discover)
    import models  # noqa: F401 — registers all model classes via __init__
    Base.metadata.create_all(bind=engine)

    # 本番と同じ起動時 ALTER も流す (既存テーブルへの追加カラム)
    try:
        from main import _add_missing_columns
        _add_missing_columns()
    except Exception:
        # _add_missing_columns が無いか失敗しても継続 (create_all で十分なケース)
        pass
    yield


# ── 関数レベルでデータをきれいに保つ ─────────────────────────────────────

@pytest.fixture(autouse=True)
def clean_data():
    """各テスト関数の前に全テーブルをクリーンする + レート制限の状態をリセット。"""
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' "
            "AND tablename != 'alembic_version'"
        ))
        tables = [row[0] for row in result]
        if tables:
            conn.execute(text(f"TRUNCATE {', '.join(tables)} RESTART IDENTITY CASCADE"))
        conn.commit()
    # レート制限のインメモリ状態をリセット（auth.py / cache_service.py / middleware）
    from routers.auth import _failed_attempts, _email_attempts, _reset_tokens
    _failed_attempts.clear()
    _email_attempts.clear()
    _reset_tokens.clear()
    from services import cache_service
    cache_service._mem_cache.clear()
    from middleware.rate_limit import _ip_api_counter, _ip_upload_counter, _tenant_counter
    _ip_api_counter._data.clear()
    _ip_upload_counter._data.clear()
    _tenant_counter._data.clear()
    yield


# ── テナント・ユーザーのfixture ───────────────────────────────────────────

@pytest.fixture
def db():
    """Per-test DB session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _make_tenant(db, name: str, plan: str = "enterprise", max_projects: int = 100, max_users: int = 50) -> Tenant:
    """schema_name はUNIQUE制約があるため、テストごとにユニーク化する。"""
    suffix = uuid.uuid4().hex[:8]
    t = Tenant(
        id=str(uuid.uuid4()),
        name=name,
        slug=f"{name.lower()}-{suffix}",
        schema_name=f"tenant_{suffix}",
        plan=plan,
        max_projects=max_projects,
        max_users=max_users,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@pytest.fixture
def tenant_a(db):
    """Tenant A — 主要な試験テナント。"""
    return _make_tenant(db, "tenanta", plan="enterprise", max_projects=100, max_users=50)


@pytest.fixture
def tenant_b(db):
    """Tenant B — テナント分離試験用の別テナント。"""
    return _make_tenant(db, "tenantb", plan="standard", max_projects=20, max_users=10)


def _make_user(db, tenant_id: str, role: str, email: str | None = None) -> User:
    user = User(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        email=email or f"{role}-{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("password123"),
        name=f"{role}-user",
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_a(db, tenant_a):
    return _make_user(db, tenant_a.id, "admin")


@pytest.fixture
def worker_a(db, tenant_a):
    return _make_user(db, tenant_a.id, "worker")


@pytest.fixture
def admin_b(db, tenant_b):
    return _make_user(db, tenant_b.id, "admin")


@pytest.fixture
def super_admin(db, tenant_a):
    return _make_user(db, tenant_a.id, "super_admin")


# ── HTTP クライアントとトークン ────────────────────────────────────────────

@pytest.fixture
def client():
    return TestClient(app)


def _login(client: TestClient, email: str, password: str = "password123") -> str:
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed for {email}: {r.text}"
    return r.json()["access_token"]


@pytest.fixture
def admin_a_token(client, admin_a):
    return _login(client, admin_a.email)


@pytest.fixture
def worker_a_token(client, worker_a):
    return _login(client, worker_a.email)


@pytest.fixture
def admin_b_token(client, admin_b):
    return _login(client, admin_b.email)


@pytest.fixture
def super_admin_token(client, super_admin):
    return _login(client, super_admin.email)


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth():
    """Helper: returns a function building an Authorization header dict."""
    return _auth


# ── プロジェクト作成ヘルパー ────────────────────────────────────────────────

@pytest.fixture
def project_factory(db):
    """テナント所属プロジェクトを動的に作成するヘルパー。"""
    from models.project import Project

    def _make(tenant_id: str, name: str = "テスト案件", **kw) -> Project:
        p = Project(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            name=name,
            status=kw.pop("status", "active"),
            spec_base=kw.pop("spec_base", "kokyo_r7"),
            **kw,
        )
        db.add(p)
        db.commit()
        db.refresh(p)
        return p

    return _make
