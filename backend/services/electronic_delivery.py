"""
Electronic delivery (電子納品) service.

Generates:
- PHOTO.XML  – デジタル写真管理情報基準 令和7年3月
- INDEX_C.XML – 工事完成図書の電子納品等要領 令和7年3月
- MEET.XML   – 打合せ記録
- Complete ZIP delivery package
"""

from __future__ import annotations

import io
import os
import zipfile
from datetime import date, datetime
from typing import TYPE_CHECKING
from xml.etree import ElementTree as ET
from xml.dom import minidom

from sqlalchemy.orm import Session

from models.photo import Photo
from models.project import Project
from models.meeting import Meeting
from models.drawing import Drawing, DrawingRevision

if TYPE_CHECKING:
    pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pretty_xml(element: ET.Element, encoding: str = "UTF-8") -> str:
    """Return a pretty-printed XML string with XML declaration."""
    raw = ET.tostring(element, encoding="unicode")
    reparsed = minidom.parseString(raw)
    pretty = reparsed.toprettyxml(indent="  ", encoding=None)
    # minidom adds its own declaration – replace with correct one
    lines = pretty.splitlines()
    if lines and lines[0].startswith("<?xml"):
        lines[0] = f'<?xml version="1.0" encoding="{encoding}"?>'
    return "\n".join(lines)


def _date_str(d) -> str:
    if d is None:
        return ""
    if isinstance(d, (datetime,)):
        return d.strftime("%Y-%m-%d")
    if isinstance(d, date):
        return d.strftime("%Y-%m-%d")
    return str(d)


def _photo_filename(index: int) -> str:
    """Generate a CALS-compliant 8-char photo filename, e.g. P0010001.JPG"""
    return f"P{index:08d}.JPG"


def _serial(index: int) -> str:
    return f"{index:03d}"


# ---------------------------------------------------------------------------
# PHOTO.XML
# ---------------------------------------------------------------------------

def generate_photo_xml(project_id: str, db: Session) -> str:
    """
    Generate PHOTO.XML conforming to デジタル写真管理情報基準 令和7年3月.

    Returns the XML string (UTF-8 encoded declaration included).
    """
    project: Project | None = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise ValueError(f"プロジェクトが見つかりません: {project_id}")

    photos: list[Photo] = (
        db.query(Photo)
        .filter(Photo.project_id == project_id)
        .order_by(Photo.photo_category, Photo.photo_number, Photo.created_at)
        .all()
    )

    root = ET.Element("photodata")

    # 基礎情報
    basic = ET.SubElement(root, "基礎情報")
    ET.SubElement(basic, "適用要領基準").text = "デジタル写真管理情報基準 令和7年3月"
    ET.SubElement(basic, "工事番号").text = project.project_code or ""
    ET.SubElement(basic, "工事名称").text = project.name or ""
    ET.SubElement(basic, "受注者名").text = project.contractor_name or ""
    ET.SubElement(basic, "工事場所").text = project.site_address or ""
    ET.SubElement(basic, "工期開始日").text = _date_str(project.start_date)
    ET.SubElement(basic, "工期終了日").text = _date_str(project.end_date)

    for idx, photo in enumerate(photos, start=1):
        taken_date = ""
        if photo.taken_at:
            taken_date = photo.taken_at.strftime("%Y-%m-%d")
        elif photo.created_at:
            taken_date = photo.created_at.strftime("%Y-%m-%d")

        # Derive the CALS filename from photo_number if set, else sequential idx
        file_idx = photo.photo_number if photo.photo_number else idx
        cals_filename = _photo_filename(file_idx)

        photo_elem = ET.SubElement(root, "写真情報", attrib={"写真フォルダ名": "PHOTO/PIC"})
        ET.SubElement(photo_elem, "シリアル番号").text = _serial(idx)
        ET.SubElement(photo_elem, "写真ファイル名").text = cals_filename
        ET.SubElement(photo_elem, "写真大分類").text = "工事"
        ET.SubElement(photo_elem, "写真区分").text = photo.photo_category or "施工状況"
        ET.SubElement(photo_elem, "工種").text = photo.work_type or ""
        ET.SubElement(photo_elem, "種別").text = photo.work_subtype or ""
        ET.SubElement(photo_elem, "細別").text = photo.work_detail or ""
        ET.SubElement(photo_elem, "撮影年月日").text = taken_date
        ET.SubElement(photo_elem, "写真タイトル").text = photo.caption or photo.original_filename or ""
        ET.SubElement(photo_elem, "撮影箇所").text = ""
        ET.SubElement(photo_elem, "代表写真フラグ").text = "0"
        ET.SubElement(photo_elem, "参考図ファイル名")
        if photo.gps_lat is not None and photo.gps_lng is not None:
            ET.SubElement(photo_elem, "緯度").text = str(photo.gps_lat)
            ET.SubElement(photo_elem, "経度").text = str(photo.gps_lng)

    return _pretty_xml(root)


