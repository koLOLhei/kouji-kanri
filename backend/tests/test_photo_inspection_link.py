"""写真→検査記録の自動リンクテスト。"""

import uuid
from datetime import date


def test_link_photo_to_inspection_attaches_photo(
    db, admin_a, project_factory, tenant_a
):
    from models.inspection import Inspection
    from models.phase import Phase
    from models.photo import Photo
    from services.photo_inspection_link import link_photo_to_inspection

    project = project_factory(tenant_a.id)
    phase = Phase(id=str(uuid.uuid4()), project_id=project.id, name="鉄筋", sort_order=0)
    db.add(phase)
    inspection = Inspection(
        id=str(uuid.uuid4()),
        project_id=project.id,
        phase_id=phase.id,
        inspection_type="self",
        title="配筋検査",
        scheduled_date=date(2026, 5, 4),
        status="scheduled",
    )
    db.add(inspection)
    photo = Photo(
        id=str(uuid.uuid4()),
        project_id=project.id,
        phase_id=phase.id,
        file_key="test/photo.jpg",
        uploaded_by=admin_a.id,
    )
    db.add(photo)
    db.commit()

    result = link_photo_to_inspection(db, photo, measurement="@200mm")
    assert result is not None
    assert result.id == inspection.id
    assert photo.id in (result.photo_ids or [])


def test_link_photo_with_measurement_creates_checklist_item(
    db, admin_a, project_factory, tenant_a
):
    from models.inspection import Inspection, InspectionChecklist
    from models.phase import Phase
    from models.photo import Photo
    from services.photo_inspection_link import link_photo_to_inspection

    project = project_factory(tenant_a.id)
    phase = Phase(id=str(uuid.uuid4()), project_id=project.id, name="x", sort_order=0)
    db.add(phase)
    inspection = Inspection(
        id=str(uuid.uuid4()),
        project_id=project.id,
        phase_id=phase.id,
        inspection_type="self",
        title="x",
        status="scheduled",
    )
    db.add(inspection)
    photo = Photo(
        id=str(uuid.uuid4()),
        project_id=project.id,
        phase_id=phase.id,
        caption="鉄筋ピッチ",
        file_key="x.jpg",
        uploaded_by=admin_a.id,
    )
    db.add(photo)
    db.commit()

    link_photo_to_inspection(db, photo, measurement="@190mm")

    items = db.query(InspectionChecklist).filter(
        InspectionChecklist.inspection_id == inspection.id
    ).all()
    assert len(items) == 1
    assert items[0].measured_value == "@190mm"
    assert items[0].category == "auto_imported"


def test_link_photo_without_inspection_returns_none(
    db, admin_a, project_factory, tenant_a
):
    from models.photo import Photo
    from services.photo_inspection_link import link_photo_to_inspection

    project = project_factory(tenant_a.id)
    photo = Photo(
        id=str(uuid.uuid4()),
        project_id=project.id,
        phase_id=None,
        file_key="x.jpg",
        uploaded_by=admin_a.id,
    )
    db.add(photo)
    db.commit()

    assert link_photo_to_inspection(db, photo) is None


def test_link_photo_to_corrective_action(db, admin_a, project_factory, tenant_a):
    """写真→未クローズ NCR への自動リンク（再施工写真の証跡）。"""
    import uuid
    from models.corrective_action import CorrectiveAction
    from models.phase import Phase
    from models.photo import Photo
    from services.photo_inspection_link import link_photo_to_corrective_action

    project = project_factory(tenant_a.id)
    phase = Phase(id=str(uuid.uuid4()), project_id=project.id, name="x", sort_order=0)
    db.add(phase)
    ncr = CorrectiveAction(
        id=str(uuid.uuid4()),
        project_id=project.id,
        title="ジャンカ",
        status="in_progress",
    )
    db.add(ncr)
    photo = Photo(
        id=str(uuid.uuid4()),
        project_id=project.id,
        phase_id=phase.id,
        caption="再施工写真",
        file_key="x.jpg",
        uploaded_by=admin_a.id,
    )
    db.add(photo)
    db.commit()

    result = link_photo_to_corrective_action(db, photo)
    assert result is not None
    assert photo.id in (result.photo_ids or [])


def test_link_skips_closed_corrective_action(db, admin_a, project_factory, tenant_a):
    """クローズ済み NCR にはリンクしない。"""
    import uuid
    from models.corrective_action import CorrectiveAction
    from models.phase import Phase
    from models.photo import Photo
    from services.photo_inspection_link import link_photo_to_corrective_action

    project = project_factory(tenant_a.id)
    phase = Phase(id=str(uuid.uuid4()), project_id=project.id, name="x", sort_order=0)
    db.add(phase)
    ncr = CorrectiveAction(
        id=str(uuid.uuid4()),
        project_id=project.id,
        title="x",
        status="closed",  # クローズ済み
    )
    db.add(ncr)
    photo = Photo(
        id=str(uuid.uuid4()),
        project_id=project.id,
        phase_id=phase.id,
        file_key="x.jpg",
        uploaded_by=admin_a.id,
    )
    db.add(photo)
    db.commit()

    assert link_photo_to_corrective_action(db, photo) is None


def test_link_skips_completed_inspections(db, admin_a, project_factory, tenant_a):
    from models.inspection import Inspection
    from models.phase import Phase
    from models.photo import Photo
    from services.photo_inspection_link import link_photo_to_inspection

    project = project_factory(tenant_a.id)
    phase = Phase(id=str(uuid.uuid4()), project_id=project.id, name="x", sort_order=0)
    db.add(phase)
    inspection = Inspection(
        id=str(uuid.uuid4()),
        project_id=project.id,
        phase_id=phase.id,
        inspection_type="self",
        title="x",
        status="completed",  # 完了済み
    )
    db.add(inspection)
    photo = Photo(
        id=str(uuid.uuid4()),
        project_id=project.id,
        phase_id=phase.id,
        file_key="x.jpg",
        uploaded_by=admin_a.id,
    )
    db.add(photo)
    db.commit()

    assert link_photo_to_inspection(db, photo) is None
