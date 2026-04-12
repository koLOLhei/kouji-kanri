"""Global search (横断検索) router."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models.corrective_action import CorrectiveAction
from models.daily_report import DailyReport
from models.inspection import Inspection
from models.phase import Phase
from models.project import Project
from models.subcontractor import Subcontractor
from models.user import User
from models.worker import Worker
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/search", tags=["search"])

MAX_RESULTS = 20


def _score(value: str, keyword: str) -> int:
    """Return relevance score: 2 for exact match, 1 for partial match."""
    if not value:
        return 0
    lower_val = value.lower()
    lower_kw = keyword.lower()
    if lower_val == lower_kw:
        return 2
    if lower_kw in lower_val:
        return 1
    return 0


@router.get("")
def global_search(
    q: str = Query(..., min_length=1, description="検索キーワード"),
    types: str | None = Query(None, description="検索対象 (カンマ区切り: project,worker,subcontractor,phase,daily_report,inspection,corrective_action)"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    keyword = q.strip()
    if not keyword:
        return []

    allowed_types = None
    if types:
        allowed_types = set(t.strip() for t in types.split(","))

    results: list[dict] = []
    tenant_id = user.tenant_id
    like_pattern = f"%{keyword}%"

    # --- Projects ---
    if not allowed_types or "project" in allowed_types:
        projects = (
            db.query(Project)
            .filter(
                Project.tenant_id == tenant_id,
                (Project.name.ilike(like_pattern))
                | (Project.project_code.ilike(like_pattern))
                | (Project.client_name.ilike(like_pattern)),
            )
            .limit(MAX_RESULTS)
            .all()
        )
        for p in projects:
            best = max(
                _score(p.name, keyword),
                _score(getattr(p, "project_code", None) or "", keyword),
                _score(getattr(p, "client_name", None) or "", keyword),
            )
            results.append({
                "type": "project",
                "id": p.id,
                "title": p.name,
                "subtitle": getattr(p, "project_code", None) or "",
                "url": f"/projects/{p.id}",
                "_score": best,
            })

    # --- Workers ---
    if not allowed_types or "worker" in allowed_types:
        workers = (
            db.query(Worker)
            .filter(
                Worker.tenant_id == tenant_id,
                (Worker.name.ilike(like_pattern))
                | (Worker.name_kana.ilike(like_pattern)),
            )
            .limit(MAX_RESULTS)
            .all()
        )
        for w in workers:
            best = max(_score(w.name, keyword), _score(getattr(w, "name_kana", None) or "", keyword))
            results.append({
                "type": "worker",
                "id": w.id,
                "title": w.name,
                "subtitle": getattr(w, "name_kana", None) or "",
                "url": f"/workers/{w.id}",
                "_score": best,
            })

    # --- Subcontractors ---
    if not allowed_types or "subcontractor" in allowed_types:
        subs = (
            db.query(Subcontractor)
            .filter(
                Subcontractor.tenant_id == tenant_id,
                Subcontractor.company_name.ilike(like_pattern),
            )
            .limit(MAX_RESULTS)
            .all()
        )
        for s in subs:
            results.append({
                "type": "subcontractor",
                "id": s.id,
                "title": s.company_name,
                "subtitle": "",
                "url": f"/subcontractors/{s.id}",
                "_score": _score(s.company_name, keyword),
            })

    # --- Phases ---
    if not allowed_types or "phase" in allowed_types:
        phases = (
            db.query(Phase)
            .join(Project, Phase.project_id == Project.id)
            .filter(
                Project.tenant_id == tenant_id,
                Phase.name.ilike(like_pattern),
            )
            .limit(MAX_RESULTS)
            .all()
        )
        for ph in phases:
            results.append({
                "type": "phase",
                "id": ph.id,
                "title": ph.name,
                "subtitle": "",
                "url": f"/projects/{ph.project_id}/phases/{ph.id}",
                "project_id": ph.project_id,
                "_score": _score(ph.name, keyword),
            })

    # --- Daily Reports ---
    if not allowed_types or "daily_report" in allowed_types:
        reports = (
            db.query(DailyReport)
            .join(Project, DailyReport.project_id == Project.id)
            .filter(
                Project.tenant_id == tenant_id,
                DailyReport.work_description.ilike(like_pattern),
            )
            .limit(MAX_RESULTS)
            .all()
        )
        for r in reports:
            results.append({
                "type": "daily_report",
                "id": r.id,
                "title": f"日報 {r.report_date}",
                "subtitle": (r.work_description or "")[:80],
                "url": f"/projects/{r.project_id}/daily-reports/{r.id}",
                "project_id": r.project_id,
                "_score": _score(r.work_description or "", keyword),
            })

    # --- Inspections ---
    if not allowed_types or "inspection" in allowed_types:
        inspections = (
            db.query(Inspection)
            .join(Project, Inspection.project_id == Project.id)
            .filter(
                Project.tenant_id == tenant_id,
                Inspection.title.ilike(like_pattern),
            )
            .limit(MAX_RESULTS)
            .all()
        )
        for i in inspections:
            results.append({
                "type": "inspection",
                "id": i.id,
                "title": i.title,
                "subtitle": getattr(i, "inspection_type", "") or "",
                "url": f"/projects/{i.project_id}/inspections/{i.id}",
                "project_id": i.project_id,
                "_score": _score(i.title, keyword),
            })

    # --- Corrective Actions ---
    if not allowed_types or "corrective_action" in allowed_types:
        actions = (
            db.query(CorrectiveAction)
            .join(Project, CorrectiveAction.project_id == Project.id)
            .filter(
                Project.tenant_id == tenant_id,
                CorrectiveAction.title.ilike(like_pattern),
            )
            .limit(MAX_RESULTS)
            .all()
        )
        for a in actions:
            results.append({
                "type": "corrective_action",
                "id": a.id,
                "title": a.title,
                "subtitle": "",
                "url": f"/projects/{a.project_id}/corrective-actions/{a.id}",
                "project_id": a.project_id,
                "_score": _score(a.title, keyword),
            })


    # Sort by score (exact match first), then limit
    results.sort(key=lambda x: x["_score"], reverse=True)
    results = results[:MAX_RESULTS]

    # Remove internal score field
    for r in results:
        r.pop("_score", None)

    return results
