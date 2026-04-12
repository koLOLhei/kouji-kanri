"""CSV/data import router for bulk data ingestion."""

import csv
import io
from datetime import date, datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models.worker import Worker
from models.user import User
from services.auth_service import get_current_user
from services.errors import AppError

router = APIRouter(prefix="/api/import", tags=["import"])

_MAX_CSV_SIZE = 5 * 1024 * 1024  # 5 MB


def _parse_date(value: str) -> date | None:
    """Try to parse a date string in common formats."""
    if not value or not value.strip():
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


@router.post("/workers")
async def import_workers_csv(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Import workers from a CSV file.

    Expected CSV columns (Japanese or English headers accepted):
        name / 名前 (required)
        name_kana / フリガナ
        birth_date / 生年月日  (YYYY-MM-DD or YYYY/MM/DD)
        blood_type / 血液型
        emergency_contact / 緊急連絡先
        emergency_phone / 緊急連絡先電話番号
        notes / 備考

    The file must be UTF-8 or UTF-8 with BOM (utf-8-sig).
    Returns: {"created": N, "errors": [...]}
    """
    if user.role not in ("admin", "super_admin", "manager"):
        raise AppError(403, "インポート権限がありません", "FORBIDDEN")

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise AppError(400, "CSVファイルのみインポートできます", "INVALID_FILE_TYPE")

    content = await file.read()
    if len(content) > _MAX_CSV_SIZE:
        raise AppError(400, f"ファイルサイズが上限（5MB）を超えています", "FILE_TOO_LARGE")

    # Try UTF-8 with BOM first (Excel default), then plain UTF-8
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            raise AppError(400, "ファイルのエンコードはUTF-8にしてください", "INVALID_ENCODING")

    reader = csv.DictReader(io.StringIO(text))

    # Column name aliases (Japanese <-> English)
    _ALIASES: dict[str, str] = {
        "名前": "name",
        "氏名": "name",
        "フリガナ": "name_kana",
        "生年月日": "birth_date",
        "血液型": "blood_type",
        "緊急連絡先": "emergency_contact",
        "緊急連絡先電話番号": "emergency_phone",
        "電話番号": "emergency_phone",
        "備考": "notes",
    }

    def _normalize_row(row: dict) -> dict:
        """Normalize column names using alias map."""
        normalized: dict = {}
        for k, v in row.items():
            canonical = _ALIASES.get(k.strip(), k.strip())
            normalized[canonical] = v.strip() if v else ""
        return normalized

    created = 0
    errors: list[dict] = []

    for i, raw_row in enumerate(reader, start=2):  # row 1 is header
        try:
            row = _normalize_row(raw_row)

            name = row.get("name", "").strip()
            if not name:
                errors.append({"row": i, "error": "名前は必須です"})
                continue

            # Validate birth_date
            birth_date = _parse_date(row.get("birth_date", ""))

            # Check for duplicates within the same tenant
            existing = db.query(Worker).filter(
                Worker.tenant_id == user.tenant_id,
                Worker.name == name,
            ).first()
            if existing:
                errors.append({"row": i, "error": f"同名の作業員が既に存在します: {name}"})
                continue

            worker = Worker(
                tenant_id=user.tenant_id,
                name=name,
                name_kana=row.get("name_kana") or None,
                birth_date=birth_date,
                blood_type=row.get("blood_type") or None,
                emergency_contact=row.get("emergency_contact") or None,
                emergency_phone=row.get("emergency_phone") or None,
                notes=row.get("notes") or None,
            )
            db.add(worker)
            created += 1

        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    if created > 0:
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"DB保存エラー: {e}")

    return {
        "created": created,
        "errors": errors,
        "total_rows": created + len(errors),
    }


@router.post("/subcontractors")
async def import_subcontractors_csv(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Import subcontractors from a CSV file.

    Expected CSV columns:
        company_name / 会社名 (required)
        trade / 職種
        contact_person / 担当者名
        phone / 電話番号
        email / メールアドレス
        address / 住所
    """
    from models.subcontractor import Subcontractor

    if user.role not in ("admin", "super_admin", "manager"):
        raise AppError(403, "インポート権限がありません", "FORBIDDEN")

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise AppError(400, "CSVファイルのみインポートできます", "INVALID_FILE_TYPE")

    content = await file.read()
    if len(content) > _MAX_CSV_SIZE:
        raise AppError(400, "ファイルサイズが上限（5MB）を超えています", "FILE_TOO_LARGE")

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            raise AppError(400, "ファイルのエンコードはUTF-8にしてください", "INVALID_ENCODING")

    reader = csv.DictReader(io.StringIO(text))

    _ALIASES: dict[str, str] = {
        "会社名": "company_name",
        "職種": "trade",
        "担当者名": "contact_person",
        "担当者": "contact_person",
        "電話番号": "phone",
        "メールアドレス": "email",
        "メール": "email",
        "住所": "address",
    }

    def _normalize(row: dict) -> dict:
        normalized: dict = {}
        for k, v in row.items():
            canonical = _ALIASES.get(k.strip(), k.strip())
            normalized[canonical] = v.strip() if v else ""
        return normalized

    created = 0
    errors: list[dict] = []

    for i, raw_row in enumerate(reader, start=2):
        try:
            row = _normalize(raw_row)
            company_name = row.get("company_name", "").strip()
            if not company_name:
                errors.append({"row": i, "error": "会社名は必須です"})
                continue

            existing = db.query(Subcontractor).filter(
                Subcontractor.tenant_id == user.tenant_id,
                Subcontractor.company_name == company_name,
            ).first()
            if existing:
                errors.append({"row": i, "error": f"同名の協力業者が既に存在します: {company_name}"})
                continue

            sub = Subcontractor(
                tenant_id=user.tenant_id,
                company_name=company_name,
                trade=row.get("trade") or None,
                contact_person=row.get("contact_person") or None,
                phone=row.get("phone") or None,
                email=row.get("email") or None,
                address=row.get("address") or None,
            )
            db.add(sub)
            created += 1

        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    if created > 0:
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"DB保存エラー: {e}")

    return {
        "created": created,
        "errors": errors,
        "total_rows": created + len(errors),
    }