# ---------------------------------------------------------------------------
# MEET.XML
# ---------------------------------------------------------------------------

def generate_meet_xml(project_id: str, db: Session) -> str:
    """
    Generate MEET.XML for meeting minutes.
    """
    project: Project | None = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise ValueError(f"プロジェクトが見つかりません: {project_id}")

    meetings: list[Meeting] = (
        db.query(Meeting)
        .filter(Meeting.project_id == project_id)
        .order_by(Meeting.meeting_date)
        .all()
    )

    root = ET.Element("meetdata")

    basic = ET.SubElement(root, "基礎情報")
    ET.SubElement(basic, "適用要領基準").text = "工事完成図書の電子納品等要領 令和7年3月"
    ET.SubElement(basic, "工事番号").text = project.project_code or ""
    ET.SubElement(basic, "工事名称").text = project.name or ""

    for idx, meeting in enumerate(meetings, start=1):
        m_elem = ET.SubElement(root, "打合せ記録情報")
        ET.SubElement(m_elem, "シリアル番号").text = _serial(idx)
        ET.SubElement(m_elem, "打合せ記録日").text = _date_str(meeting.meeting_date)
        ET.SubElement(m_elem, "打合せ種類").text = meeting.meeting_type or ""
        ET.SubElement(m_elem, "打合せ件名").text = meeting.title or ""
        ET.SubElement(m_elem, "打合せ場所").text = meeting.location or ""
        ET.SubElement(m_elem, "議事内容").text = meeting.minutes or ""
        ET.SubElement(m_elem, "決定事項").text = ""

        attendees = meeting.attendees or []
        for att in attendees if isinstance(attendees, list) else []:
            att_elem = ET.SubElement(m_elem, "出席者")
            ET.SubElement(att_elem, "氏名").text = att.get("name", "")
            ET.SubElement(att_elem, "所属").text = att.get("organization", "")
            ET.SubElement(att_elem, "役職").text = att.get("role", "")

    return _pretty_xml(root)


# ---------------------------------------------------------------------------
# INDEX_C.XML
# ---------------------------------------------------------------------------

