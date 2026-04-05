"""
Photo classification reference data for electronic delivery (電子納品).

Based on デジタル写真管理情報基準 (令和7年3月) and
公共建築工事標準仕様書（建築工事編）令和7年版.
"""

# ---------------------------------------------------------------------------
# 写真区分 (photo categories)
# ---------------------------------------------------------------------------

PHOTO_CATEGORIES: list[dict] = [
    {"value": "着手前",   "label": "着手前",   "description": "工事着手前の状況写真"},
    {"value": "施工状況", "label": "施工状況", "description": "施工中の状況写真"},
    {"value": "完成",     "label": "完成",     "description": "工事完成写真"},
    {"value": "安全管理", "label": "安全管理", "description": "安全管理に関する写真"},
    {"value": "品質管理", "label": "品質管理", "description": "品質管理・試験に関する写真"},
    {"value": "出来形管理", "label": "出来形管理", "description": "出来形計測・管理写真"},
    {"value": "使用材料", "label": "使用材料", "description": "使用材料の品質確認写真"},
    {"value": "災害公害", "label": "災害公害", "description": "災害・公害防止に関する写真"},
    {"value": "環境対策", "label": "環境対策", "description": "環境保全対策写真"},
    {"value": "その他",   "label": "その他",   "description": "その他の記録写真"},
]

# ---------------------------------------------------------------------------
# 工種 (work types) with 種別 and 細別
# ---------------------------------------------------------------------------

