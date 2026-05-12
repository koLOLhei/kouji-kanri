"""設計変更承認 → Project/CostBudget カスケードテスト。"""

import uuid
from datetime import date


def test_cascade_updates_contract_amount(db, project_factory, tenant_a):
    from datetime import datetime
    from models.cost import CostBudget
    from models.design_change import DesignChange
    from services.design_change_cascade import apply_design_change_cascade

    p = project_factory(tenant_a.id)
    p.contract_amount = 10_000_000
    p.start_date = date(2026, 1, 1)
    p.end_date = date(2026, 12, 31)
    db.commit()

    dc = DesignChange(
        id=str(uuid.uuid4()),
        project_id=p.id,
        tenant_id=tenant_a.id,
        change_number=1,
        title="柱増設",
        change_type="addition",
        status="approved",
        original_amount=10_000_000,
        changed_amount=12_000_000,
        difference_amount=2_000_000,
        original_duration=365,
        changed_duration=380,
        requested_at=datetime.utcnow(),
    )
    db.add(dc)
    db.commit()

    result = apply_design_change_cascade(db, dc)
    assert result["contract_amount_updated"] is True
    assert result["end_date_shifted_days"] == 15
    assert result["budget_lines_added"] == 1

    db.refresh(p)
    assert p.contract_amount == 12_000_000
    assert p.end_date == date(2026, 12, 31).replace(day=31) + (date(2027, 1, 15) - date(2026, 12, 31))

    # CostBudget に design_change 行が増えてる
    budgets = db.query(CostBudget).filter(
        CostBudget.project_id == p.id, CostBudget.category == "design_change"
    ).all()
    assert len(budgets) == 1
    assert budgets[0].budgeted_amount == 2_000_000


def test_cascade_skips_when_not_approved(db, project_factory, tenant_a):
    from datetime import datetime
    from models.design_change import DesignChange
    from services.design_change_cascade import apply_design_change_cascade

    p = project_factory(tenant_a.id)
    p.contract_amount = 10_000_000
    db.commit()

    dc = DesignChange(
        id=str(uuid.uuid4()),
        project_id=p.id,
        tenant_id=tenant_a.id,
        change_number=1,
        title="保留",
        change_type="addition",
        status="draft",  # 未承認
        original_amount=10_000_000,
        changed_amount=12_000_000,
        difference_amount=2_000_000,
        requested_at=datetime.utcnow(),
    )
    db.add(dc)
    db.commit()

    result = apply_design_change_cascade(db, dc)
    assert result == {"skipped": "not_approved"}
    db.refresh(p)
    assert p.contract_amount == 10_000_000  # 変更されない


def test_approve_via_api_triggers_cascade(
    client, admin_a_token, auth, project_factory, tenant_a
):
    """API経由で承認した時もカスケードが走る回帰テスト。"""
    from datetime import datetime, timezone
    from models.design_change import DesignChange
    from models.cost import CostBudget
    import uuid as _uuid
    from database import SessionLocal

    p = project_factory(tenant_a.id)
    p.contract_amount = 5_000_000
    p.start_date = date(2026, 1, 1)
    p.end_date = date(2026, 12, 31)

    sess = SessionLocal()
    try:
        merged = sess.merge(p)
        sess.commit()
        dc = DesignChange(
            id=str(_uuid.uuid4()),
            project_id=p.id,
            tenant_id=tenant_a.id,
            change_number=1,
            title="壁追加",
            change_type="addition",
            status="submitted",
            original_amount=5_000_000,
            changed_amount=5_800_000,
            difference_amount=800_000,
            original_duration=300,
            changed_duration=310,
            requested_at=datetime.utcnow(),
        )
        sess.add(dc)
        sess.commit()
        dc_id = dc.id
    finally:
        sess.close()

    # API で承認
    r = client.put(
        f"/api/projects/{p.id}/design-changes/{dc_id}",
        json={"status": "approved"},
        headers=auth(admin_a_token),
    )
    assert r.status_code == 200

    # Project が自動更新されているか
    sess = SessionLocal()
    try:
        from models.project import Project
        updated = sess.query(Project).filter(Project.id == p.id).first()
        assert updated.contract_amount == 5_800_000
        assert updated.end_date == date(2027, 1, 10)  # 12/31 + 10日
        budgets = sess.query(CostBudget).filter(
            CostBudget.project_id == p.id, CostBudget.category == "design_change"
        ).all()
        assert len(budgets) == 1
        assert budgets[0].budgeted_amount == 800_000
    finally:
        sess.close()
