"""施工事例自動生成サービス — 完了工事からSEOコンテンツの基礎データを生成。

HP公開用の施工実績ページの素材を自動生成。
工事の写真・データ・工期・工種をまとめ、テンプレートに流し込む。
"""

from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.project import Project
from models.phase import Phase
from models.photo import Photo
from models.daily_report import DailyReport
from models.inspection import Inspection
from services.storage_service import generate_presigned_url


def generate_case_study(project_id: str, db: Session) -> dict:
    """完了した工事から施工事例データを自動生成。"""

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("案件が見つかりません")

    # 工程情報
    phases = db.query(Phase).filter(Phase.project_id == project_id).order_by(Phase.order_index).all()
    total_phases = len(phases)
    completed_phases = sum(1 for p in phases if p.status == "completed")

    # 写真統計
    total_photos = db.query(func.count(Photo.id)).filter(Photo.project_id == project_id).scalar() or 0
    # 代表写真（最初と最後）
    first_photo = db.query(Photo).filter(Photo.project_id == project_id).order_by(Photo.created_at.asc()).first()
    last_photo = db.query(Photo).filter(Photo.project_id == project_id).order_by(Photo.created_at.desc()).first()

    # 日報統計
    total_reports = db.query(func.count(DailyReport.id)).filter(DailyReport.project_id == project_id).scalar() or 0
    avg_workers = db.query(func.avg(DailyReport.worker_count)).filter(
        DailyReport.project_id == project_id,
        DailyReport.worker_count.isnot(None),
    ).scalar()

    # 検査結果
    inspections = db.query(Inspection).filter(
        Inspection.project_id == project_id,
        Inspection.status == "completed",
    ).all()
    passed_inspections = sum(1 for i in inspections if i.result == "pass")

    # 工期計算
    work_days = total_reports
    start_date = project.start_date
    end_date = project.end_date

    # 工種リスト
    work_types = list(set(p.name for p in phases if p.name))

    # 施工事例データ
    case_study = {
        "id": project.id,
        "title": project.name,
        "project_code": project.project_code,
        "status": project.status,
        "category": _infer_category(project, work_types),

        # 基本情報
        "location": project.location or "",
        "client_name": project.client_name or "",
        "start_date": start_date.isoformat() if start_date else None,
        "end_date": end_date.isoformat() if end_date else None,
        "work_days": work_days,

        # 工事内容
        "work_types": work_types,
        "phases": [{"name": p.name, "status": p.status} for p in phases],

        # 数値実績
        "stats": {
            "total_photos": total_photos,
            "total_reports": total_reports,
            "avg_workers_per_day": round(avg_workers, 1) if avg_workers else 0,
            "inspections_passed": passed_inspections,
            "inspections_total": len(inspections),
        },

        # 代表写真
        "hero_photo": {
            "url": generate_presigned_url(last_photo.file_key) if last_photo and last_photo.file_key else None,
            "caption": last_photo.caption if last_photo else None,
        } if last_photo else None,
        "before_photo": {
            "url": generate_presigned_url(first_photo.file_key) if first_photo and first_photo.file_key else None,
            "caption": first_photo.caption if first_photo else None,
        } if first_photo else None,

        # SEO用テキスト素材
        "seo_draft": {
            "meta_title": f"{project.name} | 施工実績 | 株式会社KAMO",
            "meta_description": f"{project.location or '東京・神奈川'}の{_infer_category(project, work_types)}。{'・'.join(work_types[:3])}を実施。工期{work_days}日、写真記録{total_photos}枚。",
            "h1": project.name,
            "body_intro": f"{'・'.join(work_types[:3])}の施工を行いました。工期{work_days}日間、延べ作業員{round((avg_workers or 0) * work_days)}人日の工事です。全{total_photos}枚の施工写真をGPS・日時付きで記録し、施工品質を証明しています。",
        },

        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": "KAMO Case Study Generator",
    }

    return case_study


def list_publishable_projects(tenant_id: str, db: Session) -> list[dict]:
    """公開可能な施工事例の一覧を返す（完了済みまたは検査済みの案件）。"""
    projects = db.query(Project).filter(
        Project.tenant_id == tenant_id,
        Project.status.in_(["completed", "warranty", "inspection"]),
    ).order_by(Project.end_date.desc()).all()

    results = []
    for p in projects:
        photo_count = db.query(func.count(Photo.id)).filter(Photo.project_id == p.id).scalar() or 0
        results.append({
            "id": p.id,
            "name": p.name,
            "project_code": p.project_code,
            "status": p.status,
            "location": p.location,
            "end_date": p.end_date.isoformat() if p.end_date else None,
            "photo_count": photo_count,
        })
    return results


def _infer_category(project: Project, work_types: list[str]) -> str:
    """工種から施工カテゴリを推定。"""
    name = (project.name or "").lower()
    types_str = " ".join(work_types).lower()

    if "マンション" in name or "大規模" in types_str:
        return "マンション大規模修繕"
    if "外壁" in types_str or "塗装" in types_str:
        return "外壁塗装"
    if "防水" in types_str:
        return "防水工事"
    if "リフォーム" in name or "内装" in types_str:
        return "リフォーム"
    return "建設工事"