WORK_TYPE_TREE: list[dict] = [
    {
        "value": "仮設工事",
        "label": "仮設工事",
        "subtypes": [
            {
                "value": "共通仮設",
                "label": "共通仮設",
                "details": ["仮設事務所", "仮設トイレ", "安全施設", "養生"],
            },
            {
                "value": "直接仮設",
                "label": "直接仮設",
                "details": ["足場", "型枠支保工", "仮囲い", "乗入れ構台"],
            },
        ],
    },
    {
        "value": "土工事",
        "label": "土工事",
        "subtypes": [
            {
                "value": "根切り",
                "label": "根切り",
                "details": ["山留め", "根切り底", "掘削状況"],
            },
            {
                "value": "埋戻し",
                "label": "埋戻し",
                "details": ["埋戻し材", "転圧"],
            },
        ],
    },
    {
        "value": "地業工事",
        "label": "地業工事",
        "subtypes": [
            {
                "value": "既製杭",
                "label": "既製杭",
                "details": ["PHC杭", "H鋼杭", "鋼管杭", "杭頭処理"],
            },
            {
                "value": "場所打ち杭",
                "label": "場所打ち杭",
                "details": ["アースドリル", "オールケーシング", "BH工法"],
            },
            {
                "value": "地盤改良",
                "label": "地盤改良",
                "details": ["薬液注入", "深層混合", "浅層混合"],
            },
        ],
    },
    {
        "value": "鉄筋工事",
        "label": "鉄筋工事",
        "subtypes": [
            {
                "value": "鉄筋加工",
                "label": "鉄筋加工",
                "details": ["切断", "曲げ加工", "スペーサー"],
            },
            {
                "value": "鉄筋組立",
                "label": "鉄筋組立",
                "details": ["基礎", "柱", "梁", "床", "壁", "継手"],
            },
        ],
    },
    {
        "value": "コンクリート工事",
        "label": "コンクリート工事",
        "subtypes": [
            {
                "value": "型枠",
                "label": "型枠",
                "details": ["型枠組立", "型枠支保工", "型枠解体"],
            },
            {
                "value": "コンクリート打設",
                "label": "コンクリート打設",
                "details": ["受入検査", "打設状況", "養生", "圧縮強度試験"],
            },
        ],
    },
    {
        "value": "鉄骨工事",
        "label": "鉄骨工事",
        "subtypes": [
            {
                "value": "製作",
                "label": "製作",
                "details": ["工場溶接", "超音波探傷試験", "工場塗装"],
            },
            {
                "value": "建方",
                "label": "建方",
                "details": ["建入れ直し", "高力ボルト", "現場溶接"],
            },
        ],
    },
    {
        "value": "木工事",
        "label": "木工事",
        "subtypes": [
            {
                "value": "軸組",
                "label": "軸組",
                "details": ["土台", "柱", "梁", "小屋組"],
            },
            {
                "value": "内装下地",
                "label": "内装下地",
                "details": ["間仕切り", "天井下地", "床下地"],
            },
        ],
    },
    {
        "value": "屋根工事",
        "label": "屋根工事",
        "subtypes": [
            {
                "value": "防水",
                "label": "防水",
                "details": ["ウレタン防水", "アスファルト防水", "シート防水"],
            },
            {
                "value": "屋根葺き",
                "label": "屋根葺き",
                "details": ["金属屋根", "スレート", "瓦"],
            },
        ],
    },
    {
        "value": "防水工事",
        "label": "防水工事",
        "subtypes": [
            {
                "value": "アスファルト防水",
                "label": "アスファルト防水",
                "details": ["熱工法", "常温工法", "トーチ工法"],
            },
            {
                "value": "シート防水",
                "label": "シート防水",
                "details": ["塩ビシート", "ゴムシート", "接着工法", "機械的固定工法"],
            },
            {
                "value": "塗膜防水",
                "label": "塗膜防水",
                "details": ["ウレタン塗膜防水", "FRP防水"],
            },
        ],
    },
    {
        "value": "石工事",
        "label": "石工事",
        "subtypes": [
            {
                "value": "内部石張り",
                "label": "内部石張り",
                "details": ["床", "壁", "階段"],
            },
            {
                "value": "外部石張り",
                "label": "外部石張り",
                "details": ["外壁", "外構"],
            },
        ],
    },
    {
        "value": "タイル工事",
        "label": "タイル工事",
        "subtypes": [
            {
                "value": "内部タイル",
                "label": "内部タイル",
                "details": ["床", "壁", "浴室"],
            },
            {
                "value": "外部タイル",
                "label": "外部タイル",
                "details": ["外壁", "引張試験"],
            },
        ],
    },
    {
        "value": "左官工事",
        "label": "左官工事",
        "subtypes": [
            {
                "value": "モルタル塗り",
                "label": "モルタル塗り",
                "details": ["下塗り", "中塗り", "上塗り"],
            },
            {
                "value": "仕上塗材",
                "label": "仕上塗材",
                "details": ["リシン", "吹付タイル", "スタッコ"],
            },
        ],
    },
    {
        "value": "建具工事",
        "label": "建具工事",
        "subtypes": [
            {
                "value": "金属建具",
                "label": "金属建具",
                "details": ["アルミサッシ", "スチールドア", "シャッター"],
            },
            {
                "value": "木製建具",
                "label": "木製建具",
                "details": ["フラッシュ戸", "ガラス戸"],
            },
        ],
    },
    {
        "value": "塗装工事",
        "label": "塗装工事",
        "subtypes": [
            {
                "value": "外部塗装",
                "label": "外部塗装",
                "details": ["素地調整", "下塗り", "中塗り", "上塗り"],
            },
            {
                "value": "内部塗装",
                "label": "内部塗装",
                "details": ["壁面塗装", "鉄部塗装"],
            },
            {
                "value": "鉄骨塗装",
                "label": "鉄骨塗装",
                "details": ["防錆塗装", "耐火塗装"],
            },
        ],
    },
    {
        "value": "内装工事",
        "label": "内装工事",
        "subtypes": [
            {
                "value": "床仕上げ",
                "label": "床仕上げ",
                "details": ["フローリング", "カーペット", "ビニル床タイル", "エポキシ塗床"],
            },
            {
                "value": "壁仕上げ",
                "label": "壁仕上げ",
                "details": ["クロス", "パネル", "塗装"],
            },
            {
                "value": "天井仕上げ",
                "label": "天井仕上げ",
                "details": ["石膏ボード", "岩綿吸音板", "システム天井"],
            },
        ],
    },
    {
        "value": "外構工事",
        "label": "外構工事",
        "subtypes": [
            {
                "value": "舗装",
                "label": "舗装",
                "details": ["アスファルト舗装", "インターロッキング", "コンクリート舗装"],
            },
            {
                "value": "フェンス",
                "label": "フェンス",
                "details": ["メッシュフェンス", "基礎"],
            },
            {
                "value": "植栽",
                "label": "植栽",
                "details": ["高木", "低木", "芝張り"],
            },
        ],
    },
    {
        "value": "電気設備工事",
        "label": "電気設備工事",
        "subtypes": [
            {
                "value": "受変電設備",
                "label": "受変電設備",
                "details": ["キュービクル", "高圧受電"],
            },
            {
                "value": "幹線設備",
                "label": "幹線設備",
                "details": ["配電盤", "幹線ケーブル"],
            },
            {
                "value": "動力設備",
                "label": "動力設備",
                "details": ["動力盤", "モーター配線"],
            },
            {
                "value": "照明設備",
                "label": "照明設備",
                "details": ["照明器具", "配線", "スイッチ"],
            },
            {
                "value": "弱電設備",
                "label": "弱電設備",
                "details": ["電話", "LAN", "放送", "防犯"],
            },
        ],
    },
    {
        "value": "機械設備工事",
        "label": "機械設備工事",
        "subtypes": [
            {
                "value": "空調設備",
                "label": "空調設備",
                "details": ["熱源機器", "空調機", "ダクト", "配管"],
            },
            {
                "value": "衛生設備",
                "label": "衛生設備",
                "details": ["給水", "給湯", "排水", "衛生器具"],
            },
            {
                "value": "消防設備",
                "label": "消防設備",
                "details": ["スプリンクラー", "消火栓", "自動火災報知"],
            },
            {
                "value": "昇降設備",
                "label": "昇降設備",
                "details": ["エレベーター", "エスカレーター"],
            },
        ],
    },
]

# ---------------------------------------------------------------------------
# Flat look-up helpers
# ---------------------------------------------------------------------------

def get_work_types() -> list[str]:
    """Return a flat list of 工種 values."""
    return [wt["value"] for wt in WORK_TYPE_TREE]


def get_subtypes(work_type: str) -> list[str]:
    """Return 種別 values for the given 工種."""
    for wt in WORK_TYPE_TREE:
        if wt["value"] == work_type:
            return [st["value"] for st in wt.get("subtypes", [])]
    return []


def get_details(work_type: str, subtype: str) -> list[str]:
    """Return 細別 values for the given 工種 + 種別."""
    for wt in WORK_TYPE_TREE:
        if wt["value"] == work_type:
            for st in wt.get("subtypes", []):
                if st["value"] == subtype:
                    return st.get("details", [])
    return []
