"""Offline sync conflict resolution router."""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/sync", tags=["sync"])


# ---------- Schemas ----------

class ConflictRecord(BaseModel):
    entity_type: str  # e.g. "daily_report", "inspection"
    entity_id: str
    local_data: dict[str, Any]
    local_updated_at: datetime
    server_updated_at: Optional[datetime] = None


class ResolveRequest(BaseModel):
    conflicts: list[ConflictRecord]
    resolution: str  # "local", "server", "merge"
    merge_fields: Optional[dict[str, str]] = None  # field -> "local" | "server" | merged_value


class ConflictCheckResult(BaseModel):
    entity_type: str
    entity_id: str
    has_conflict: bool
    local_updated_at: Optional[datetime]
    server_updated_at: Optional[datetime]
    server_data: Optional[dict[str, Any]]


# Map entity_type to table name and tenant_id column name
_ENTITY_TABLE_MAP: dict[str, str] = {
    "daily_report": "daily_reports",
    "inspection": "inspections",
    "safety_patrol": "safety_patrols",
    "meeting": "meetings",
    "measurement": "measurements",
    "material_order": "material_orders",
    "corrective_action": "corrective_actions",
}


def _get_server_row(entity_type: str, entity_id: str, tenant_id: str, db: Session) -> Optional[dict]:
    table = _ENTITY_TABLE_MAP.get(entity_type)
    if not table:
        return None
    try:
        result = db.execute(
            text(f"SELECT * FROM {table} WHERE id = :eid LIMIT 1"),
            {"eid": entity_id},
        ).mappings().first()
        if result is None:
            return None
        row = dict(result)
        # Tenant-check: reject rows belonging to other tenants
        if row.get("tenant_id") and row["tenant_id"] != tenant_id:
            return None
        # Serialize datetime values
        return {
            k: v.isoformat() if isinstance(v, datetime) else v
            for k, v in row.items()
        }
    except Exception:
        return None


# ---------- Endpoints ----------

@router.get("/conflicts", response_model=ConflictCheckResult)
def check_conflict(
    entity_type: str = Query(...),
    entity_id: str = Query(...),
    local_updated_at: Optional[datetime] = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check whether the server version of a record is newer than the local version."""
    server_row = _get_server_row(entity_type, entity_id, user.tenant_id, db)
    if server_row is None:
        return ConflictCheckResult(
            entity_type=entity_type,
            entity_id=entity_id,
            has_conflict=False,
            local_updated_at=local_updated_at,
            server_updated_at=None,
            server_data=None,
        )

    server_updated_raw = server_row.get("updated_at")
    server_updated_at: Optional[datetime] = None
    if isinstance(server_updated_raw, str):
        try:
            server_updated_at = datetime.fromisoformat(server_updated_raw)
        except ValueError:
            pass
    elif isinstance(server_updated_raw, datetime):
        server_updated_at = server_updated_raw

    has_conflict = False
    if local_updated_at and server_updated_at:
        # Strip timezone info for comparison
        lts = local_updated_at.replace(tzinfo=None)
        sts = server_updated_at.replace(tzinfo=None)
        has_conflict = sts > lts

    return ConflictCheckResult(
        entity_type=entity_type,
        entity_id=entity_id,
        has_conflict=has_conflict,
        local_updated_at=local_updated_at,
        server_updated_at=server_updated_at,
        server_data=server_row if has_conflict else None,
    )


@router.post("/resolve")
def resolve_conflicts(
    req: ResolveRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accept conflicting records and return merged result.

    resolution:
      - "local"  → trust the local (client) version — caller should re-PUT
      - "server" → trust server version — caller should discard local
      - "merge"  → field-level merge using merge_fields mapping
    """
    results = []
    for conflict in req.conflicts:
        server_row = _get_server_row(conflict.entity_type, conflict.entity_id, user.tenant_id, db)

        if req.resolution == "server":
            results.append({
                "entity_type": conflict.entity_type,
                "entity_id": conflict.entity_id,
                "resolution": "server",
                "data": server_row,
            })

        elif req.resolution == "local":
            results.append({
                "entity_type": conflict.entity_type,
                "entity_id": conflict.entity_id,
                "resolution": "local",
                "data": conflict.local_data,
            })

        elif req.resolution == "merge":
            merged: dict[str, Any] = {}
            # Start from server as base
            if server_row:
                merged.update(server_row)
            # Apply field-level decisions
            merge_fields = req.merge_fields or {}
            for field, decision in merge_fields.items():
                if decision == "local":
                    merged[field] = conflict.local_data.get(field)
                elif decision == "server":
                    merged[field] = server_row.get(field) if server_row else None
                else:
                    # decision is a literal merged value (text concat for strings)
                    merged[field] = decision

            results.append({
                "entity_type": conflict.entity_type,
                "entity_id": conflict.entity_id,
                "resolution": "merge",
                "data": merged,
            })

        else:
            raise HTTPException(status_code=400, detail=f"不正な resolution: {req.resolution}")

    return {"resolved": results}
