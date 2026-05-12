"""PDF仕様書を全文抽出して spec_contents テーブルに取り込む。

使い方:
  cd backend && python scripts/ingest_specs.py

事前準備:
  pip install pymupdf
"""

import os
import sys
import uuid
from datetime import datetime, timezone

# プロジェクトルートを sys.path に追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import fitz  # PyMuPDF
from sqlalchemy.orm import Session

from database import SessionLocal, engine, Base
from models.spec import SpecContent


# 取り込み対象PDFと識別子のマッピング
SPECS_TO_INGEST = [
    {
        "spec_code": "kokyo_r4",
        "title": "公共建築工事標準仕様書（建築工事編）令和4年版",
        "path": "/Users/koheiogawa/Downloads/工事管理学習用/公共建築工事標準仕様書（建築工事編）R4.pdf",
    },
    {
        "spec_code": "kaisyu_r2",
        "title": "建築改修工事特記仕様書（令和2年4月版）",
        "path": "/Users/koheiogawa/Downloads/工事管理学習用/建築改修工事特記仕様書（令和2年4月版）.pdf",
    },
    {
        "spec_code": "yokohama_estimate",
        "title": "建築工事積算マニュアル（横浜市）",
        "path": "/Users/koheiogawa/Downloads/工事管理学習用/建築工事積算マニュアル - 横浜市.pdf",
    },
]


def extract_page_metadata(text: str) -> dict[str, str]:
    """ページ本文から章/節/タイトル候補を抽出。"""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    chapter = section = title = None
    for line in lines[:15]:
        if not chapter:
            # "第○章" or "○章"
            if "章" in line and len(line) < 80 and any(c.isdigit() for c in line):
                chapter = line
                continue
        if not section:
            # "○.○" 形式の節
            if (line.count(".") >= 1 or "節" in line) and len(line) < 80:
                section = line
                continue
        if not title and len(line) < 100 and not any(c in line for c in ["。", "、"]):
            title = line
            break
    return {"chapter": chapter, "section": section, "title": title}


def ingest_pdf(db: Session, spec_code: str, path: str, title: str) -> int:
    """PDFを取り込み、取り込んだページ数を返す。"""
    if not os.path.exists(path):
        print(f"  ✗ {spec_code}: file not found at {path}")
        return 0

    # 既存データをクリア
    db.query(SpecContent).filter(SpecContent.spec_code == spec_code).delete()
    db.commit()

    doc = fitz.open(path)
    count = 0
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text()
        if not text.strip():
            continue
        meta = extract_page_metadata(text)
        sc = SpecContent(
            id=str(uuid.uuid4()),
            spec_code=spec_code,
            page_number=page_num,
            chapter=meta.get("chapter"),
            section=meta.get("section"),
            title=meta.get("title"),
            body_text=text,
            ingested_at=datetime.now(timezone.utc),
        )
        db.add(sc)
        count += 1
        if count % 100 == 0:
            db.commit()
            print(f"    ... {count} pages")
    db.commit()
    doc.close()
    print(f"  ✓ {spec_code} ({title}): {count} pages ingested")
    return count


def main():
    print("=== PDF仕様書取り込み開始 ===")
    # テーブル作成 (未存在時)
    Base.metadata.create_all(bind=engine, tables=[SpecContent.__table__])

    db = SessionLocal()
    try:
        total = 0
        for spec in SPECS_TO_INGEST:
            total += ingest_pdf(db, spec["spec_code"], spec["path"], spec["title"])
        print(f"\n=== 完了: 計 {total} ページ取り込み ===")
    finally:
        db.close()


if __name__ == "__main__":
    main()
