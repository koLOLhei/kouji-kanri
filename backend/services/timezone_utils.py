"""Timezone-aware date/datetime helpers.

All datetime operations in this codebase should use these helpers
rather than date.today() (naive, OS-local timezone) or datetime.utcnow()
(deprecated in Python 3.12+, also naive).
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
    """Return the current datetime in UTC (timezone-aware)."""
    return datetime.now(timezone.utc)
