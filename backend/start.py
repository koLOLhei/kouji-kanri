"""Startup wrapper with error logging."""
import os
import sys
import traceback

port = int(os.environ.get("PORT", 8001))
print(f"[start.py] Starting on port {port}", flush=True)
print(f"[start.py] DATABASE_URL set: {'DATABASE_URL' in os.environ}", flush=True)
print(f"[start.py] Python: {sys.version}", flush=True)

_startup_error = None

try:
    print("[start.py] Importing main...", flush=True)
    from main import app
    print(f"[start.py] Import OK, {len(app.routes)} routes", flush=True)
except Exception as e:
    _startup_error = traceback.format_exc()
    print(f"[start.py] Import FAILED: {e}", flush=True)
    traceback.print_exc()
    # Fallback to healthcheck that also shows the error
    from fastapi import FastAPI
    app = FastAPI()

    @app.get("/")
    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/startup-error")
    def startup_error():
        return {"error": _startup_error}

    print("[start.py] Falling back to error-reporting healthcheck", flush=True)

import uvicorn
uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
