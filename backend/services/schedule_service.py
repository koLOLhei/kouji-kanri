"""Schedule service - critical path and Gantt data calculation."""

from __future__ import annotations

from collections import defaultdict, deque
from datetime import date, timedelta
from typing import Any

from sqlalchemy.orm import Session

from models.phase import Phase
from models.milestone import Milestone


def _date_str(d: date | None) -> str | None:
    return d.isoformat() if d else None


def calculate_critical_path(phases: list[Phase]) -> dict[str, Any]:
    """
    Calculate critical path using forward/backward pass (CPM).

    Returns a dict with:
      - critical_path: list of phase ids on the critical path
      - phases: list of phase detail dicts with float info
      - project_duration: total duration in days
    """
    # Build adjacency structures
    # id -> Phase
    phase_map: dict[str, Phase] = {p.id: p for p in phases}

    # Only include phases that have planned_start and planned_end (or duration_days)
    scheduled = {
        pid: p for pid, p in phase_map.items()
        if p.planned_start is not None and (p.planned_end is not None or p.duration_days is not None)
    }

    if not scheduled:
        return {
            "critical_path": [],
            "phases": [],
            "project_duration": 0,
        }

    # Compute duration for each phase
    def get_duration(p: Phase) -> int:
        if p.duration_days:
            return p.duration_days
        if p.planned_start and p.planned_end:
            return (p.planned_end - p.planned_start).days
        return 1

    # Topological sort (Kahn's algorithm)
    in_degree: dict[str, int] = defaultdict(int)
    successors: dict[str, list[str]] = defaultdict(list)  # predecessor -> list of successors

    for pid, p in scheduled.items():
        deps = p.depends_on or []
        for dep_id in deps:
            if dep_id in scheduled:
                successors[dep_id].append(pid)
                in_degree[pid] += 1

    queue: deque[str] = deque(pid for pid in scheduled if in_degree[pid] == 0)
    topo_order: list[str] = []

    while queue:
        cur = queue.popleft()
        topo_order.append(cur)
        for succ in successors[cur]:
            in_degree[succ] -= 1
            if in_degree[succ] == 0:
                queue.append(succ)

    # Phases not reachable via topo (cycle or unrelated) - append remaining
    topo_set = set(topo_order)
    for pid in scheduled:
        if pid not in topo_set:
            topo_order.append(pid)

    # Project start = min planned_start
    project_start = min(p.planned_start for p in scheduled.values() if p.planned_start)

    # Forward pass: earliest start (ES) and earliest finish (EF) in days from project_start
    ES: dict[str, int] = {}  # earliest start (days from project_start)
    EF: dict[str, int] = {}  # earliest finish

    for pid in topo_order:
        p = scheduled[pid]
        dur = get_duration(p)
        deps = [d for d in (p.depends_on or []) if d in scheduled]

        if deps:
            es = max(EF.get(dep, 0) for dep in deps)
        else:
            # Use planned_start relative to project_start
            es = (p.planned_start - project_start).days if p.planned_start else 0

        ES[pid] = es
        EF[pid] = es + dur

    # Project duration = max EF
    project_duration = max(EF.values()) if EF else 0

    # Backward pass: latest start (LS) and latest finish (LF)
    LF: dict[str, int] = {pid: project_duration for pid in scheduled}
    LS: dict[str, int] = {}

    # predecessors map
    predecessors: dict[str, list[str]] = defaultdict(list)
    for pid, p in scheduled.items():
        for dep_id in (p.depends_on or []):
            if dep_id in scheduled:
                predecessors[pid].append(dep_id)

    for pid in reversed(topo_order):
        p = scheduled[pid]
        dur = get_duration(p)
        succs = successors.get(pid, [])
        if succs:
            LF[pid] = min(LS.get(s, project_duration) for s in succs)
        LS[pid] = LF[pid] - dur

    # Total float and critical path
    total_float: dict[str, int] = {pid: LS[pid] - ES[pid] for pid in scheduled}
    critical_path = [pid for pid in scheduled if total_float.get(pid, 0) == 0]

    # Build phase detail list
    phase_details = []
    for pid in topo_order:
        p = scheduled[pid]
        es_days = ES[pid]
        ef_days = EF[pid]
        ls_days = LS.get(pid, es_days)
        lf_days = LF.get(pid, ef_days)
        fl = total_float.get(pid, 0)

        phase_details.append({
            "id": pid,
            "name": p.name,
            "phase_code": p.phase_code,
            "earliest_start": _date_str(project_start + timedelta(days=es_days)),
            "earliest_finish": _date_str(project_start + timedelta(days=ef_days)),
            "latest_start": _date_str(project_start + timedelta(days=ls_days)),
            "latest_finish": _date_str(project_start + timedelta(days=lf_days)),
            "total_float": fl,
            "is_critical": fl == 0,
        })

    return {
        "critical_path": critical_path,
        "phases": phase_details,
        "project_duration": project_duration,
    }


