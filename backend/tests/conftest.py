"""Test configuration — create tables and seed data before tests run."""
import pytest
from database import Base, engine, SessionLocal
from services.seed import seed_initial_data


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables and seed demo data once for the entire test session."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    yield
    # Teardown: drop all tables after tests
    Base.metadata.drop_all(bind=engine)
