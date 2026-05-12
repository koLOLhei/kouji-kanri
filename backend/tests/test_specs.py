"""Specification browser tests."""


def test_list_chapters_empty(client, admin_a_token, auth):
    r = client.get("/api/specs/chapters", headers=auth(admin_a_token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_chapters_with_seed_data(client, admin_a_token, auth, db):
    from models.spec import SpecChapter
    import uuid
    db.add(SpecChapter(
        id=str(uuid.uuid4()),
        spec_code="kokyo_r7",
        chapter_number=1,
        title="1章 共通事項",
        sort_order=0,
    ))
    db.commit()
    r = client.get("/api/specs/chapters", headers=auth(admin_a_token))
    assert r.status_code == 200
    titles = [c["title"] for c in r.json()]
    assert "1章 共通事項" in titles


def test_filter_chapter_by_number(client, admin_a_token, auth, db):
    from models.spec import SpecChapter
    import uuid
    db.add(SpecChapter(id=str(uuid.uuid4()), spec_code="kokyo_r7",
                        chapter_number=1, title="C1", sort_order=0))
    db.add(SpecChapter(id=str(uuid.uuid4()), spec_code="kokyo_r7",
                        chapter_number=2, title="C2", sort_order=1))
    db.commit()
    r = client.get("/api/specs/chapters?chapter=2", headers=auth(admin_a_token))
    titles = [c["title"] for c in r.json()]
    assert titles == ["C2"]


def test_specs_unauthenticated(client):
    r = client.get("/api/specs/chapters")
    assert r.status_code in (401, 403)
