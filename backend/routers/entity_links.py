"""エンティティリンクシステム — 全てを繋ぐ万能リンクAPI"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from database import get_db
from models.crm import EntityLink, Brand, Customer, CustomerContact, Lead, Interaction
from models.project import Project
from models.facility import Facility
from models.subcontractor import Subcontractor
from models.worker import Worker
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/links", tags=["entity-links"])


# ─── Schemas ───

class LinkCreate(BaseModel):
    from_type: str
    from_id: str
    to_type: str
    to_id: str
    relationship: str
    description: str | None = None
    metadata_json: dict | None = None


# ─── Helpers ───

# Model registry for entity name resolution
_ENTITY_MODELS = {
    "project": (Project, "name"),
    "customer": (Customer, "company_name"),
    "contact": (CustomerContact, "name"),
    "facility": (Facility, "name"),
    "subcontractor": (Subcontractor, "company_name"),
    "brand": (Brand, "name"),
    "lead": (Lead, "company_name"),
    "worker": (Worker, "name"),
}


def _resolve_name(db: Session, entity_type: str, entity_id: str, tenant_id: str) -> str | None:
    """Resolve an entity's display name by type and id, scoped to the tenant."""
    entry = _ENTITY_MODELS.get(entity_type)
    if not entry:
        return None
    model_cls, name_attr = entry
    filters = [model_cls.id == entity_id]
    if hasattr(model_cls, "tenant_id"):
        filters.append(model_cls.tenant_id == tenant_id)
    row = db.query(model_cls).filter(*filters).first()
    if not row:
        return None
    return getattr(row, name_attr, None)


def _entity_exists(db: Session, entity_type: str, entity_id: str, tenant_id: str) -> bool:
    """Check that an entity exists within the tenant."""
    entry = _ENTITY_MODELS.get(entity_type)
    if not entry:
        return False
    model_cls, _ = entry
    filters = [model_cls.id == entity_id]
    if hasattr(model_cls, "tenant_id"):
        filters.append(model_cls.tenant_id == tenant_id)
    return db.query(model_cls).filter(*filters).first() is not None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("")
def query_links(
    entity_type: str,
    entity_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all links for a given entity (both directions)."""
    links = (
        db.query(EntityLink)
        .filter(
            EntityLink.tenant_id == user.tenant_id,
            or_(
                and_(EntityLink.from_type == entity_type, EntityLink.from_id == entity_id),
                and_(EntityLink.to_type == entity_type, EntityLink.to_id == entity_id),
            ),
        )
        .all()
    )

    results = []
    for lnk in links:
        # Determine the OTHER side
        if lnk.from_type == entity_type and lnk.from_id == entity_id:
            other_type = lnk.to_type
            other_id = lnk.to_id
        else:
            other_type = lnk.from_type
            other_id = lnk.from_id

        other_name = _resolve_name(db, other_type, other_id, user.tenant_id)

        results.append({
            "id": lnk.id,
            "link_type": other_type,
            "link_id": other_id,
            "link_name": other_name,
            "relationship": lnk.relationship,
            "description": lnk.description,
            "metadata": lnk.metadata_json,
        })

    return results


@router.post("")
def create_link(
    req: LinkCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a link between two entities."""
    if not _entity_exists(db, req.from_type, req.from_id, user.tenant_id):
        raise HTTPException(status_code=404, detail=f"{req.from_type} (id={req.from_id}) が見つかりません")
    if not _entity_exists(db, req.to_type, req.to_id, user.tenant_id):
        raise HTTPException(status_code=404, detail=f"{req.to_type} (id={req.to_id}) が見つかりません")

    link = EntityLink(
        tenant_id=user.tenant_id,
        from_type=req.from_type,
        from_id=req.from_id,
        to_type=req.to_type,
        to_id=req.to_id,
        relationship=req.relationship,
        description=req.description,
        metadata_json=req.metadata_json,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.delete("/{link_id}")
def delete_link(
    link_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a link."""
    link = (
        db.query(EntityLink)
        .filter(EntityLink.id == link_id, EntityLink.tenant_id == user.tenant_id)
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail="リンクが見つかりません")

    db.delete(link)
    db.commit()
    return {"detail": "削除しました"}


@router.get("/graph/{entity_type}/{entity_id}")
def get_entity_graph(
    entity_type: str,
    entity_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full graph (2 levels deep) for an entity."""
    tid = user.tenant_id

    center_name = _resolve_name(db, entity_type, entity_id, tid)
    if center_name is None:
        raise HTTPException(status_code=404, detail="エンティティが見つかりません")

    def _get_direct_links(e_type: str, e_id: str) -> list[EntityLink]:
        return (
            db.query(EntityLink)
            .filter(
                EntityLink.tenant_id == tid,
                or_(
                    and_(EntityLink.from_type == e_type, EntityLink.from_id == e_id),
                    and_(EntityLink.to_type == e_type, EntityLink.to_id == e_id),
                ),
            )
            .all()
        )

    def _other_side(lnk: EntityLink, e_type: str, e_id: str) -> tuple[str, str]:
        if lnk.from_type == e_type and lnk.from_id == e_id:
            return lnk.to_type, lnk.to_id
        return lnk.from_type, lnk.from_id

    # Level 1
    level1_links = _get_direct_links(entity_type, entity_id)
    links_output = []

    for lnk in level1_links:
        other_type, other_id = _other_side(lnk, entity_type, entity_id)
        other_name = _resolve_name(db, other_type, other_id, tid)

        # Level 2: children of this linked entity
        level2_links = _get_direct_links(other_type, other_id)
        children = []
        for lnk2 in level2_links:
            child_type, child_id = _other_side(lnk2, other_type, other_id)
            # Skip link back to center
            if child_type == entity_type and child_id == entity_id:
                continue
            child_name = _resolve_name(db, child_type, child_id, tid)
            children.append({
                "type": child_type,
                "id": child_id,
                "name": child_name,
                "relationship": lnk2.relationship,
            })

        links_output.append({
            "target": {
                "type": other_type,
                "id": other_id,
                "name": other_name,
            },
            "relationship": lnk.relationship,
            "children": children,
        })

    return {
        "center": {
            "type": entity_type,
            "id": entity_id,
            "name": center_name,
        },
        "links": links_output,
    }
