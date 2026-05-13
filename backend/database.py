"""Database connection and session management for PostgreSQL multi-tenant."""

import socket
import sys
import re

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import settings


def _try_connect(url: str, timeout: int = 5) -> bool:
    """指定URLで実際にPostgreSQLに接続を試みる。成功でTrue。"""
    import psycopg2
    try:
        conn = psycopg2.connect(url, connect_timeout=timeout)
        conn.close()
        return True
    except Exception:
        return False


def _resolve_render_db_host(url: str) -> str:
    """Render の内部DBホスト名 (dpg-xxx-a) を、実際に接続可能な外部ホスト名に書き換える。

    サービスとDBが別リージョン配置の場合に必要。
    各リージョンの外部URLに sslmode=require を付けて実接続テストし、
    最初に成功したURLを採用する。
    """
    m = re.search(r"@(dpg-[a-z0-9]+-a)(?::|/)", url)
    if not m:
        return url
    short_host = m.group(1)

    # まず内部ホストでそのまま接続できるか
    if _try_connect(url, timeout=3):
        return url

    # 外部ホスト名で各リージョン試行 (sslmode=require 強制)
    separator = "&" if "?" in url else "?"
    for region in ("oregon", "ohio", "virginia", "frankfurt", "singapore"):
        external = f"{short_host}.{region}-postgres.render.com"
        try:
            socket.gethostbyname(external)
        except OSError:
            continue
        candidate = url.replace(short_host, external, 1)
        if "sslmode=" not in candidate:
            candidate = f"{candidate}{separator}sslmode=require"
        if _try_connect(candidate, timeout=8):
            print(f"[database] Using external host: {external} (sslmode=require)", flush=True)
            return candidate
        print(f"[database] Attempt failed: {external}", flush=True)

    print(f"[database] WARNING: no reachable host found, returning original URL", flush=True)
    return url


_db_url = _resolve_render_db_host(settings.database_url)
print(f"[database] URL host: {_db_url.split('@')[-1].split('/')[0] if '@' in _db_url else 'N/A'}", flush=True)
engine = create_engine(
    _db_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=0,
    connect_args={"connect_timeout": 30},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency for database sessions (public schema)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


import re as _re
_SCHEMA_NAME_RE = _re.compile(r"^[a-z_][a-z0-9_]{0,62}$")


def get_tenant_db(schema_name: str):
    """Get a DB session scoped to a tenant's schema.

    schema_name は SQL identifier として安全な形式に限定（SQLi 防止）。
    """
    if not _SCHEMA_NAME_RE.match(schema_name):
        raise ValueError(f"Unsafe schema_name: {schema_name!r}")
    db = SessionLocal()
    try:
        # validation を通っているので識別子として安全に補間できる
        db.execute(text(f"SET search_path TO {schema_name}, public"))
        yield db
    finally:
        db.close()
