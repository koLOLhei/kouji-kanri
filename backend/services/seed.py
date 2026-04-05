"""Seed data: 仕様書23章のデータ + デフォルトテナント・ユーザー"""

from sqlalchemy.orm import Session
from models.tenant import Tenant
from models.user import User
from models.spec import SpecChapter
from models.submission import DocumentTemplate
from services.auth_service import hash_password

# 公共建築工事標準仕様書（建築工事編）令和7年版 全23章
SPEC_CHAPTERS = [
    {"chapter": 1, "title": "各章共通事項", "sections": [
        "共通事項", "工事関係図書", "工事現場管理", "材料", "施工", "工事検査及び技術検査", "完成図等"
    ], "docs": ["実施工程表", "施工計画書", "施工図", "工事写真", "品質管理記録"]},
    {"chapter": 2, "title": "仮設工事", "sections": [
        "共通事項", "縄張り、遣方、足場等", "仮設物", "仮設物撤去等"
    ], "docs": ["足場計画図", "仮設計画書", "撤去完了写真"]},
    {"chapter": 3, "title": "土工事", "sections": [
        "共通事項", "根切り等", "山留め"
    ], "docs": ["根切り検査写真", "山留め施工記録", "土質試験結果"]},
    {"chapter": 4, "title": "地業工事", "sections": [
        "共通事項", "試験及び報告書", "既製コンクリート杭地業", "鋼杭地業",
        "場所打ちコンクリート杭地業", "砂利、砂、捨コンクリート地業等",
        "地盤改良（深層混合処理工法）", "地盤改良（浅層混合処理工法）"
    ], "docs": ["杭施工記録", "載荷試験報告書", "地盤調査報告書"]},
    {"chapter": 5, "title": "鉄筋工事", "sections": [
        "共通事項", "材料", "加工及び組立", "ガス圧接", "機械式継手", "溶接継手"
    ], "docs": ["配筋検査写真", "鉄筋材料試験成績表", "ガス圧接試験報告書", "配筋図"]},
    {"chapter": 6, "title": "コンクリート工事", "sections": [
        "共通事項", "コンクリートの種類及び品質", "コンクリートの材料及び調合",
        "レディーミクストコンクリート工場の選定、コンクリートの製造及び運搬",
        "コンクリートの品質管理", "コンクリートの工事現場内運搬、打込み及び締固め",
        "養生", "型枠", "試験等"
    ], "docs": ["コンクリート配合計画書", "スランプ試験記録", "圧縮強度試験報告書",
                "打設記録", "養生記録", "型枠施工写真"]},
    {"chapter": 7, "title": "鉄骨工事", "sections": [
        "共通事項", "材料", "工作一般", "高力ボルト接合", "普通ボルト接合",
        "溶接接合", "スタッド溶接及び床構造用のデッキプレートの溶接",
        "錆止め塗装", "耐火被覆", "工事現場施工", "軽量形鋼", "溶融亜鉛めっき工法"
    ], "docs": ["鉄骨製作図", "溶接検査報告書", "高力ボルト締付検査記録", "耐火被覆施工記録"]},
    {"chapter": 8, "title": "コンクリートブロック、ALCパネル及び押出成形セメント板工事", "sections": [
        "共通事項", "補強コンクリートブロック造", "コンクリートブロック帳壁及び塀",
        "ALCパネル", "押出成形セメント板（ECP）"
    ], "docs": ["施工写真", "材料試験成績表"]},
    {"chapter": 9, "title": "防水工事", "sections": [
        "共通事項", "アスファルト防水", "改質アスファルトシート防水",
        "合成高分子系ルーフィングシート防水", "塗膜防水", "ケイ酸質系塗布防水", "シーリング"
    ], "docs": ["防水施工写真", "防水材料承認願", "漏水試験記録"]},
    {"chapter": 10, "title": "石工事", "sections": [
        "共通事項", "材料", "外壁湿式工法", "内壁空積工法",
        "外壁乾式工法", "床及び階段の石張り", "特殊部位の石張り"
    ], "docs": ["石材見本承認", "施工写真"]},
    {"chapter": 11, "title": "タイル工事", "sections": [
        "共通事項", "セメントモルタルによるタイル張り", "有機系接着剤によるタイル張り"
    ], "docs": ["タイル見本承認", "接着力試験報告書", "施工写真"]},
    {"chapter": 12, "title": "木工事", "sections": [
        "共通事項", "材料", "防腐・防蟻・防虫処理等",
        "鉄筋コンクリート造等の内部間仕切軸組及び床組", "窓、出入口その他", "床板張り", "壁及び天井下地"
    ], "docs": ["木材材料検査記録", "防腐処理記録", "施工写真"]},
    {"chapter": 13, "title": "屋根及びとい工事", "sections": [
        "共通事項", "長尺金属板葺", "折板葺", "粘土瓦葺", "とい"
    ], "docs": ["屋根施工写真", "材料承認願"]},
    {"chapter": 14, "title": "金属工事", "sections": [
        "共通事項", "表面処理", "溶接、ろう付けその他",
        "軽量鉄骨天井下地", "軽量鉄骨壁下地", "金属成形板張り", "アルミニウム製笠木"
    ], "docs": ["施工写真", "材料承認願"]},
    {"chapter": 15, "title": "左官工事", "sections": [
        "共通事項", "下地", "モルタル塗り", "床コンクリート直均し仕上げ",
        "セルフレベリング材塗り", "仕上塗材仕上げ", "マスチック塗材塗り",
        "せっこうプラスター塗り", "ドロマイトプラスター塗り", "しっくい塗り", "こまい壁塗り", "ロックウール吹付け"
    ], "docs": ["施工写真", "材料配合記録"]},
    {"chapter": 16, "title": "建具工事", "sections": [
        "共通事項", "アルミニウム製建具", "樹脂製建具", "鋼製建具", "鋼製軽量建具",
        "ステンレス製建具", "木製建具", "建具用金物", "自動ドア開閉装置",
        "自閉式上吊り引戸装置", "重量シャッター", "軽量シャッター", "オーバーヘッドドア", "ガラス"
    ], "docs": ["建具製作図", "施工写真", "気密試験報告書"]},
    {"chapter": 17, "title": "カーテンウォール工事", "sections": [
        "共通事項", "メタルカーテンウォール", "PCカーテンウォール"
    ], "docs": ["製作図", "施工写真", "気密・水密試験報告書"]},
    {"chapter": 18, "title": "塗装工事", "sections": [
        "共通事項", "素地ごしらえ", "錆止め塗料塗り", "合成樹脂調合ペイント塗り",
        "クリヤラッカー塗り", "アクリル樹脂系非水分散形塗料塗り", "耐候性塗料塗り",
        "つや有合成樹脂エマルションペイント塗り", "合成樹脂エマルションペイント塗り",
        "ウレタン樹脂ワニス塗り", "ピグメントステイン塗り", "木材保護塗料塗り"
    ], "docs": ["塗装施工写真", "塗料承認願", "膜厚測定記録"]},
    {"chapter": 19, "title": "内装工事", "sections": [
        "共通事項", "ビニル床シート、ビニル床タイル及びゴム床タイル張り", "カーペット敷き",
        "合成樹脂塗床", "フローリング張り", "畳敷き",
        "せっこうボード、その他ボード及び合板張り", "壁紙張り", "断熱・防露"
    ], "docs": ["施工写真", "材料承認願"]},
    {"chapter": 20, "title": "ユニット及びその他の工事", "sections": [
        "共通事項", "ユニット工事等", "プレキャストコンクリート工事",
        "間知石及びコンクリート間知ブロック積み"
    ], "docs": ["施工写真", "製作図"]},
    {"chapter": 21, "title": "排水工事", "sections": [
        "共通事項", "屋外雨水排水", "街きょ、縁石及び側溝"
    ], "docs": ["排水管施工写真", "通水試験記録"]},
    {"chapter": 22, "title": "舗装工事", "sections": [
        "共通事項", "路床", "路盤", "アスファルト舗装", "コンクリート舗装",
        "カラー舗装", "透水性アスファルト舗装", "ブロック系舗装", "砂利敷き"
    ], "docs": ["舗装施工写真", "締固め試験記録", "アスファルト温度管理記録"]},
    {"chapter": 23, "title": "植栽及び屋上緑化工事", "sections": [
        "共通事項", "植栽基盤", "植樹", "芝張り、吹付けは種及び地被類", "屋上緑化"
    ], "docs": ["植栽施工写真", "樹木検査記録"]},
]

