"""許容差マスタのシードデータ — 公共建築工事標準仕様書に基づく"""

from sqlalchemy.orm import Session
from models.concrete_curing import ToleranceStandard

TOLERANCE_DATA = [
    {
        "category": "rebar",
        "item_name": "配筋間隔",
        "tolerance_plus": 10,
        "tolerance_minus": -10,
        "design_unit": "mm",
        "reference_section": "5.3.4",
    },
    {
        "category": "rebar",
        "item_name": "かぶり厚さ(柱・梁)",
        "tolerance_plus": 10,
        "tolerance_minus": -5,
        "design_unit": "mm",
        "reference_section": "5.3.4",
    },
    {
        "category": "rebar",
        "item_name": "かぶり厚さ(スラブ)",
        "tolerance_plus": 10,
        "tolerance_minus": -5,
        "design_unit": "mm",
        "reference_section": "5.3.4",
    },
    {
        "category": "concrete",
        "item_name": "スランプ(8cm)",
        "tolerance_plus": 2.5,
        "tolerance_minus": -2.5,
        "design_unit": "cm",
        "reference_section": "6.5.2",
    },
    {
        "category": "concrete",
        "item_name": "スランプ(18cm)",
        "tolerance_plus": 2.5,
        "tolerance_minus": -1.5,
        "design_unit": "cm",
        "reference_section": "6.5.2",
    },
    {
        "category": "concrete",
        "item_name": "空気量",
        "tolerance_plus": 1.5,
        "tolerance_minus": -1.5,
        "design_unit": "%",
        "reference_section": "6.5.2",
    },
    {
        "category": "concrete",
        "item_name": "塩化物量",
        "tolerance_plus": 0,
        "tolerance_minus": 0,
        "design_unit": "kg/m3",
        "reference_section": "6.5.2",
        "notes": "0.30kg/m3以下",
    },
    {
        "category": "formwork",
        "item_name": "柱・壁の垂直度",
        "tolerance_plus": 3,
        "tolerance_minus": -3,
        "design_unit": "mm/m",
        "reference_section": "6.8.3",
    },
    {
        "category": "formwork",
        "item_name": "床の水平度",
        "tolerance_plus": 3,
        "tolerance_minus": -3,
        "design_unit": "mm/m",
        "reference_section": "6.8.3",
    },
    {
        "category": "steel",
        "item_name": "柱の倒れ",
        "tolerance_plus": 0,
        "tolerance_minus": 0,
        "design_unit": "mm",
        "reference_section": "7.10.4",
        "notes": "H/1000かつ10mm以下",
    },
    {
        "category": "steel",
        "item_name": "梁の上がり・下がり",
        "tolerance_plus": 5,
        "tolerance_minus": -5,
        "design_unit": "mm",
        "reference_section": "7.10.4",
    },
    {
        "category": "dimension",
        "item_name": "柱・壁位置",
        "tolerance_plus": 5,
        "tolerance_minus": -5,
        "design_unit": "mm",
        "reference_section": "6.8.3",
    },
    {
        "category": "dimension",
        "item_name": "開口部位置",
        "tolerance_plus": 5,
        "tolerance_minus": -5,
        "design_unit": "mm",
        "reference_section": "6.8.3",
    },
]


def seed_tolerance_standards(db: Session) -> None:
    """Insert tolerance standard records. Skip if already seeded (check by spec_code)."""
    existing = db.query(ToleranceStandard).filter(
        ToleranceStandard.spec_code == "kokyo_r7"
    ).count()
    if existing > 0:
        return

    for data in TOLERANCE_DATA:
        record = ToleranceStandard(spec_code="kokyo_r7", **data)
        db.add(record)
    db.commit()
