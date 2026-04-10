"""書類ダッシュボード — 全工程の書類充足状況を一覧、一括生成、提出トラッキング"""

from datetime import datetime, timezone, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.phase import Phase, PhaseRequirement
from models.photo import Photo
from models.report import Report
from models.submission import Submission
from models.project import Project
from models.user import User
from services.auth_service import get_current_user
from services.project_access import verify_project_access
from services.submission_engine import check_phase_completeness, generate_submission_package

router = APIRouter(prefix="/api/projects/{project_id}/documents", tags=["document-dashboard"])


class SubmissionTrack(BaseModel):
    submission_id: str
    submitted_to: str  # 提出先 (監督員名, 機関名等)
    submitted_date: date
    notes: str | None = None


# ─── 書類ダッシュボード: 全工程の充足状況一覧 ───

@router.get("/dashboard")
def document_dashboard(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """全工程の書類充足状況を一覧表示。管理者が一目で何が足りないか分かる。"""
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == user.tenant_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    phases = db.query(Phase).filter(Phase.project_id == project_id).order_by(Phase.sort_order).all()

    result = []
    total_requirements = 0
    total_fulfilled = 0
    phases_ready = 0
    phases_incomplete = 0
    missing_items = []

    for phase in phases:
        reqs = db.query(PhaseRequirement).filter_by(phase_id=phase.id).all()
        if not reqs:
            continue

        phase_reqs = []
        phase_met = 0
        for req in reqs:
            if req.requirement_type == "photo":
                count = db.query(func.count(Photo.id)).filter_by(requirement_id=req.id).scalar()
            else:
                count = db.query(func.count(Report.id)).filter_by(
                    requirement_id=req.id, status="approved"
                ).scalar()
            fulfilled = count >= req.min_count
            if fulfilled:
                phase_met += 1
                total_fulfilled += 1
            else:
                if req.is_mandatory:
                    missing_items.append({
                        "phase_name": phase.name,
                        "phase_code": phase.phase_code,
                        "requirement_name": req.name,
                        "requirement_type": req.requirement_type,
                        "current": count,
                        "required": req.min_count,
                    })
            total_requirements += 1
            phase_reqs.append({
                "id": req.id,
                "name": req.name,
                "type": req.requirement_type,
                "required": req.min_count,
                "current": count,
                "fulfilled": fulfilled,
                "mandatory": req.is_mandatory,
            })

        mandatory_reqs = [r for r in phase_reqs if r["mandatory"]]
        all_mandatory_met = all(r["fulfilled"] for r in mandatory_reqs) if mandatory_reqs else False

        # 既存の提出書類
        existing_submission = db.query(Submission).filter_by(
            phase_id=phase.id
        ).order_by(Submission.created_at.desc()).first()

        if all_mandatory_met:
            phases_ready += 1
        elif mandatory_reqs:
            phases_incomplete += 1

        result.append({
            "phase_id": phase.id,
            "phase_name": phase.name,
            "phase_code": phase.phase_code,
            "phase_status": phase.status,
            "requirements": phase_reqs,
            "total": len(phase_reqs),
            "fulfilled": phase_met,
            "all_mandatory_met": all_mandatory_met,
            "submission": {
                "id": existing_submission.id,
                "status": existing_submission.status,
                "file_key": existing_submission.file_key,
                "generated_at": existing_submission.generated_at.isoformat() if existing_submission.generated_at else None,
                "submitted_at": existing_submission.submitted_at.isoformat() if existing_submission.submitted_at else None,
            } if existing_submission else None,
        })

    return {
        "project_id": project_id,
        "project_name": project.name,
        "summary": {
            "total_phases_with_requirements": len(result),
            "phases_ready_for_generation": phases_ready,
            "phases_incomplete": phases_incomplete,
            "total_requirements": total_requirements,
            "total_fulfilled": total_fulfilled,
            "completion_percent": round(total_fulfilled / total_requirements * 100) if total_requirements > 0 else 0,
        },
        "missing_items": missing_items,
        "phases": result,
    }


# ─── 一括書類生成 ───

@router.post("/batch-generate")
def batch_generate(
    project_id: str,
    submission_type: str = "process_completion",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """全ての書類が揃った工程の提出書類を一括生成"""
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == user.tenant_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="案件が見つかりません")

    phases = db.query(Phase).filter(Phase.project_id == project_id).all()
    generated = []
    skipped = []

    for phase in phases:
        reqs = db.query(PhaseRequirement).filter_by(phase_id=phase.id).all()
        if not reqs:
            continue

        check = check_phase_completeness(db, phase.id)
        if not check["complete"]:
            skipped.append({"phase_id": phase.id, "phase_name": phase.name, "reason": "要件未充足"})
            continue

        # 既にready/submittedがあればスキップ
        existing = db.query(Submission).filter(
            Submission.phase_id == phase.id,
            Submission.status.in_(["ready", "submitted"]),
        ).first()
        if existing:
            skipped.append({"phase_id": phase.id, "phase_name": phase.name, "reason": "生成済み"})
            continue

        try:
            sub = generate_submission_package(db, phase.id, user.tenant_id, submission_type)
            generated.append({
                "phase_id": phase.id,
                "phase_name": phase.name,
                "submission_id": sub.id,
            })
        except Exception as e:
            skipped.append({"phase_id": phase.id, "phase_name": phase.name, "reason": str(e)})

    return {
        "generated_count": len(generated),
        "skipped_count": len(skipped),
        "generated": generated,
        "skipped": skipped,
    }


# ─── 提出トラッキング ───

@router.put("/submissions/{submission_id}/track")
def track_submission(
    project_id: str,
    submission_id: str,
    req: SubmissionTrack,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """提出書類の提出先・提出日を記録"""
    sub = db.query(Submission).filter(
        Submission.id == submission_id, Submission.project_id == project_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="提出書類が見つかりません")

    sub.status = "submitted"
    sub.submitted_at = datetime.combine(req.submitted_date, datetime.min.time())
    meta = sub.metadata_json or {}
    meta["submitted_to"] = req.submitted_to
    meta["submission_notes"] = req.notes
    meta["tracked_by"] = user.id
    meta["tracked_at"] = datetime.now(timezone.utc).isoformat()
    sub.metadata_json = meta
    db.commit()
    db.refresh(sub)
    return {"status": "ok", "submission_id": sub.id, "submitted_to": req.submitted_to}


# ─── 不足書類サマリー (トップレベル) ───

@router.get("/missing")
def missing_documents(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_access(project_id, user, db)
    """不足書類だけを抽出して返す。「あと何が必要か」に特化。"""
    phases = db.query(Phase).filter(Phase.project_id == project_id).order_by(Phase.sort_order).all()

    missing = []
    for phase in phases:
        reqs = db.query(PhaseRequirement).filter_by(phase_id=phase.id, is_mandatory=True).all()
        for req in reqs:
            if req.requirement_type == "photo":
                count = db.query(func.count(Photo.id)).filter_by(requirement_id=req.id).scalar()
            else:
                count = db.query(func.count(Report.id)).filter_by(
                    requirement_id=req.id, status="approved"
                ).scalar()
            if count < req.min_count:
                missing.append({
                    "phase_id": phase.id,
                    "phase_name": phase.name,
                    "phase_code": phase.phase_code,
                    "requirement_id": req.id,
                    "requirement_name": req.name,
                    "requirement_type": req.requirement_type,
                    "current": count,
                    "required": req.min_count,
                    "remaining": req.min_count - count,
                })

    return {
        "total_missing": len(missing),
        "items": missing,
    }
