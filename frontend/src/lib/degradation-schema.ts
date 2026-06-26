// ─────────────────────────────────────────────────────────────────────────
//  劣化診断（現地調査）スキーマ／判定ロジック
//  マンション大規模修繕の劣化診断。kamo-hp の社内ツールと同一スキーマ。
//
//  出典（調査項目・判定基準）:
//   - 国土交通省「定期報告制度における外壁のタイル等の調査について」
//   - 国土交通省「長期修繕計画作成ガイドライン（令和6年改定）」
//   - 一般財団法人 日本耐震診断協会（打診/赤外線/タイル引張試験 0.4N/mm²）
// ─────────────────────────────────────────────────────────────────────────

/* ====================== 劣化度グレード ====================== */

export interface Grade {
  key: "a" | "b" | "c" | "d";
  label: string;
  desc: string;
  text: string;
  bg: string;
  ring: string;
}

export const GRADES: Grade[] = [
  { key: "a", label: "a", desc: "良好（補修不要）", text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-500" },
  { key: "b", label: "b", desc: "軽微（経過観察）", text: "text-sky-700", bg: "bg-sky-50", ring: "ring-sky-500" },
  { key: "c", label: "c", desc: "中程度（要補修）", text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-500" },
  { key: "d", label: "d", desc: "著しい（早急に補修）", text: "text-red-700", bg: "bg-red-50", ring: "ring-red-500" },
];

export const GRADE_RANK: Record<string, number> = { a: 1, b: 2, c: 3, d: 4 };

export function worstGrade(grades: (string | undefined)[]): Grade | null {
  let worst: Grade | null = null;
  for (const g of grades) {
    if (!g) continue;
    const found = GRADES.find((x) => x.key === g);
    if (found && (!worst || GRADE_RANK[found.key] > GRADE_RANK[worst.key])) worst = found;
  }
  return worst;
}

/* ====================== 自動判定 ====================== */

export function classifyCrack(mm: number | undefined | null): { label: string; grade: "b" | "c" | "d" } | null {
  if (mm == null || isNaN(mm) || mm <= 0) return null;
  if (mm <= 0.3) return { label: "ヘアークラック（0.3mm以下・構造影響小）", grade: "b" };
  if (mm < 1.0) return { label: "構造クラック（0.3mm超・要補修）", grade: "c" };
  return { label: "構造クラック・漏水リスク高（1.0mm以上・早急に補修）", grade: "d" };
}

export function classifyTilePull(nmm2: number | undefined | null): { label: string; grade: "a" | "c" } | null {
  if (nmm2 == null || isNaN(nmm2) || nmm2 <= 0) return null;
  if (nmm2 >= 0.4) return { label: "0.4N/mm²以上：接着良好", grade: "a" };
  return { label: "0.4N/mm²未満：接着不良（要補修）", grade: "c" };
}

/* ====================== 調査項目スキーマ ====================== */

export type FieldType = "text" | "textarea" | "number" | "select" | "boolean" | "multi" | "grade" | "date";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  options?: string[];
  help?: string;
  placeholder?: string;
  span?: 1 | 2;
}

export interface Section {
  key: string;
  title: string;
  subtitle?: string;
  graded: boolean;
  fields: Field[];
}

export const SECTIONS: Section[] = [
  {
    key: "building",
    title: "建物・基本情報",
    subtitle: "物件の基礎情報と調査条件",
    graded: false,
    fields: [
      { key: "propertyName", label: "物件名", type: "text", placeholder: "例）KAMOマンション", span: 2 },
      { key: "address", label: "所在地", type: "text", placeholder: "例）川崎市高津区末長1-52-37", span: 2 },
      { key: "structure", label: "構造", type: "select", options: ["RC（鉄筋コンクリート）", "SRC（鉄骨鉄筋コンクリート）", "S（鉄骨）", "その他"] },
      { key: "floors", label: "階数", type: "number", unit: "階" },
      { key: "units", label: "総戸数", type: "number", unit: "戸" },
      { key: "builtYear", label: "竣工年（西暦）", type: "number", unit: "年", placeholder: "例）2005" },
      { key: "lastRepairYear", label: "前回大規模修繕（西暦）", type: "number", unit: "年", help: "未実施なら空欄", placeholder: "例）2013" },
      { key: "wallArea", label: "外壁面積（概算）", type: "number", unit: "m²" },
      { key: "inspectDate", label: "調査日", type: "date" },
      { key: "weather", label: "天候", type: "select", options: ["晴", "曇", "雨", "雪"] },
      { key: "inspector", label: "調査員", type: "text", placeholder: "担当者名" },
      { key: "method", label: "調査区分", type: "select", options: ["一次診断（目視・手の届く範囲の打診）", "二次診断（全面打診・赤外線・各種試験）", "三次診断（局部破壊・抜管・内視鏡）"], span: 2, help: "一次＝概算/時期判断、二次＝修繕設計、三次＝重大劣化の精査" },
    ],
  },
  {
    key: "tile",
    title: "タイル・石貼り",
    subtitle: "打診・赤外線・引張試験／浮き・剥落・白華",
    graded: true,
    fields: [
      { key: "surveyMethod", label: "調査方法", type: "multi", options: ["目視", "打診（テストハンマー）", "赤外線サーモグラフィ", "引張試験"], span: 2, help: "建築基準法：竣工後10年ごとに全面打診等が義務" },
      { key: "floatRate", label: "浮き率（推定）", type: "number", unit: "%", help: "打診/赤外線で検出した浮き面積の割合" },
      { key: "pullStrength", label: "タイル引張試験値", type: "number", unit: "N/mm²", help: "0.4N/mm²以上で接着良好（公共建築工事標準仕様書）" },
      { key: "crackCount", label: "ひび割れタイル枚数", type: "number", unit: "枚" },
      { key: "spallCount", label: "欠損・剥落", type: "number", unit: "箇所", help: "落下の危険がある箇所は最優先" },
      { key: "efflorescence", label: "エフロレッセンス（白華）", type: "boolean" },
      { key: "floatArea", label: "浮き補修（注入）数量", type: "number", unit: "箇所", help: "アンカーピンニング注入の想定箇所数" },
      { key: "replaceArea", label: "タイル張替 数量", type: "number", unit: "m²", help: "張替が必要な面積" },
      { key: "grade", label: "劣化度", type: "grade", span: 2 },
      { key: "note", label: "所見", type: "textarea", span: 2 },
    ],
  },
  {
    key: "wall",
    title: "外壁・躯体（コンクリート／モルタル）",
    subtitle: "ひび割れ・中性化・鉄筋爆裂・チョーキング",
    graded: true,
    fields: [
      { key: "crackWidth", label: "ひび割れ最大幅", type: "number", unit: "mm", help: "0.3mm以下=ヘアークラック / 0.3mm超=構造クラック / 1.0mm以上=漏水リスク高", span: 2 },
      { key: "crackLength", label: "ひび割れ総延長", type: "number", unit: "m", help: "Uカットシール充填の想定延長" },
      { key: "neutralization", label: "中性化深さ", type: "number", unit: "mm", help: "フェノールフタレイン法。かぶり厚さに達すると鉄筋腐食リスク" },
      { key: "cover", label: "かぶり厚さ", type: "number", unit: "mm", help: "鉄筋探査（電磁誘導法）" },
      { key: "explosion", label: "鉄筋爆裂", type: "number", unit: "箇所", help: "はつり・防錆・断面修復の想定箇所" },
      { key: "chalking", label: "チョーキング（白亜化）", type: "select", options: ["なし", "軽微", "中程度", "著しい"] },
      { key: "filmPeel", label: "塗膜の浮き・剥がれ", type: "boolean" },
      { key: "paintArea", label: "外壁塗装 数量", type: "number", unit: "m²", help: "塗り替え対象面積" },
      { key: "grade", label: "劣化度", type: "grade", span: 2 },
      { key: "note", label: "所見", type: "textarea", span: 2 },
    ],
  },
  {
    key: "sealing",
    title: "シーリング",
    subtitle: "目視劣化・物性試験／打ち替え・増し打ち",
    graded: true,
    fields: [
      { key: "visual", label: "目視劣化", type: "multi", options: ["ひび割れ", "肉やせ", "剥離", "変色・硬化", "破断"], span: 2 },
      { key: "parts", label: "対象部位", type: "multi", options: ["サッシ廻り", "伸縮目地", "打継ぎ目地", "ALC板間", "タイル目地"], span: 2 },
      { key: "physicalTest", label: "物性試験 実施", type: "boolean", help: "既存材を採取しダンベル試験で劣化度を判定" },
      { key: "stress50", label: "50%引張応力", type: "number", unit: "N/mm²" },
      { key: "maxStress", label: "最大引張力", type: "number", unit: "N/mm²" },
      { key: "elongation", label: "破断時の伸び", type: "number", unit: "%" },
      { key: "hardness", label: "JIS-A硬度", type: "number", unit: "—", help: "硬化が進むほど高い値" },
      { key: "replaceLen", label: "打ち替え 数量", type: "number", unit: "m" },
      { key: "addLen", label: "増し打ち 数量", type: "number", unit: "m" },
      { key: "grade", label: "劣化度", type: "grade", span: 2 },
      { key: "note", label: "所見", type: "textarea", span: 2 },
    ],
  },
  {
    key: "waterproof",
    title: "防水（屋上・バルコニー・廊下）",
    subtitle: "症状確認・散水試験／改修数量",
    graded: true,
    fields: [
      { key: "parts", label: "対象部位", type: "multi", options: ["屋上", "バルコニー", "開放廊下", "庇・笠木", "その他"], span: 2 },
      { key: "symptoms", label: "症状", type: "multi", options: ["ひび割れ", "膨れ", "色褪せ", "水たまり", "雨漏り（室内）", "植物繁茂"], span: 2 },
      { key: "existing", label: "既存防水工法", type: "select", options: ["ウレタン塗膜", "塩ビシート", "アスファルト", "FRP", "不明"] },
      { key: "sprayTest", label: "散水試験", type: "select", options: ["未実施", "実施・異常なし", "実施・漏水あり"] },
      { key: "area", label: "防水改修 数量", type: "number", unit: "m²" },
      { key: "topcoat", label: "トップコート 数量", type: "number", unit: "m²" },
      { key: "grade", label: "劣化度", type: "grade", span: 2 },
      { key: "note", label: "所見", type: "textarea", span: 2 },
    ],
  },
  {
    key: "ironwork",
    title: "鉄部・その他",
    subtitle: "錆・塗膜剥離／鉄部塗装数量",
    graded: true,
    fields: [
      { key: "parts", label: "対象", type: "multi", options: ["手すり", "階段", "扉", "PS扉", "庇", "排水管", "その他"], span: 2 },
      { key: "rust", label: "錆の程度", type: "select", options: ["なし", "点錆", "面錆", "腐食・孔食"] },
      { key: "filmPeel", label: "塗膜剥離", type: "boolean" },
      { key: "area", label: "鉄部塗装 数量", type: "number", unit: "m²" },
      { key: "grade", label: "劣化度", type: "grade", span: 2 },
      { key: "note", label: "所見", type: "textarea", span: 2 },
    ],
  },
];

export const SECTION_LABELS: Record<string, string> = {
  overall: "全体・外観",
  ...Object.fromEntries(SECTIONS.map((s) => [s.key, s.title])),
};

export const PHOTO_TAGS = ["overall", ...SECTIONS.filter((s) => s.key !== "building").map((s) => s.key)];

/* ====================== 型 ====================== */

export interface SurveyPhoto {
  id: string;
  sectionKey: string;
  caption: string;
  dataUrl: string;
}

export interface DegradationSurvey {
  id: string;
  property_name: string;
  address?: string | null;
  overall_grade?: string | null;
  inspector_name?: string | null;
  survey_date?: string | null;
  status?: string;
  photo_count?: number;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  data?: Record<string, Record<string, unknown>> | null;
  photos?: SurveyPhoto[] | null;
}

/* ====================== 画像圧縮 ====================== */

export function compressImage(file: File, maxSize = 1600, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas error"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("image load error"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("file read error"));
    reader.readAsDataURL(file);
  });
}

/** 構造化データから一覧用メタを導出 */
export function deriveMeta(data: Record<string, Record<string, unknown>>): {
  property_name: string;
  address?: string;
  overall_grade?: string;
  inspector_name?: string;
  survey_date?: string;
} {
  const b = (data.building || {}) as Record<string, unknown>;
  const overall = worstGrade(SECTIONS.filter((s) => s.graded).map((s) => data?.[s.key]?.grade as string | undefined));
  return {
    property_name: (typeof b.propertyName === "string" && b.propertyName.trim()) || "(無題の調査)",
    address: typeof b.address === "string" ? b.address : undefined,
    overall_grade: overall?.key,
    inspector_name: typeof b.inspector === "string" ? b.inspector : undefined,
    survey_date: typeof b.inspectDate === "string" ? b.inspectDate : undefined,
  };
}
