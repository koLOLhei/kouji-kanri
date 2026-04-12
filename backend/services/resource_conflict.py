"""Resource conflict detection service.

Checks worker and equipment double-booking across projects.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from models.worker import Attendance, Worker
from models.equipment import Equipment, EquipmentUsage
from models.project import Project


def check_worker_conflicts(
    worker_id: str,
    check_date: date,
    exclude_project_id: str | None,
    db: Session,
) -> list[dict[str, Any]]:
    """Check if a worker is assigned to multiple projects on the same date.

    Returns a list of conflict dicts: [{project_id, project_name, date}]
    """
    q = (
        db.query(Attendance, Project)
        .join(Project, Project.id == Attendance.project_id)
        .filter(
            Attendance.worker_id == worker_id,
            Attendance.work_date == check_date,
        )
    )
    if exclude_project_id:
        q = q.filter(Attendance.project_id != exclude_project_id)

    results = []
    for att, proj in q.all():
        results.append({
            "project_id": proj.id,
            "project_name": proj.name,
            "date": att.work_date.isoformat(),
            "resource_type": "worker",
        })
    return results


def check_equipment_conflicts(
    equipment_id: str,
    date_start: date,
    date_end: date,
    exclude_project_id: str | None,
    db: Session,
) -> list[dict[str, Any]]:
    """Check if equipment is assigned to multiple projects in a date range.

    Returns a list of conflict dicts: [{project_id, project_name, date}]
    """
    q = (
        db.query(EquipmentUsage, Project)
        .join(Project, Project.id == EquipmentUsage.project_id)
        .filter(
            EquipmentUsage.equipment_id == equipment_id,
            EquipmentUsage.usage_date >= date_start,
            EquipmentUsage.usage_date <= date_end,
        )
    )
    if exclude_project_id:
        q = q.filter(EquipmentUsage.project_id != exclude_project_id)

    results = []
    for usage, proj in q.all():
        results.append({
            "project_id": proj.id,
            "project_name": proj.name,
            "date": usage.usage_date.isoformat(),
            "resource_type": "equipment",
        })
    return results


def get_all_conflicts(
    project_id: str,
    check_date: date,
    db: Session,
) -> dict[str, Any]:
    """Get all resource conflicts for a project on a specific date.

    Checks all workers with attendance records and all equipment usages on
    that date, and returns any that are also assigned elsewhere.
    """
    # Workers assigned to this project on this date
    project_attendances = (
        db.query(Attendance)
        .filter(
            Attendance.project_id == project_id,
            Attendance.work_date == check_date,
        )
        .all()
    )

    worker_conflicts: list[dict[str, Any]] = []
    seen_worker_conflicts: set[str] = set()

    for att in project_attendances:
        conflicts = check_worker_conflicts(att.worker_id, check_date, project_id, db)
        for c in conflicts:
            key = f"{att.worker_id}:{c['project_id']}"
            if key not in seen_worker_conflicts:
                seen_worker_conflicts.add(key)
                # Look up worker name
                worker = db.query(Worker).filter(Worker.id == att.worker_id).first()
                worker_conflicts.append({
                    **c,
                    "worker_id": att.worker_id,
                    "worker_name": worker.name if worker else att.worker_id,
                })

    # Equipment used on this project on this date
    project_equipment_usages = (
        db.query(EquipmentUsage)
        .filter(
            EquipmentUsage.project_id == project_id,
            EquipmentUsage.usage_date == check_date,
        )
        .all()
    )

    equipment_conflicts: list[dict[str, Any]] = []
    seen_equip_conflicts: set[str] = set()

    for usage in project_equipment_usages:
        conflicts = check_equipment_conflicts(
            usage.equipment_id, check_date, check_date, project_id, db
        )
        for c in conflicts:
            key = f"{usage.equipment_id}:{c['project_id']}"
            if key not in seen_equip_conflicts:
                seen_equip_conflicts.add(key)
                equip = db.query(Equipment).filter(Equipment.id == usage.equipment_id).first()
                equipment_conflicts.append({
                    **c,
                    "equipment_id": usage.equipment_id,
                    "equipment_name": equip.name if equip else usage.equipment_id,
                })

    return {
        "date": check_date.isoformat(),
        "worker_conflicts": worker_conflicts,
        "equipment_conflicts": equipment_conflicts,
        "has_conflicts": bool(worker_conflicts or equipment_conflicts),
    }


def get_conflicts_for_range(
    project_id: str,
    start_date: date,
    end_date: date,
    db: Session,
) -> dict[str, Any]:
    """Get all resource conflicts for a project over a date range."""
    from datetime import timedelta

    days = (end_date - start_date).days + 1
    all_conflicts = []

    for i in range(days):
        d = start_date + timedelta(days=i)
        day_result = get_all_conflicts(project_id, d, db)
        if day_result["has_conflicts"]:
            all_conflicts.append(day_result)

    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "conflict_days": all_conflicts,
        "total_conflict_days": len(all_conflicts),
        "has_conflicts": bool(all_conflicts),
    }


def get_worker_monthly_conflicts(
    worker_id: str,
    year: int,
    month: int,
    db: Session,
) -> dict[str, Any]:
    """Get all schedule conflicts for a worker in a given month."""
    import calendar

    _, last_day = calendar.monthrange(year, month)
    month_start = date(year, month, 1)
    month_end = date(year, month, last_day)

    # Get all attendance records for this worker this month
    attendances = (
        db.query(Attendance, Project)
        .join(Project, Project.id == Attendance.project_id)
        .filter(
            Attendance.worker_id == worker_id,
            Attendance.work_date >= month_start,
            Attendance.work_date <= month_end,
        )
        .order_by(Attendance.work_date)
        .all()
    )

    # Group by date
    from collections import defaultdict
    by_date: dict[str, list[dict]] = defaultdict(list)
    for att, proj in attendances:
        by_date[att.work_date.isoformat()].append({
            "project_id": proj.id,
            "project_name": proj.name,
        })

    # Dates with multiple assignments = conflicts
    conflict_days = []
    for d_str, projs in by_date.items():
        if len(projs) > 1:
            conflict_days.append({
                "date": d_str,
                "projects": projs,
            })

    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    return {
        "worker_id": worker_id,
        "worker_name": worker.name if worker else worker_id,
        "month": f"{year}-{month:02d}",
        "conflict_days": conflict_days,
        "has_conflicts": bool(conflict_days),
    }
