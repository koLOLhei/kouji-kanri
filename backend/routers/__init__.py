"""API routers.

Router auto-discovery: scans all .py files in this package and collects
FastAPI Router instances so main.py does not need manual imports.
"""

import importlib
import pkgutil
from pathlib import Path

from fastapi import APIRouter


def discover_routers() -> list[APIRouter]:
    """Auto-discover all routers in the routers package.

    Convention:
    - A module attribute named ``router`` is always picked up.
    - Any other attribute whose name ends with ``_router`` (e.g.
      ``equipment_router``, ``admin_router``, ``tenant_router``) is also
      picked up, as long as it is an ``APIRouter`` instance and its name
      differs from ``"router"``.

    Modules whose file name starts with ``_`` (e.g. ``__init__``) are
    skipped automatically by ``pkgutil.iter_modules``.
    """
    routers: list[APIRouter] = []
    package_dir = Path(__file__).parent

    for module_info in pkgutil.iter_modules([str(package_dir)]):
        if module_info.name.startswith("_"):
            continue
        module = importlib.import_module(f"routers.{module_info.name}")

        # Standard single-router convention
        if hasattr(module, "router"):
            routers.append(module.router)

        # Modules that export multiple routers (e.g. equipment_routes,
        # client_portal, staffing) use names like *_router
        for attr_name in dir(module):
            if attr_name == "router":
                continue  # already handled above
            attr = getattr(module, attr_name)
            if isinstance(attr, APIRouter) and attr_name.endswith("_router"):
                routers.append(attr)

    return routers