def get_gantt_data(project_id: str, db: Session) -> dict[str, Any]:
    """Return all data needed for Gantt chart rendering."""
    phases = (
        db.query(Phase)
        .filter(Phase.project_id == project_id)
        .order_by(Phase.sort_order)
        .all()
    )

    # Milestones from calendar
    try:
        milestones_q = (
            db.query(Milestone)
            .filter(Milestone.project_id == project_id)
            .order_by(Milestone.due_date)
            .all()
        )
        milestones = [
            {
                "id": m.id,
                "title": m.title,
                "date": _date_str(m.due_date),
                "milestone_type": m.milestone_type,
                "status": m.status,
            }
            for m in milestones_q
        ]
    except Exception:
        milestones = []

    # Critical path
    cp_result = calculate_critical_path(phases)
    critical_ids = set(cp_result["critical_path"])

    # Determine indent level from parent_phase_id / phase_code
    id_to_phase: dict[str, Phase] = {p.id: p for p in phases}

    def get_level(p: Phase) -> int:
        if p.parent_phase_id and p.parent_phase_id in id_to_phase:
            return get_level(id_to_phase[p.parent_phase_id]) + 1
        if p.phase_code and "-" in p.phase_code:
            return 1
        return 0

    gantt_phases = []
    for p in phases:
        gantt_phases.append({
            "id": p.id,
            "name": p.name,
            "phase_code": p.phase_code,
            "level": get_level(p),
            "status": p.status,
            "planned_start": _date_str(p.planned_start),
            "planned_end": _date_str(p.planned_end),
            "actual_start": _date_str(p.actual_start),
            "actual_end": _date_str(p.actual_end),
            "duration_days": p.duration_days,
            "progress_percent": p.progress_percent,
            "depends_on": p.depends_on or [],
            "is_critical": p.id in critical_ids,
        })

    return {
        "phases": gantt_phases,
        "milestones": milestones,
        "critical_path": cp_result["critical_path"],
        "project_duration": cp_result["project_duration"],
        "critical_path_phases": cp_result["phases"],
    }


def auto_schedule(phases: list[Phase], project_start: date) -> list[dict[str, Any]]:
    """
    Auto-calculate planned_start / planned_end for each phase
    based on dependencies and duration_days.
    Returns list of dicts with id, planned_start, planned_end.
    """
    phase_map = {p.id: p for p in phases}

    # Topological sort
    in_degree: dict[str, int] = defaultdict(int)
    successors: dict[str, list[str]] = defaultdict(list)

    for p in phases:
        for dep_id in (p.depends_on or []):
            if dep_id in phase_map:
                successors[dep_id].append(p.id)
                in_degree[p.id] += 1

    queue: deque[str] = deque(p.id for p in phases if in_degree[p.id] == 0)
    topo_order: list[str] = []
    while queue:
        cur = queue.popleft()
        topo_order.append(cur)
        for succ in successors[cur]:
            in_degree[succ] -= 1
            if in_degree[succ] == 0:
                queue.append(succ)

    # Phases not in topo (cycle / unresolved)
    topo_set = set(topo_order)
    for p in phases:
        if p.id not in topo_set:
            topo_order.append(p.id)

    # Track finish dates
    finish: dict[str, date] = {}
    results = []

    for pid in topo_order:
        p = phase_map[pid]
        dur = p.duration_days or (
            (p.planned_end - p.planned_start).days if p.planned_start and p.planned_end else 7
        )

        deps = [d for d in (p.depends_on or []) if d in phase_map]
        if deps:
            start = max(finish[dep] for dep in deps if dep in finish)
        else:
            start = project_start

        end = start + timedelta(days=dur)
        finish[pid] = end

        results.append({
            "id": pid,
            "planned_start": start.isoformat(),
            "planned_end": end.isoformat(),
        })

    return results
