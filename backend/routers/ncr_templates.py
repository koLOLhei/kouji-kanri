"""NCRテンプレート（不適合報告書テンプレート） router — 静的データ返却."""

from fastapi import APIRouter, Depends
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/ncr-templates", tags=["ncr-templates"])

NCR_TEMPLATES = [
    {
        "code": "crack",
        "title": "クラック（ひび割れ）",
        "description": "コンクリート表面のひび割れ",
        "severity": "major",
        "typical_cause": "乾燥収縮、温度応力",
        "typical_repair": "エポキシ樹脂注入",
    },
    {
        "code": "water_leak",
        "title": "漏水",
        "description": "防水層からの漏水",
        "severity": "major",
        "typical_cause": "防水施工不良、シーリング劣化",
        "typical_repair": "防水やり替え",
    },
    {
        "code": "tile_float",
        "title": "タイル浮き",
        "description": "タイルの接着不良による浮き",
        "severity": "minor",
        "typical_cause": "下地処理不良、接着剤不足",
        "typical_repair": "タイル張替え",
    },
    {
        "code": "rebar_exposure",
        "title": "鉄筋露出",
        "description": "かぶり不足による鉄筋露出",
        "severity": "critical",
        "typical_cause": "かぶり厚さ管理不良",
        "typical_repair": "断面修復",
    },
    {
        "code": "level_error",
        "title": "レベル不良",
        "description": "床・天井のレベル誤差",
        "severity": "minor",
        "typical_cause": "墨出し誤差、型枠精度",
        "typical_repair": "セルフレベリング材",
    },
    {
        "code": "paint_defect",
        "title": "塗装不良",
        "description": "塗膜の剥離・ムラ・気泡",
        "severity": "minor",
        "typical_cause": "下地処理不良、塗布条件",
        "typical_repair": "研磨・再塗装",
    },
    {
        "code": "steel_weld_defect",
        "title": "溶接欠陥",
        "description": "鉄骨溶接部の欠陥",
        "severity": "critical",
        "typical_cause": "溶接条件不適切、技量不足",
        "typical_repair": "欠陥除去・再溶接",
    },
    {
        "code": "moisture",
        "title": "結露・カビ",
        "description": "壁面・天井の結露やカビ",
        "severity": "minor",
        "typical_cause": "断熱不足、換気不良",
        "typical_repair": "断熱補強・換気改善",
    },
]


@router.get("")
def list_ncr_templates(
    user: User = Depends(get_current_user),
):
    return NCR_TEMPLATES
