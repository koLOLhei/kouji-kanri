"""工種別 標準施工フロー・検査項目・材料カテゴリ。

各工種の施工計画書テンプレートで、ユーザーが値を渡さなかった場合の
デフォルト内容を提供する。実際の材料・製品名はプロジェクトごとに
別途指定する前提で、ここでは標準的な施工手順と検査項目を定義する。

データは「公共建築改修工事標準仕様書（建築工事編）」および各工種の
標準的施工計画書を参考にして構築。
"""

from typing import Any


# 標準的な使用材料カテゴリ (具体製品はプロジェクト毎に指定)
def _materials_template(spec_categories: list[str]) -> list[dict[str, str]]:
    """材料カテゴリ名のリストから空欄付き材料テーブルを生成。"""
    return [
        {"name": cat, "spec": "", "manufacturer": "", "location": ""}
        for cat in spec_categories
    ]


WORK_TYPE_DEFAULTS: dict[str, dict[str, Any]] = {
    "外壁改修": {
        "materials": _materials_template([
            "シーリング材（プライマー共）",
            "注入・アンカーピンニング用樹脂",
            "欠損部充填材（ポリマーセメントモルタル）",
            "下地調整材（ポリマーセメントフィラー）",
            "外壁塗装材",
        ]),
        "construction_flow": [
            "事前調査（打診・剥離試験）",
            "養生・足場設置",
            "下地処理（劣化部のはつり・高圧洗浄）",
            "ひび割れ補修（樹脂注入・Uカットシール）",
            "浮き部アンカーピンニング",
            "欠損部充填",
            "シーリング材打設",
            "下塗（シーラー）",
            "中塗・上塗",
            "完了検査・是正",
            "清掃・養生撤去",
        ],
        "inspection_items": [
            {"name": "下地調査結果確認", "method": "打診・赤外線", "criteria": "浮き面積比率・劣化グレード判定", "inspector": "現場代理人"},
            {"name": "シーリング材打設後検査", "method": "目視・寸法測定", "criteria": "幅深さ仕様通り・連続性", "inspector": "現場代理人"},
            {"name": "塗装膜厚検査", "method": "膜厚計測定", "criteria": "標準膜厚の0.8倍以上", "inspector": "監理技術者"},
            {"name": "完了時付着試験", "method": "テープ法・引張試験", "criteria": "0.4N/mm²以上", "inspector": "監理技術者"},
        ],
    },
    "アスファルト防水改修": {
        "materials": _materials_template([
            "アスファルトプライマー",
            "アスファルト（JIS K2207）",
            "ストレッチルーフィング1000（JIS A6022）",
            "改質アスファルトルーフィング",
            "押え金物・ドレン",
            "保護モルタル",
        ]),
        "construction_flow": [
            "既存防水層の調査・診断",
            "既存防水層撤去（必要時）",
            "下地調整・モルタル補修",
            "脱気装置設置（絶縁工法時）",
            "アスファルトプライマー塗布",
            "アスファルト・ルーフィング積層",
            "立上り部処理",
            "押え層施工（保護モルタル・脱気筒設置）",
            "ドレン・端部金物取付",
            "水張り試験",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "下地含水率測定", "method": "含水率計", "criteria": "10%以下", "inspector": "現場代理人"},
            {"name": "プライマー塗布量確認", "method": "面積/缶数計算", "criteria": "規定塗布量以上", "inspector": "現場代理人"},
            {"name": "防水層付着試験", "method": "目視・部分剥離", "criteria": "層間剥離なし", "inspector": "現場代理人"},
            {"name": "水張り試験", "method": "24時間湛水", "criteria": "漏水なし", "inspector": "監理技術者"},
        ],
    },
    "シート防水": {
        "materials": _materials_template([
            "塩化ビニル樹脂系シート / 加硫ゴム系シート",
            "接着剤（溶剤系・水性）",
            "プライマー",
            "ドレン・脱気装置・端部金物",
        ]),
        "construction_flow": [
            "下地調査・含水率測定",
            "下地補修・清掃",
            "プライマー塗布",
            "シート敷設（接着 or 機械固定）",
            "シート接合（熱融着 or 溶剤接着）",
            "立上り処理",
            "端部・ドレン部処理",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "下地含水率", "method": "含水率計", "criteria": "10%以下", "inspector": "現場代理人"},
            {"name": "シート接合部試験", "method": "テスター・目視", "criteria": "剥離なし・浮きなし", "inspector": "現場代理人"},
            {"name": "水張り試験", "method": "24時間湛水", "criteria": "漏水なし", "inspector": "監理技術者"},
        ],
    },
    "塗膜防水": {
        "materials": _materials_template([
            "ウレタン系防水材 / アクリルゴム系防水材",
            "プライマー",
            "補強布（メッシュ）",
            "トップコート",
        ]),
        "construction_flow": [
            "下地調整・清掃",
            "プライマー塗布",
            "補強布貼付（入隅・端部）",
            "防水材1層目塗布",
            "防水材2層目塗布（規定膜厚確保）",
            "トップコート塗布",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "膜厚測定", "method": "電磁式膜厚計", "criteria": "規定膜厚以上（通常2mm）", "inspector": "現場代理人"},
            {"name": "ピンホール検査", "method": "目視・テスター", "criteria": "ピンホールなし", "inspector": "現場代理人"},
            {"name": "水張り試験", "method": "24時間湛水", "criteria": "漏水なし", "inspector": "監理技術者"},
        ],
    },
    "シーリング": {
        "materials": _materials_template([
            "ポリウレタン系シーリング材",
            "変成シリコーン系シーリング材",
            "シリコーン系シーリング材",
            "プライマー（各シーリング材専用）",
            "バックアップ材・ボンドブレーカー",
            "マスキングテープ",
        ]),
        "construction_flow": [
            "目地清掃（既存シーリング撤去含む）",
            "バックアップ材セット",
            "マスキングテープ貼付",
            "プライマー塗布",
            "シーリング材打設",
            "ヘラ仕上げ・余剰除去",
            "マスキング撤去",
            "養生・硬化",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "材料確認", "method": "ロット番号・有効期限", "criteria": "未硬化・有効期限内", "inspector": "現場代理人"},
            {"name": "打設状況検査", "method": "目視", "criteria": "連続性・充填性", "inspector": "現場代理人"},
            {"name": "硬化後検査", "method": "目視・指触", "criteria": "完全硬化・剥離なし", "inspector": "現場代理人"},
        ],
    },
    "タイル": {
        "materials": _materials_template([
            "外装タイル（JIS A 5209）",
            "張付モルタル",
            "下地モルタル",
            "目地材",
            "アンカーピン（既存改修時）",
        ]),
        "construction_flow": [
            "下地調整・墨出し",
            "張付モルタル塗布",
            "タイル張付（マスク張り・改良圧着張り 等）",
            "目地詰め",
            "清掃・仕上げ",
            "養生（吸水養生・乾燥養生）",
            "打診検査・完了検査",
        ],
        "inspection_items": [
            {"name": "材料受入検査", "method": "梱包・色合い確認", "criteria": "見本品と同等", "inspector": "現場代理人"},
            {"name": "下地モルタル含水率", "method": "含水率計", "criteria": "適正値", "inspector": "現場代理人"},
            {"name": "打診検査", "method": "打診棒・全数", "criteria": "浮き・剥離なし", "inspector": "監理技術者"},
            {"name": "目地仕上検査", "method": "目視", "criteria": "深さ・通り良好", "inspector": "現場代理人"},
        ],
    },
    "塗装": {
        "materials": _materials_template([
            "下塗材（シーラー・フィラー）",
            "中塗材",
            "上塗材",
            "希釈剤（指定）",
            "養生材",
        ]),
        "construction_flow": [
            "養生（窓・床等）",
            "下地調整（ケレン・清掃）",
            "下塗（シーラー・フィラー）",
            "中塗",
            "上塗（仕上げ）",
            "養生撤去・清掃",
            "膜厚・色合い検査",
        ],
        "inspection_items": [
            {"name": "下地調整状況", "method": "目視・指触", "criteria": "粉化・脆弱部除去", "inspector": "現場代理人"},
            {"name": "塗装膜厚", "method": "膜厚計", "criteria": "標準膜厚の0.8倍以上", "inspector": "現場代理人"},
            {"name": "色合い・つや", "method": "目視・色見本", "criteria": "見本と同等", "inspector": "監理技術者"},
        ],
    },
    "吹付け塗装": {
        "materials": _materials_template([
            "吹付け塗料（リシン・スタッコ・タイル等）",
            "下塗材",
            "上塗材",
            "希釈剤",
        ]),
        "construction_flow": [
            "養生・マスキング",
            "下地調整",
            "下塗",
            "吹付け施工（均一に）",
            "中塗・上塗（必要時）",
            "養生撤去",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "吹付けパターン", "method": "目視", "criteria": "均一性", "inspector": "現場代理人"},
            {"name": "膜厚", "method": "膜厚計", "criteria": "規定値以上", "inspector": "現場代理人"},
        ],
    },
    "足場組立解体": {
        "materials": _materials_template([
            "建枠（仮設工業会認定品）",
            "ジャッキベース・敷板",
            "筋交・布板",
            "壁つなぎ金具",
            "防音シート・メッシュシート",
            "幅木・手すり・中桟",
        ]),
        "construction_flow": [
            "現地調査・足場計画図作成",
            "近隣挨拶・道路使用許可申請",
            "資材搬入・敷板敷設",
            "1段目組立（脚部固定）",
            "順次上層へ組立",
            "壁つなぎ取付（5.5m以下間隔）",
            "シート張り",
            "完了検査（作業前点検）",
            "工事完了後：シート撤去・上段から解体",
            "資材搬出・清掃",
        ],
        "inspection_items": [
            {"name": "脚部・敷板", "method": "目視・触診", "criteria": "沈下・滑動防止", "inspector": "作業主任者"},
            {"name": "壁つなぎ", "method": "目視・引張", "criteria": "規定間隔・強度", "inspector": "作業主任者"},
            {"name": "手すり・幅木", "method": "目視・寸法測定", "criteria": "高さ85cm以上・幅木10cm以上", "inspector": "現場代理人"},
            {"name": "作業前点検", "method": "チェックリスト", "criteria": "労安則第567条・568条", "inspector": "現場代理人"},
        ],
    },
    "アスベスト除去": {
        "materials": _materials_template([
            "湿潤剤（飛散防止）",
            "プラスチックシート（隔離養生）",
            "粘着テープ（気密用）",
            "保護衣（タイベック等）",
            "防じんマスク（電動ファン付）",
            "アスベスト含有廃棄物専用袋",
        ]),
        "construction_flow": [
            "事前調査（含有レベル特定）",
            "労基署届出（特定粉じん作業）",
            "近隣説明・掲示",
            "隔離養生（負圧除じん装置設置）",
            "湿潤化（飛散防止）",
            "除去作業（手作業・剥離）",
            "清掃・HEPA掃除機",
            "完了検査（気中濃度測定）",
            "養生撤去",
            "産業廃棄物処分（マニフェストE票受領）",
        ],
        "inspection_items": [
            {"name": "事前測定", "method": "気中濃度測定", "criteria": "目標基準値以下", "inspector": "作業環境測定士"},
            {"name": "隔離養生", "method": "目視・スモークテスト", "criteria": "気密性確保", "inspector": "現場代理人"},
            {"name": "除去後検査", "method": "目視・指触", "criteria": "残存なし", "inspector": "監理技術者"},
            {"name": "完了気中濃度測定", "method": "サンプリング", "criteria": "規制値以下", "inspector": "作業環境測定士"},
        ],
    },
    "解体工事": {
        "materials": _materials_template([
            "養生シート・防音パネル",
            "散水設備",
            "産業廃棄物専用容器",
        ]),
        "construction_flow": [
            "事前調査（アスベスト・PCB等の有害物質)",
            "建設リサイクル法届出",
            "近隣挨拶・養生設置",
            "内部解体（造作・設備）",
            "屋根解体",
            "上層階から順次解体",
            "基礎解体",
            "廃材分別・搬出",
            "産業廃棄物マニフェスト処理",
            "整地・引渡",
        ],
        "inspection_items": [
            {"name": "事前調査結果", "method": "アスベスト調査票確認", "criteria": "有害物質の有無確定", "inspector": "現場代理人"},
            {"name": "廃材分別", "method": "目視・記録写真", "criteria": "建設リサイクル法準拠", "inspector": "現場代理人"},
            {"name": "マニフェスト管理", "method": "票面確認", "criteria": "A-E票全て揃う", "inspector": "現場代理人"},
        ],
    },
    "仮設工事": {
        "materials": _materials_template([
            "仮設事務所・トイレ・倉庫",
            "工事看板・安全看板・バリケード",
            "仮設電気・水道",
            "ガードフェンス・カラーコーン",
        ]),
        "construction_flow": [
            "仮設計画図作成",
            "関係官公庁申請（道路使用・占用 等）",
            "近隣挨拶",
            "仮囲い設置",
            "仮設事務所・トイレ設置",
            "仮設電気・水道引き込み",
            "看板・標識設置",
            "工事完了後：仮設物撤去・清掃",
        ],
        "inspection_items": [
            {"name": "仮囲い高さ・強度", "method": "目視・寸法", "criteria": "1.8m以上", "inspector": "現場代理人"},
            {"name": "電気・水道", "method": "通電・通水確認", "criteria": "漏電・漏水なし", "inspector": "現場代理人"},
            {"name": "看板内容", "method": "目視", "criteria": "建設業法掲示事項網羅", "inspector": "現場代理人"},
        ],
    },
    # ── 残り29工種 (38工種網羅) ──
    "総合": {
        "materials": _materials_template(["別紙工種別施工計画書による"]),
        "construction_flow": [
            "工事準備（契約・許可申請・近隣挨拶）",
            "仮設工事",
            "解体・撤去（必要時）",
            "本工事（工種別計画書による）",
            "仕上工事",
            "完了検査・引渡",
        ],
        "inspection_items": [
            {"name": "工事全体進捗", "method": "工程表照合・打合せ", "criteria": "工期内", "inspector": "現場代理人"},
            {"name": "品質マネジメント", "method": "ISO9001ベース", "criteria": "計画通り", "inspector": "監理技術者"},
        ],
    },
    "屋根工事": {
        "materials": _materials_template(["屋根材", "野地板・垂木", "ルーフィング材", "唐草・水切金物", "雨樋"]),
        "construction_flow": [
            "現場実測・施工図確認",
            "野地板・下地点検",
            "ルーフィング張り",
            "唐草・水切金物取付",
            "屋根材葺き",
            "棟・谷・取合部処理",
            "完了検査（水切り・釘止め）",
        ],
        "inspection_items": [
            {"name": "ルーフィング張り", "method": "目視", "criteria": "重ね幅・釘止め適正", "inspector": "現場代理人"},
            {"name": "屋根材取付", "method": "目視・打診", "criteria": "通り良好・浮きなし", "inspector": "現場代理人"},
            {"name": "雨水浸入", "method": "散水試験", "criteria": "漏水なし", "inspector": "監理技術者"},
        ],
    },
    "金属板葺屋根": {
        "materials": _materials_template(["カラー鋼板・ガルバリウム鋼板", "ステンレス鋼板", "垂木・野地板", "唐草・谷樋", "ルーフィング"]),
        "construction_flow": [
            "施工計画書・施工図確認",
            "現場実測",
            "屋根材工場成型加工・付属品材加工",
            "野地材敷込み",
            "ルーフィング張り",
            "唐草取付け・谷樋取付け",
            "屋根材搬入・荷揚げ",
            "屋根葺き（縦葺・横葺・瓦棒等）",
            "役物材現場実測・取付",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "葺方・釘ピッチ", "method": "目視・寸法測定", "criteria": "標準仕様書による", "inspector": "現場代理人"},
            {"name": "唐草・谷樋", "method": "目視", "criteria": "通り良好・接合適正", "inspector": "現場代理人"},
        ],
    },
    "瓦葺屋根": {
        "materials": _materials_template(["瓦（J型・F型・S型 等）", "桟瓦・冠瓦・鬼瓦", "瓦桟", "釘・銅線", "ルーフィング"]),
        "construction_flow": [
            "施工計画書確認",
            "下地処理（モルタル塗り下地等の補修）",
            "水切金物加工・取付",
            "ルーフィング張り",
            "瓦桟取付",
            "瓦葺き（軒先・棟・谷部含む）",
            "壁取合部の水切金物取付",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "瓦の留付け", "method": "目視・引上試験", "criteria": "釘・銅線で確実に固定", "inspector": "現場代理人"},
            {"name": "葺むら・通り", "method": "目視", "criteria": "整然・通り良好", "inspector": "現場代理人"},
        ],
    },
    "アスファルトシングル葺屋根": {
        "materials": _materials_template(["アスファルトシングル材", "下地材（耐水ベニヤ等）", "ルーフィング", "釘・接着剤", "唐草・水切板"]),
        "construction_flow": [
            "下地処理（耐水ベニヤ・ALC等の補修）",
            "水切金物加工",
            "ルーフィング張り",
            "軒先・ケラバ水切り取付",
            "シングル材荷揚げ",
            "アスファルトシングル張り（各工法仕様による）",
            "立ち上がり部シングル押え・水切金物取付",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "下地状態", "method": "目視", "criteria": "平滑・乾燥", "inspector": "現場代理人"},
            {"name": "シングル張り", "method": "目視", "criteria": "重ね・釘ピッチ仕様通り", "inspector": "現場代理人"},
        ],
    },
    "とい工事": {
        "materials": _materials_template([
            "硬質塩化ビニル雨とい", "ガルバリウム鋼板とい",
            "ルーフドレイン", "支持金物", "継手・コーナー部材",
        ]),
        "construction_flow": [
            "施工図・墨出し",
            "支持金物取付",
            "軒とい組立・取付",
            "縦とい組立・取付",
            "とい受金物固定",
            "ドレン取付",
            "通水試験",
        ],
        "inspection_items": [
            {"name": "とい勾配", "method": "水準器・水糸", "criteria": "1/100以上", "inspector": "現場代理人"},
            {"name": "通水", "method": "通水試験", "criteria": "漏水なし・スムーズ排水", "inspector": "現場代理人"},
        ],
    },
    "金属工事": {
        "materials": _materials_template([
            "手すり・笠木", "アルミ製品", "ステンレス製品",
            "下地主材料（鋼材・木材）", "取付金物（アンカー等）",
        ]),
        "construction_flow": [
            "現場実測",
            "工場製作（必要時）",
            "搬入・仮置き",
            "下地取付",
            "本体取付・調整",
            "シーリング・取合部処理",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "取付精度", "method": "水準器・寸法測定", "criteria": "通り・水平・垂直", "inspector": "現場代理人"},
            {"name": "ぐらつき", "method": "目視・触診", "criteria": "ぐらつきなし", "inspector": "現場代理人"},
        ],
    },
    "左官工事": {
        "materials": _materials_template([
            "セメントモルタル", "下地調整材", "吸水調整剤", "防水剤", "接着増強材", "無収縮材",
        ]),
        "construction_flow": [
            "下地清掃・水湿し",
            "下塗（粗塗り）",
            "中塗",
            "上塗（仕上げ）",
            "養生（乾燥・湿潤）",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "下地処理", "method": "目視・打診", "criteria": "脆弱部除去・水湿し", "inspector": "現場代理人"},
            {"name": "仕上面平滑性", "method": "目視・直定規", "criteria": "凹凸3mm以下/3m", "inspector": "現場代理人"},
        ],
    },
    "石工事": {
        "materials": _materials_template([
            "石材（御影石・大理石等）", "引金物緊結用鉄筋", "受金物・ファスナー", "セメントモルタル", "シーリング材",
        ]),
        "construction_flow": [
            "施工図・割付図確認",
            "石材搬入・検収",
            "下地調整",
            "アンカー設置",
            "石材取付（湿式・乾式工法）",
            "目地詰め・シーリング",
            "清掃・養生",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "石材検収", "method": "色合い・寸法・割れ確認", "criteria": "見本品と同等", "inspector": "現場代理人"},
            {"name": "取付", "method": "ハンマー打診", "criteria": "緩み・浮きなし", "inspector": "監理技術者"},
        ],
    },
    "木工事": {
        "materials": _materials_template([
            "構造材（柱・梁）", "化粧材", "造作材",
            "建具枠・額縁", "釘・接合金物",
        ]),
        "construction_flow": [
            "墨出し",
            "下地組み",
            "造作材取付",
            "建具枠取付",
            "化粧材取付",
            "養生・釘穴処理",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "材料品質", "method": "等級・F☆☆☆☆表示確認", "criteria": "JAS規格適合", "inspector": "現場代理人"},
            {"name": "取付精度", "method": "目視・寸法", "criteria": "通り良好・隙間なし", "inspector": "現場代理人"},
        ],
    },
    "建具工事": {
        "materials": _materials_template([
            "建具本体", "枠材", "金物（丁番・錠・ハンドル）", "ガラス", "シーリング材",
        ]),
        "construction_flow": [
            "施工図・寸法確認",
            "工場製作",
            "現場搬入・仮置き",
            "枠取付",
            "建具本体取付",
            "金物取付・調整",
            "ガラス取付・シーリング",
            "建付け調整",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "建付け", "method": "開閉確認", "criteria": "スムーズ動作・隙間均一", "inspector": "現場代理人"},
            {"name": "金物動作", "method": "操作確認", "criteria": "完全動作・施錠確実", "inspector": "現場代理人"},
        ],
    },
    "アルミニウム製建具": {
        "materials": _materials_template([
            "アルミニウム形材", "ガラス", "戸当り・上げ落し", "ステンレス鋼板", "シーリング材",
        ]),
        "construction_flow": [
            "施工図確認",
            "現場実測",
            "工場製作",
            "搬入・養生",
            "枠取付（アンカー固定）",
            "本体取付",
            "ガラス取付・シーリング",
            "金物取付・建付け調整",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "アンカー固定", "method": "目視・引張", "criteria": "規定強度", "inspector": "現場代理人"},
            {"name": "水密・気密性", "method": "散水試験・隙間ゲージ", "criteria": "JIS等級適合", "inspector": "監理技術者"},
        ],
    },
    "鋼製建具": {
        "materials": _materials_template([
            "鋼板・形鋼", "戸力骨", "額縁・添え枠", "錠前・丁番・ハンドル", "塗装材",
        ]),
        "construction_flow": [
            "施工図確認・現場実測",
            "工場製作（防錆処理含む）",
            "搬入・仮置き",
            "枠取付",
            "建具本体取付",
            "金物取付・建付け調整",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "防錆処理", "method": "目視", "criteria": "錆・剥がれなし", "inspector": "現場代理人"},
            {"name": "建付け", "method": "開閉確認", "criteria": "スムーズ動作", "inspector": "現場代理人"},
        ],
    },
    "鋼製軽量建具": {
        "materials": _materials_template([
            "鋼板", "戸力骨・中骨", "縦小口包み板・押縁", "ステンレス鋼板", "補強板",
        ]),
        "construction_flow": [
            "施工図確認",
            "工場製作",
            "搬入・養生",
            "枠取付",
            "建具本体取付・建付け調整",
            "金物取付",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "建付け精度", "method": "目視・隙間ゲージ", "criteria": "規定隙間", "inspector": "現場代理人"},
        ],
    },
    "ステンレス製建具": {
        "materials": _materials_template([
            "ステンレス鋼板", "裏板・補強板", "上げ落し・戸当り", "シーリング材",
        ]),
        "construction_flow": [
            "施工図確認",
            "工場製作",
            "搬入・養生（傷防止）",
            "枠取付",
            "本体取付",
            "金物取付・調整",
            "完了検査・養生撤去",
        ],
        "inspection_items": [
            {"name": "表面仕上", "method": "目視", "criteria": "傷・汚れなし", "inspector": "現場代理人"},
            {"name": "建付け", "method": "開閉確認", "criteria": "スムーズ動作", "inspector": "現場代理人"},
        ],
    },
    "木製建具": {
        "materials": _materials_template([
            "建具本体（F☆☆☆☆相当）", "中骨・額縁", "化粧縁・定規縁",
            "丁番・錠前", "塗装材",
        ]),
        "construction_flow": [
            "現場実測",
            "工場製作",
            "搬入・養生",
            "枠取付",
            "建具本体取付",
            "金物取付・建付け調整",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "材質確認", "method": "F☆☆☆☆表示確認", "criteria": "ホルムアルデヒド規制適合", "inspector": "現場代理人"},
            {"name": "建付け", "method": "開閉確認", "criteria": "スムーズ動作・隙間均一", "inspector": "現場代理人"},
        ],
    },
    "ガラス工事": {
        "materials": _materials_template([
            "板ガラス（フロート・強化・複層 等）",
            "ガスケット・バックアップ材", "ガラス用シーリング材",
            "防錆材", "清掃剤",
        ]),
        "construction_flow": [
            "施工図確認・寸法決定",
            "ガラス発注・搬入",
            "サッシ枠清掃",
            "セッティングブロック設置",
            "ガラス建込み",
            "ガスケット・シーリング充填",
            "養生・清掃",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "ガラス品質", "method": "ヒートソーク証明確認", "criteria": "強化ガラスは熱処理試験合格品", "inspector": "現場代理人"},
            {"name": "シーリング", "method": "目視", "criteria": "充填均一・剥離なし", "inspector": "現場代理人"},
        ],
    },
    "合成樹脂塗床": {
        "materials": _materials_template([
            "エポキシ樹脂系プライマー", "ウレタン樹脂系防水材",
            "薄膜型エポキシ樹脂系防塵塗料", "厚膜型弾性ウレタン樹脂系", "補修材",
        ]),
        "construction_flow": [
            "下地調整（ケレン・清掃）",
            "プライマー塗布",
            "下塗",
            "中塗（必要時）",
            "上塗（仕上げ）",
            "養生（硬化）",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "下地含水率", "method": "含水率計", "criteria": "8%以下", "inspector": "現場代理人"},
            {"name": "塗膜厚", "method": "膜厚計", "criteria": "規定膜厚", "inspector": "現場代理人"},
            {"name": "ピンホール", "method": "目視", "criteria": "なし", "inspector": "現場代理人"},
        ],
    },
    "せっこうボード": {
        "materials": _materials_template([
            "せっこうボード（厚9.5/12.5mm 等）",
            "下地金物（軽量鉄骨・木下地）", "ビス・釘", "ジョイントテープ・パテ",
        ]),
        "construction_flow": [
            "下地確認・墨出し",
            "ボード割付",
            "ボード張り（ビス・釘留め）",
            "ジョイント部処理（テープ・パテ）",
            "養生・乾燥",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "ビスピッチ", "method": "目視・寸法測定", "criteria": "JIS A 6901準拠", "inspector": "現場代理人"},
            {"name": "ジョイント仕上", "method": "目視・手触り", "criteria": "段差・凹凸なし", "inspector": "現場代理人"},
        ],
    },
    "壁紙貼り": {
        "materials": _materials_template([
            "ビニルクロス（F☆☆☆☆）", "織物クロス", "クロス接着剤（防かび剤入り）", "下地調整材",
        ]),
        "construction_flow": [
            "下地調整（パテ処理・サンディング）",
            "シーラー塗布",
            "クロス採寸・カット",
            "糊付け",
            "貼付け（空気抜き）",
            "余分カット・ジョイント処理",
            "清掃",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "下地", "method": "目視・手触り", "criteria": "平滑", "inspector": "現場代理人"},
            {"name": "仕上", "method": "目視（順光・逆光）", "criteria": "シワ・浮き・剥がれなし", "inspector": "現場代理人"},
        ],
    },
    "床張り": {
        "materials": _materials_template([
            "床材（タイル・カーペット・塩ビ等）",
            "接着剤", "下地調整材", "見切り材",
        ]),
        "construction_flow": [
            "下地確認・墨出し",
            "下地調整",
            "接着剤塗布",
            "床材張り",
            "見切り材取付",
            "養生・清掃",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "下地状態", "method": "目視・水準器", "criteria": "平滑・乾燥", "inspector": "現場代理人"},
            {"name": "張り仕上", "method": "目視", "criteria": "目地通り・浮きなし", "inspector": "現場代理人"},
        ],
    },
    "フローリング": {
        "materials": _materials_template([
            "フローリング材（単層・複合）", "接着剤（F☆☆☆☆）",
            "釘金物", "下地材（捨て張りベニヤ等）", "見切り材",
        ]),
        "construction_flow": [
            "下地確認",
            "捨て張り（必要時）",
            "墨出し・割付",
            "フローリング張り（接着・釘止め）",
            "見切り材取付",
            "養生・清掃",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "下地平滑性", "method": "水準器・直定規", "criteria": "規定値以内", "inspector": "現場代理人"},
            {"name": "張り精度", "method": "目視", "criteria": "通り良好・隙間均一", "inspector": "現場代理人"},
            {"name": "材料品質", "method": "F☆☆☆☆表示", "criteria": "ホルムアルデヒド規制適合", "inspector": "現場代理人"},
        ],
    },
    "トイレブース": {
        "materials": _materials_template([
            "パネル（メラミン樹脂・ポリエステル樹脂）", "笠木・脚部・壁見切り",
            "頭つなぎ", "丁番・錠前", "金物類（JIS A 6512準拠）",
        ]),
        "construction_flow": [
            "施工図・寸法確認",
            "現場搬入",
            "支柱・脚部取付",
            "パネル組立",
            "笠木・頭つなぎ取付",
            "建具取付・建付け調整",
            "金物動作確認",
        ],
        "inspection_items": [
            {"name": "開閉耐久性", "method": "JIS A 4702試験", "criteria": "繰返し試験合格", "inspector": "監理技術者"},
            {"name": "建付け", "method": "開閉確認", "criteria": "緩みなし", "inspector": "現場代理人"},
        ],
    },
    "軽鉄壁下地": {
        "materials": _materials_template([
            "スタッド（軽量鉄骨）", "ランナー", "振れ止め", "ビス・ボルト",
        ]),
        "construction_flow": [
            "墨出し",
            "ランナー取付（床・天井）",
            "スタッド建込み（間隔30cm or 45cm）",
            "振れ止め取付",
            "開口部補強",
            "ボード張り前検査",
        ],
        "inspection_items": [
            {"name": "下地材料", "method": "刻印確認", "criteria": "JIS A 6517準拠", "inspector": "現場代理人"},
            {"name": "建込み精度", "method": "水準器・寸法", "criteria": "垂直・通り良好", "inspector": "現場代理人"},
        ],
    },
    "軽鉄天井下地": {
        "materials": _materials_template([
            "野縁（シングル・ダブル）", "野縁受け", "吊りボルト・ハンガー", "クリップ・振れ止め",
        ]),
        "construction_flow": [
            "墨出し（天井高さ・通り）",
            "吊りボルト取付",
            "ハンガー取付",
            "野縁受け取付",
            "野縁取付（間隔30cm等）",
            "振れ止め取付（屋内1.5m / 屋外1.0m）",
            "ボード張り前検査",
        ],
        "inspection_items": [
            {"name": "下地材料", "method": "刻印確認", "criteria": "JIS規格準拠", "inspector": "現場代理人"},
            {"name": "水平精度", "method": "水準器", "criteria": "規定値内", "inspector": "現場代理人"},
            {"name": "振れ止め間隔", "method": "寸法測定", "criteria": "屋内1.5m以下/屋外1.0m以下", "inspector": "現場代理人"},
        ],
    },
    "ユニットバス": {
        "materials": _materials_template([
            "ユニットバス本体（床パン・壁パネル・天井）",
            "浴槽", "建具", "水栓金具", "シーリング材",
        ]),
        "construction_flow": [
            "部材現場搬入",
            "床パン組立・水平確認",
            "排水接続",
            "壁パネル取付",
            "天井ブロック取付",
            "浴槽据付",
            "建具取付",
            "水栓・配管接続",
            "通水試験",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "床パン水平", "method": "水準器", "criteria": "水平", "inspector": "現場代理人"},
            {"name": "通水試験", "method": "通水・排水確認", "criteria": "漏水なし・排水正常", "inspector": "現場代理人"},
        ],
    },
    "排水工事": {
        "materials": _materials_template([
            "排水管（VU管・VP管）", "雨水桝・側溝", "コンクリート",
            "配管継手", "ストレーナー・トラップ",
        ]),
        "construction_flow": [
            "施工図確認・墨出し",
            "掘削",
            "基礎砕石敷設",
            "配管敷設（勾配確保）",
            "桝据付",
            "接続部処理",
            "埋戻し",
            "通水試験",
            "舗装復旧（必要時）",
        ],
        "inspection_items": [
            {"name": "配管勾配", "method": "水準器・水糸", "criteria": "1/100以上", "inspector": "現場代理人"},
            {"name": "通水試験", "method": "通水・水位確認", "criteria": "漏水なし・スムーズ排水", "inspector": "現場代理人"},
        ],
    },
    "内装工事": {
        "materials": _materials_template([
            "ボード・クロス・床材", "塗装材", "建具", "金物類",
        ]),
        "construction_flow": [
            "下地調整",
            "ボード張り",
            "クロス・塗装",
            "建具取付",
            "床材張り",
            "金物取付",
            "養生・清掃",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "下地", "method": "目視", "criteria": "平滑・乾燥", "inspector": "現場代理人"},
            {"name": "仕上", "method": "目視（順光・逆光）", "criteria": "ムラ・段差なし", "inspector": "現場代理人"},
        ],
    },
    "防水改修": {
        "materials": _materials_template([
            "既存防水層補修材", "プライマー", "防水材（ウレタン・アスファルト等）",
            "脱気装置・ドレン", "保護モルタル",
        ]),
        "construction_flow": [
            "既存防水層の調査・診断",
            "撤去 or オーバーレイ判定",
            "下地調整",
            "プライマー塗布",
            "防水層形成（材質に応じる）",
            "立上り・端部処理",
            "保護層・トップコート",
            "水張り試験",
            "完了検査",
        ],
        "inspection_items": [
            {"name": "下地含水率", "method": "含水率計", "criteria": "10%以下", "inspector": "現場代理人"},
            {"name": "防水層厚", "method": "膜厚計", "criteria": "規定膜厚以上", "inspector": "現場代理人"},
            {"name": "水張り試験", "method": "24時間湛水", "criteria": "漏水なし", "inspector": "監理技術者"},
        ],
    },
}


def get_work_type_defaults(work_type: str) -> dict[str, Any]:
    """work_type に対応する標準デフォルトデータを返す。

    未登録の work_type は空のデフォルトを返す（テンプレ側で空フォールバック処理）。
    """
    return WORK_TYPE_DEFAULTS.get(work_type, {})
