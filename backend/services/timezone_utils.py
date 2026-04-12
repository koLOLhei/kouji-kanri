"""Timezone-aware date/datetime helpers.

## Convention (A8 — Timezone Consistency)

### Storage rule
All `DateTime` columns in the database store values in **UTC**.
- Use `now_utc()` for `created_at`, `updated_at`, `generated_at`, and any other
  audit/timestamp columns.
- Never use `datetime.utcnow()` (deprecated in Python 3.12; it is naive/no tzinfo).
- Never use `datetime.now()` without a tz argument (returns OS-local time).

### Date-only fields
`Date` columns (e.g. `start_date`, `report_date`) represent a calendar date in
Japan Standard Time, so use `today_jst()` as the default rather than
`date.today()` (which would give the wrong date when the server runs in UTC
and the wall clock in JST has already crossed midnight).

### Display / frontend
Convert UTC datetimes to JST only at display time.  The frontend receives UTC
ISO-8601 strings and should use `toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'})`
or a library like `date-fns-tz` for display.

### Model defaults
When defining SQLAlchemy models, prefer:

```python
from services.timezone_utils import now_utc, today_jst

created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
```

Using `DateTime(timezone=True)` (i.e. `TIMESTAMP WITH TIME ZONE` in PostgreSQL)
is preferable for new columns; it lets the DB store offset info and avoids
ambiguity.  Existing columns (`DateTime` without timezone=True) already store UTC
by convention — do not change them without a migration.
"""

from datetime import datetime, timezone, timedelta, date

JST = timezone(timedelta(hours=9))


def now_jst() -> datetime:
    """Return the current datetime in Japan Standard Time (UTC+9)."""
    return datetime.now(JST)


def today_jst() -> date:
    """Return today's date in Japan Standard Time (UTC+9)."""
    return datetime.now(JST).date()


def now_utc() -> datetime:
    """Return the current datetime in UTC (timezone-aware).

    Use this for all DB timestamp columns.  Replaces the deprecated
    `datetime.utcnow()` call throughout the codebase.
    """
    return datetime.now(timezone.utc)


def to_jst(dt: datetime) -> datetime:
    """Convert a UTC (or any tz-aware) datetime to JST for display purposes."""
    if dt.tzinfo is None:
        # Assume naive datetimes are UTC (legacy behaviour)
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(JST)


def format_jst(dt: datetime, fmt: str = "%Y年%m月%d日 %H:%M") -> str:
    """Format a datetime in JST using a Japanese-style default format."""
    return to_jst(dt).strftime(fmt)