def generate_index_xml(project_id: str, db: Session) -> str:
    """
    Generate INDEX_C.XML conforming to 工事完成図書の電子納品等要領 令和7年3月.
    """
    project: Project | None = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise ValueError(f"プロジェクトが見つかりません: {project_id}")

    photo_count = db.query(Photo).filter(Photo.project_id == project_id).count()
    meeting_count = db.query(Meeting).filter(Meeting.project_id == project_id).count()
    drawing_count = db.query(Drawing).filter(Drawing.project_id == project_id).count()

    root = ET.Element("constdata")

    # 基礎情報
    basic = ET.SubElement(root, "基礎情報")
    ET.SubElement(basic, "適用要領基準").text = "工事完成図書の電子納品等要領 令和7年3月"
    ET.SubElement(basic, "工事番号").text = project.project_code or ""
    ET.SubElement(basic, "工事名称").text = project.name or ""
    ET.SubElement(basic, "工事分野").text = "建築"
    ET.SubElement(basic, "作成日").text = date.today().strftime("%Y-%m-%d")

    # 工事件名等
    details = ET.SubElement(root, "工事件名等")
    ET.SubElement(details, "発注者名").text = project.client_name or ""
    ET.SubElement(details, "受注者名").text = project.contractor_name or ""
    ET.SubElement(details, "工事場所").text = project.site_address or ""
    ET.SubElement(details, "工期開始日").text = _date_str(project.start_date)
    ET.SubElement(details, "工期終了日").text = _date_str(project.end_date)
    if project.contract_amount:
        ET.SubElement(details, "請負金額").text = str(project.contract_amount)

    # フォルダ情報
    folders = ET.SubElement(root, "フォルダ情報")

    photo_folder = ET.SubElement(folders, "PHOTO")
    ET.SubElement(photo_folder, "フォルダ名").text = "PHOTO"
    ET.SubElement(photo_folder, "サブフォルダ名").text = "PIC"
    ET.SubElement(photo_folder, "電子媒体管理ファイル名").text = "PHOTO.XML"
    ET.SubElement(photo_folder, "写真枚数").text = str(photo_count)

    meet_folder = ET.SubElement(folders, "MEET")
    ET.SubElement(meet_folder, "フォルダ名").text = "MEET"
    ET.SubElement(meet_folder, "電子媒体管理ファイル名").text = "MEET.XML"
    ET.SubElement(meet_folder, "打合せ記録件数").text = str(meeting_count)

    drawing_folder = ET.SubElement(folders, "DRAWINGF")
    ET.SubElement(drawing_folder, "フォルダ名").text = "DRAWINGF"
    ET.SubElement(drawing_folder, "図面枚数").text = str(drawing_count)

    othrs_folder = ET.SubElement(folders, "OTHRS")
    ET.SubElement(othrs_folder, "フォルダ名").text = "OTHRS"

    return _pretty_xml(root)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_delivery(project_id: str, db: Session) -> dict:
    """
    Validate the completeness of the electronic delivery package.

    Returns a dict with 'is_valid', 'errors', 'warnings', and counts.
    """
    project: Project | None = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        return {"is_valid": False, "errors": ["プロジェクトが見つかりません"], "warnings": [], "counts": {}}

    errors: list[str] = []
    warnings: list[str] = []

    # Required project fields
    if not project.project_code:
        warnings.append("工事番号が未設定です")
    if not project.client_name:
        warnings.append("発注者名が未設定です")
    if not project.contractor_name:
        warnings.append("受注者名（施工者）が未設定です")
    if not project.start_date:
        warnings.append("工期開始日が未設定です")
    if not project.end_date:
        warnings.append("工期終了日が未設定です")

    photos: list[Photo] = db.query(Photo).filter(Photo.project_id == project_id).all()
    photo_count = len(photos)

    # Photos without classification
    unclassified_photos = [p for p in photos if not p.photo_category]
    if unclassified_photos:
        warnings.append(
            f"{len(unclassified_photos)} 枚の写真に写真区分が設定されていません"
        )

    # Check mandatory photo categories
    categories_present = {p.photo_category for p in photos if p.photo_category}
    for required_cat in ("着手前", "完成"):
        if required_cat not in categories_present:
            warnings.append(f"「{required_cat}」写真がありません")

    # Photos missing work_type
    photos_no_worktype = [p for p in photos if not p.work_type]
    if photos_no_worktype:
        warnings.append(
            f"{len(photos_no_worktype)} 枚の写真に工種が設定されていません"
        )

    meeting_count = db.query(Meeting).filter(Meeting.project_id == project_id).count()
    drawing_count = db.query(Drawing).filter(Drawing.project_id == project_id).count()

    if meeting_count == 0:
        warnings.append("打合せ記録が登録されていません")

    counts = {
        "photos": photo_count,
        "meetings": meeting_count,
        "drawings": drawing_count,
        "unclassified_photos": len(unclassified_photos),
    }

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "counts": counts,
        "project": {
            "id": project.id,
            "name": project.name,
            "project_code": project.project_code,
        },
    }


# ---------------------------------------------------------------------------
# Preview
# ---------------------------------------------------------------------------