DEFAULT_TEMPLATES = {
    "process_completion": """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { font-family: "Noto Sans JP", sans-serif; margin: 40px; font-size: 12px; }
h1 { font-size: 18px; text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
h2 { font-size: 14px; margin-top: 20px; }
table { width: 100%; border-collapse: collapse; margin: 10px 0; }
th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
th { background: #f0f0f0; }
.photos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
.photo-item { text-align: center; }
.photo-item img { max-width: 100%; max-height: 200px; }
.footer { margin-top: 30px; text-align: right; font-size: 10px; }
</style></head><body>
<h1>工程完了報告書</h1>
<table>
<tr><th>工事名</th><td>{{ project.name }}</td></tr>
<tr><th>工程名</th><td>{{ phase.name }}</td></tr>
<tr><th>施工者</th><td>{{ project.contractor_name or '-' }}</td></tr>
<tr><th>発注者</th><td>{{ project.client_name or '-' }}</td></tr>
<tr><th>報告日</th><td>{{ generated_at.strftime('%Y年%m月%d日') }}</td></tr>
</table>
<h2>工事写真</h2>
<div class="photos">
{% for photo in photos %}
<div class="photo-item">
<p>{{ photo.caption or '写真' ~ loop.index }}</p>
</div>
{% endfor %}
</div>
<h2>検査・試験報告</h2>
<table>
<tr><th>No.</th><th>報告書名</th><th>種別</th><th>状態</th></tr>
{% for report in reports %}
<tr><td>{{ loop.index }}</td><td>{{ report.title }}</td><td>{{ report.report_type }}</td><td>{{ report.status }}</td></tr>
{% endfor %}
</table>
<div class="footer">自動生成: {{ generated_at.strftime('%Y-%m-%d %H:%M') }}</div>
</body></html>""",
    "photo_report": """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { font-family: "Noto Sans JP", sans-serif; margin: 30px; font-size: 11px; }
h1 { font-size: 16px; text-align: center; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #333; padding: 5px; }
th { background: #f0f0f0; }
</style></head><body>
<h1>工事写真帳</h1>
<table>
<tr><th>工事名</th><td colspan="3">{{ project.name }}</td></tr>
<tr><th>工程</th><td>{{ phase.name }}</td><th>撮影枚数</th><td>{{ photos|length }}枚</td></tr>
</table>
{% for photo in photos %}
<table style="margin-top: 15px;">
<tr><th style="width:80px">写真No.</th><td>{{ loop.index }}</td><th style="width:80px">撮影日</th><td>{{ photo.taken_at.strftime('%Y/%m/%d') if photo.taken_at else '-' }}</td></tr>
<tr><th>説明</th><td colspan="3">{{ photo.caption or '-' }}</td></tr>
</table>
{% endfor %}
</body></html>""",
}


