"""Startup wrapper with fallback error reporting.

Used as an alternative entry point when debugging import failures.
Production uses: uvicorn main:app (see Dockerfile CMD).
"""
import os
import sys
import traceback

port = int(os.environ.get("PORT", 8001))

try:
    from main import app
except Exception as e:
    traceback.print_exc()
    # Fallback: expose a minimal app that reports the import error
    from fastapi import FastAPI
    _error = traceback.format_exc()
    app = FastAPI()

    @app.get("/")
    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/startup-error")
    def startup_error():
        return {"error": _error}

import uvicorn
uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
