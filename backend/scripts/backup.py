"""Database backup script. Run via cron or manually.

Usage:
    DATABASE_URL=postgresql://user:pass@host/db python backend/scripts/backup.py

The script creates a timestamped SQL dump in the current directory.
For production, pipe the output to S3 or another persistent store.
"""

import subprocess
import os
import sys
from datetime import datetime


def backup_db() -> None:
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        print("DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.sql"

    result = subprocess.run(
        ["pg_dump", db_url, "-f", filename],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        size = os.path.getsize(filename)
        print(f"Backup created: {filename} ({size:,} bytes)")
    else:
        print(f"Backup failed: {result.stderr}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    backup_db()
