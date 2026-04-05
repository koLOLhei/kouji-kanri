"""Startup wrapper with error logging."""
import os
import sys
import traceback

port = int(os.environ.get("PORT", 8001))
print(f"[start.py] Starting on port {port}", flush=True)
print(f"[start.py] DATABASE_URL set: {'DATABASE_URL' in os.environ}", flush=True)
print(f"[start.py] Python: {sys.version}", flush=True)

try:
    print("[start.py] Importing main...", flush=True)
    from main import app
    print("[start.py] Import OK, starting uvicorn...", flush=True)
except Exception as e:
    print(f"[start.py] Import FAILED: {e}", flush=True)
    traceback.print_exc()
    # Fallback to healthcheck
    from healthcheck import app
    print("[start.py] Falling back to healthcheck", flush=True)

import uvicorn
uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
