"""API routers.

Router auto-discovery: scans all .py files in this package and collects
FastAPI Router instances so main.py does not need manual imports.
"""

import importlib
import logging
import pkgutil
import traceback
from pathlib import Path

from fastapi import APIRouter

logger = logging.getLogger(__name__)

# 起動時に router の import で例外が出た場合、ここに (module_name, exc_repr) を
# 残してアプリ全体は起動継続する。/api/startup-error で確認できる。
ROUTER_IMPORT_ERRORS: list[tuple[str, str]] = []


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

    個別 router の import が失敗しても他の router は登録継続する (堅牢化)。
    失敗内訳は ROUTER_IMPORT_ERRORS に蓄積、/api/startup-error で確認可能。
    """
    routers: list[APIRouter] = []
    package_dir = Path(__file__).parent

    for module_info in pkgutil.iter_modules([str(package_dir)]):
        if module_info.name.startswith("_"):
            continue
        try:
            module = importlib.import_module(f"routers.{module_info.name}")
        except Exception as exc:
            # 個別 router の import 失敗を許容: ログに残してスキップ。
            # 過去事例: 依存パッケージ未インストール (openpyxl 等) の場合に
            # discover 全体が止まり、認証含む全 API が 404 になる事故があった。
            err_repr = f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
            ROUTER_IMPORT_ERRORS.append((module_info.name, err_repr))
            logger.error(
                "[router-discover] FAILED to import routers.%s: %s",
                module_info.name, exc
            )
            continue

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