def preview_delivery(project_id: str, db: Session) -> dict:
    """Return a summary of what will be included in the delivery package."""
    project: Project | None = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise ValueError(f"プロジェクトが見つかりません: {project_id}")

    photos: list[Photo] = (
        db.query(Photo)
        .filter(Photo.project_id == project_id)
        .order_by(Photo.photo_category, Photo.photo_number, Photo.created_at)
        .all()
    )

    # Group photos by category
    by_category: dict[str, int] = {}
    for p in photos:
        cat = p.photo_category or "未分類"
        by_category[cat] = by_category.get(cat, 0) + 1

    meeting_count = db.query(Meeting).filter(Meeting.project_id == project_id).count()

    drawings: list[Drawing] = (
        db.query(Drawing).filter(Drawing.project_id == project_id).all()
    )

    # Latest revision file_key per drawing
    drawing_files = []
    for d in drawings:
        rev: DrawingRevision | None = (
            db.query(DrawingRevision)
            .filter(DrawingRevision.drawing_id == d.id)
            .order_by(DrawingRevision.revision_number.desc())
            .first()
        )
        drawing_files.append({
            "title": d.title,
            "category": d.category,
            "file_key": rev.file_key if rev else None,
        })

    return {
        "project": {
            "id": project.id,
            "name": project.name,
            "project_code": project.project_code,
            "client_name": project.client_name,
            "contractor_name": project.contractor_name,
            "start_date": _date_str(project.start_date),
            "end_date": _date_str(project.end_date),
        },
        "folders": {
            "PHOTO": {
                "xml": "PHOTO/PHOTO.XML",
                "photo_count": len(photos),
                "by_category": by_category,
            },
            "MEET": {
                "xml": "MEET/MEET.XML",
                "meeting_count": meeting_count,
            },
            "DRAWINGF": {
                "drawing_count": len(drawings),
                "drawings": drawing_files,
            },
            "OTHRS": {
                "description": "その他書類",
            },
            "INDE_C": {
                "xml": "INDE_C/INDEX_C.XML",
            },
        },
        "validation": validate_delivery(project_id, db),
    }


# ---------------------------------------------------------------------------
# ZIP Package Builder
# ---------------------------------------------------------------------------

def build_delivery_package(project_id: str, db: Session) -> bytes:
    """
    Build a complete electronic delivery ZIP package.

    Folder structure:
        INDE_C/INDEX_C.XML
        PHOTO/PHOTO.XML
        PHOTO/PIC/P0010001.JPG  …
        MEET/MEET.XML
        DRAWINGF/<drawing files>
        OTHRS/
    """
    from services.storage_service import read_file as storage_read

    project: Project | None = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise ValueError(f"プロジェクトが見つかりません: {project_id}")

    buf = io.BytesIO()

    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:

        # ---- INDEX_C.XML ----
        index_xml = generate_index_xml(project_id, db)
        zf.writestr("INDE_C/INDEX_C.XML", index_xml.encode("utf-8"))

        # ---- PHOTO.XML ----
        photo_xml = generate_photo_xml(project_id, db)
        zf.writestr("PHOTO/PHOTO.XML", photo_xml.encode("utf-8"))

        # ---- Photo files ----
        photos: list[Photo] = (
            db.query(Photo)
            .filter(Photo.project_id == project_id)
            .order_by(Photo.photo_category, Photo.photo_number, Photo.created_at)
            .all()
        )
        for idx, photo in enumerate(photos, start=1):
            file_idx = photo.photo_number if photo.photo_number else idx
            cals_filename = _photo_filename(file_idx)
            photo_data = storage_read(photo.file_key)
            if photo_data:
                zf.writestr(f"PHOTO/PIC/{cals_filename}", photo_data)

        # ---- MEET.XML ----
        meet_xml = generate_meet_xml(project_id, db)
        zf.writestr("MEET/MEET.XML", meet_xml.encode("utf-8"))

        # ---- Drawings ----
        drawings: list[Drawing] = (
            db.query(Drawing).filter(Drawing.project_id == project_id).all()
        )
        for drawing in drawings:
            rev: DrawingRevision | None = (
                db.query(DrawingRevision)
                .filter(DrawingRevision.drawing_id == drawing.id)
                .order_by(DrawingRevision.revision_number.desc())
                .first()
            )
            if rev and rev.file_key:
                drawing_data = storage_read(rev.file_key)
                if drawing_data:
                    # Sanitise filename for ZIP path
                    safe_title = "".join(
                        c if c.isalnum() or c in ("_", "-", ".") else "_"
                        for c in (drawing.title or drawing.id)
                    )
                    ext = os.path.splitext(rev.file_key)[-1] or ".pdf"
                    zf.writestr(f"DRAWINGF/{safe_title}{ext}", drawing_data)

        # ---- OTHRS placeholder ----
        zf.writestr("OTHRS/.gitkeep", b"")

    return buf.getvalue()