def seed_initial_data(db: Session):
    """初期データ投入"""
    # テナントが既にあればスキップ
    if db.query(Tenant).first():
        return

    # デフォルトテナント
    tenant = Tenant(
        name="デモ建設株式会社",
        slug="demo",
        schema_name="public",  # デモはpublicスキーマ直接使用
        plan="enterprise",
        max_projects=100,
        max_users=50,
    )
    db.add(tenant)
    db.flush()

    # 管理者ユーザー
    admin = User(
        tenant_id=tenant.id,
        email="admin@demo.co.jp",
        password_hash=hash_password("admin123"),
        name="管理者",
        role="admin",
    )
    db.add(admin)

    # 作業員ユーザー
    worker = User(
        tenant_id=tenant.id,
        email="worker@demo.co.jp",
        password_hash=hash_password("worker123"),
        name="現場作業員",
        role="worker",
    )
    db.add(worker)

    # 仕様書チャプター
    sort = 0
    for ch in SPEC_CHAPTERS:
        # 章レベル
        chapter = SpecChapter(
            spec_code="kokyo_r7",
            chapter_number=ch["chapter"],
            section_number=None,
            title=f'{ch["chapter"]}章 {ch["title"]}',
            required_documents=ch["docs"],
            sort_order=sort,
        )
        db.add(chapter)
        sort += 1

        # 節レベル
        for i, section in enumerate(ch["sections"], 1):
            sec = SpecChapter(
                spec_code="kokyo_r7",
                chapter_number=ch["chapter"],
                section_number=i,
                title=f'{ch["chapter"]}.{i} {section}',
                sort_order=sort,
            )
            db.add(sec)
            sort += 1

    # デフォルト書類テンプレート
    for code, html in DEFAULT_TEMPLATES.items():
        tmpl = DocumentTemplate(
            template_code=code,
            region=None,
            template_type=code,
            name=code.replace("_", " ").title(),
            html_template=html,
        )
        db.add(tmpl)

    db.commit()


def seed_spec_chapters_for_schema(db: Session):
    """テナント用スキーマに仕様書データを投入"""
    if db.query(SpecChapter).first():
        return
    sort = 0
    for ch in SPEC_CHAPTERS:
        chapter = SpecChapter(
            spec_code="kokyo_r7",
            chapter_number=ch["chapter"],
            section_number=None,
            title=f'{ch["chapter"]}章 {ch["title"]}',
            required_documents=ch["docs"],
            sort_order=sort,
        )
        db.add(chapter)
        sort += 1
        for i, section in enumerate(ch["sections"], 1):
            sec = SpecChapter(
                spec_code="kokyo_r7",
                chapter_number=ch["chapter"],
                section_number=i,
                title=f'{ch["chapter"]}.{i} {section}',
                sort_order=sort,
            )
            db.add(sec)
            sort += 1
    for code, html in DEFAULT_TEMPLATES.items():
        tmpl = DocumentTemplate(
            template_code=code, region=None, template_type=code,
            name=code.replace("_", " ").title(), html_template=html,
        )
        db.add(tmpl)
    db.commit()
