"""Reusable pagination helpers for FastAPI routers."""

from fastapi import Query
from pydantic import BaseModel
from typing import Any


def pagination_params(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> dict[str, int]:
    """Dependency that injects limit/offset pagination params."""
    return {"limit": limit, "offset": offset}


class PaginatedResponse(BaseModel):
    """Standard paginated response envelope."""
    items: list[Any]
    total: int
    limit: int
    offset: int

    model_config = {"arbitrary_types_allowed": True}
