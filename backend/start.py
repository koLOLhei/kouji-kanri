"""Startup wrapper with error logging."""
import os
import sys
import traceback

try:
    port = int(os.environ.get("PORT", 8001))
    print(f"[start.py] Starting on port {port}", flush=True)
    print(f"[start.py] DATABASE_URL set: {'DATABASE_URL' in os.environ}", flush=True)
    print(f"[start.py] Python: {sys.version}", flush=True)

    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")
except Exception as e:
    print(f"[start.py] FATAL: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)
