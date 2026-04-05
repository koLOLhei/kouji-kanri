"""Database connection and session management for PostgreSQL multi-tenant."""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import settings

import sys
_db_url = settings.database_url
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


def get_tenant_db(schema_name: str):
    """Get a DB session scoped to a tenant's schema."""
    db = SessionLocal()
    try:
        db.execute(text(f"SET search_path TO {schema_name}, public"))
        yield db
    finally:
        db.close()
