"""Database connection and session management for PostgreSQL multi-tenant."""

import socket
import sys
import re

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import settings


def _resolve_render_db_host(url: str) -> str:
    """Render の内部DBホスト名 (dpg-xxx-a) が DNS 解決できない場合、
    外部ホスト名 (dpg-xxx-a.{region}-postgres.render.com) に書き換える。

    サービスとDBが別リージョンに配置された場合に必要。
    """
    m = re.search(r"@(dpg-[a-z0-9]+-a)(?::|/)", url)
    if not m:
        return url
    short_host = m.group(1)
    # 内部ホスト名が解決できるか試す
    try:
        socket.gethostbyname(short_host)
        return url  # 内部解決OK
    except OSError:
        pass
    # 解決できない場合、各リージョンの外部URLを順に試す
    # Oregon を最初に試す (Render free DB のデフォルトリージョン)
    for region in ("oregon", "ohio", "virginia", "frankfurt", "singapore"):
        external = f"{short_host}.{region}-postgres.render.com"
        try:
            socket.gethostbyname(external)
            new_url = url.replace(short_host, external, 1)
            print(f"[database] Rewriting host: {short_host} → {external}", flush=True)
            return new_url
        except OSError:
            continue
    print(f"[database] WARNING: could not resolve {short_host} on any known region", flush=True)
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
