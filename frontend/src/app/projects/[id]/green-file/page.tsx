'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FileText, Download, X, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/utils';

type Template = {
  template_type: string;
  label_ja: string;
  label_en: string;
  category: string;
  file: string;
  required_fields: string[];
};

type GenerateResponse = {
  document_id: string;
  template_type: string;
  label_ja: string;
  download_url: string | null;
  content_type: string;
};

type FormState = {
  // 共通項目
  company_name: string;
  company_address: string;
  representative: string;
  contact: string;
  general_contractor: string;
  site_manager: string;
  submission_date: string;
  // テンプレ別の動的項目 (JSON 入力)
  custom_json: string;
};

const initialForm: FormState = {
  company_name: '',
  company_address: '',
  representative: '',
  contact: '',
  general_contractor: '',
  site_manager: '',
  submission_date: new Date().toISOString().slice(0, 10),
  custom_json: '{}',
};

// テンプレ別の動的フィールドの例 (UIヒント用)
const DYNAMIC_HINTS: Record<string, string> = {
  sagyoin_meibo: `{
  "workers": [
    {"job_type": "電気工", "name": "山田 太郎", "furigana": "ヤマダ タロウ", "age": 39, "experience_years": 12,
     "address": "東京都...", "phone": "090-...", "blood_type": "A",
     "health_insurance_no": "12345678", "pension_no": "ABCD-12", "employment_insurance_no": "1234-...",
     "taishokukin_kyosai": true, "contract_type": "直", "entry_date": "2024-04-01", "entry_education_date": "2024-04-01"}
  ]
}`,
  mochikomi_crane: `{
  "machines": [
    {"name": "移動式クレーン", "model": "25t吊", "serial_no": "SN-12345", "capacity": "25t",
     "manufactured": "2020-04", "bring_in": "2025-05-01", "take_out": "2025-05-31",
     "last_inspection": "2025-04-01", "valid_until": "2026-04-01",
     "operator_name": "田中 一郎", "license": "移動式クレーン運転士"}
  ]
}`,
  mochikomi_denki_kogu: `{
  "tools": [
    {"name": "電動ドリル", "model": "HD-100", "voltage": "100V/500W",
     "insulation_check_date": "2025-04-15", "responsible_person": "鈴木 三郎",
     "bring_in": "2025-05-01", "take_out": "2025-05-31"}
  ]
}`,
  kojiyou_sharyou: `{
  "vehicles": [
    {"type": "2tダンプ", "registration_no": "品川100あ12-34", "chassis_no": "ABC-1234",
     "owner": "株式会社サンプル", "user": "株式会社サンプル", "driver": "山田 太郎",
     "license_no": "123456789", "shaken_until": "2026-04", "jibaiseki_until": "2026-04"}
  ]
}`,
  yuki_yozai_todoke: `{
  "chemicals": [
    {"name": "トルエン", "category": "第二種", "product_name": "シンナーA",
     "manufacturer": "化学メーカー", "monthly_use": "10L", "period": "2025-05",
     "location": "現場B棟", "sds_attached": true}
  ],
  "work_supervisor": "佐藤 二郎",
  "ventilation": "局排設置済"
}`,
  kaki_shiyou_negai: `{
  "responsible_person": "山田 太郎",
  "start_datetime": "2025-05-15 09:00",
  "end_datetime": "2025-05-15 17:00",
  "location": "B棟3F鉄骨組立場",
  "work_description": "鉄骨溶接作業",
  "fire_types": "ガス溶接、アーク溶接",
  "operators": "田中 一郎",
  "operator_qualifications": "ガス溶接技能講習修了",
  "watchman": "鈴木 三郎"
}`,
  okuridashi_kyouiku: `{
  "sender_company": "株式会社サンプル",
  "education_date": "2025-04-15",
  "education_location": "本社会議室",
  "educator": "山田 太郎",
  "attendees": [
    {"name": "佐藤 二郎", "job_type": "電気工", "experience_years": 5, "company": "株式会社サンプル"}
  ]
}`,
  nensho_kourei_houkoku: `{
  "workers": [
    {"category": "高年齢者", "name": "山田 太郎", "birthdate": "1958-04-01", "age": 67,
     "job_type": "電気工", "work": "配線作業", "period": "2025-05～", "health_check": "2025-04"}
  ]
}`,
  taisei_daicho_tsuchi: `{
  "subcontractor_name": "株式会社下請"
}`,
  kensetsu_kaizen_todoke: `{
  "license_number": "東京都知事 般 第12345号",
  "license_date": "2023-04-01",
  "license_categories": "電気工事",
  "employment_insurance": true,
  "employment_insurance_no": "1234-567890-0",
  "health_insurance": true,
  "pension_insurance": true,
  "general_safety_manager": "山田 太郎",
  "safety_manager": "佐藤 二郎"
}`,
  jigyou_anzen_keikaku: `{
  "safety_goal": "労働災害ゼロ、休業災害ゼロ",
  "priority_issues": "墜落・転落防止、KY活動の徹底",
  "slogan": "Safety First",
  "roles": [
    {"title": "統括安全衛生責任者", "name": "山田 太郎", "duties": "事業所全体の安全衛生統括"}
  ],
  "risks": [
    {"work": "高所作業", "hazard": "墜落", "level": "高", "measure": "親綱・安全帯の使用"}
  ]
}`,
  ashiba_tenken: `{
  "inspector": "山田 太郎",
  "inspection_date": "2025-05-15",
  "scaffold_type": "枠組み足場",
  "scaffold_height": 12,
  "weather": "晴",
  "items": [
    {"name": "床材の損傷確認", "judge": "ok", "note": "異常なし"}
  ]
}`,
  anzen_keikaku_nenkan: `{
  "fiscal_year": "令和7年度",
  "basic_policy": "1. ゼロ災害達成\\n2. 計画的健康診断",
  "management_roles": [
    {"role": "総括安全衛生管理者", "name": "山田 太郎"}
  ],
  "strategies": [
    {"theme": "1. 体制強化", "action": "計画書の作成", "goal": "年1回",
     "owner": "安全衛生委員", "months": [4], "note": "年度始め"}
  ]
}`,
  romu_anzen_seiyaku: `{}`,
};

const CATEGORY_TABS: { key: string; label: string }[] = [
  { key: 'green_file', label: 'グリーンファイル / 安全書類' },
  { key: 'plan', label: '施工計画書' },
  { key: 'payment', label: '見積・請求' },
  { key: 'inspection', label: '検査記録' },
  { key: 'quality', label: '品質管理' },
  { key: 'organization', label: '体制台帳' },
  { key: 'safety', label: '安全管理' },
];

export default function GreenFilePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [category, setCategory] = useState<string>('green_file');
  const [selected, setSelected] = useState<Template | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['doc-templates', category],
    queryFn: () => apiFetch(`/api/documents/templates?category=${category}`, { token }),
    enabled: !!token,
  });

  const generate = useMutation({
    mutationFn: async (payload: { template_type: string; context_data: Record<string, unknown> }) =>
      apiFetch<GenerateResponse>(
        `/api/projects/${id}/documents/generate`,
        { token, method: 'POST', body: JSON.stringify({ ...payload, output_format: 'pdf', save_to_storage: true }) },
      ),
    onSuccess: (data) => { setResult(data); setError(null); },
    onError: (e: Error) => setError(e.message),
  });

  const open = (t: Template) => {
    setSelected(t);
    setForm({ ...initialForm, custom_json: DYNAMIC_HINTS[t.template_type] || '{}' });
    setError(null);
    setResult(null);
  };

  const close = () => { setSelected(null); setError(null); setResult(null); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    let custom: Record<string, unknown>;
    try {
      custom = JSON.parse(form.custom_json || '{}');
    } catch (err) {
      setError(`JSON 構文エラー: ${(err as Error).message}`);
      return;
    }
    const context_data = {
      company_name: form.company_name,
      company_address: form.company_address,
      representative: form.representative,
      contact: form.contact,
      general_contractor: form.general_contractor,
      site_manager: form.site_manager,
      submission_date: form.submission_date,
      ...custom,
    };
    generate.mutate({ template_type: selected.template_type, context_data });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">書類生成</h1>
          <p className="text-sm text-gray-500 mt-1">
            作業員名簿・新規入場者調査票・施工計画書・見積書など、工事に必要な書類を自動生成します。
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b">
        {CATEGORY_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setCategory(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              category === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={16} />読み込み中...</div>
      ) : templates.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
          <AlertTriangle className="inline mr-1" size={14} />
          このカテゴリにテンプレートがありません。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t) => (
            <button
              key={t.template_type}
              onClick={() => open(t)}
              className="text-left bg-white rounded-lg shadow border hover:border-blue-400 hover:shadow-md transition p-4"
            >
              <div className="flex items-start gap-2">
                <FileText size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm leading-snug">{t.label_ja}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{t.template_type}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b flex justify-between items-center p-4">
              <div>
                <h2 className="text-lg font-bold">{selected.label_ja}</h2>
                <p className="text-xs text-gray-500">{selected.template_type}</p>
              </div>
              <button onClick={close}><X size={20} /></button>
            </div>

            <form onSubmit={submit} className="p-4 space-y-4">
              <section>
                <h3 className="text-sm font-medium mb-2 text-gray-700">共通項目</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input placeholder="会社名" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="border rounded px-3 py-2 text-sm" />
                  <input placeholder="代表者氏名" value={form.representative} onChange={(e) => setForm({ ...form, representative: e.target.value })} className="border rounded px-3 py-2 text-sm" />
                  <input placeholder="会社所在地" value={form.company_address} onChange={(e) => setForm({ ...form, company_address: e.target.value })} className="border rounded px-3 py-2 text-sm" />
                  <input placeholder="連絡先 (TEL)" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="border rounded px-3 py-2 text-sm" />
                  <input placeholder="元請会社名" value={form.general_contractor} onChange={(e) => setForm({ ...form, general_contractor: e.target.value })} className="border rounded px-3 py-2 text-sm" />
                  <input placeholder="現場代理人 (所長)" value={form.site_manager} onChange={(e) => setForm({ ...form, site_manager: e.target.value })} className="border rounded px-3 py-2 text-sm" />
                  <input type="date" value={form.submission_date} onChange={(e) => setForm({ ...form, submission_date: e.target.value })} className="border rounded px-3 py-2 text-sm" />
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium mb-2 text-gray-700">
                  動的データ (JSON 形式) <span className="text-xs text-gray-500 ml-2">— 作業員リスト・機械リスト・化学物質等を JSON で記述</span>
                </h3>
                <textarea
                  value={form.custom_json}
                  onChange={(e) => setForm({ ...form, custom_json: e.target.value })}
                  rows={14}
                  className="w-full font-mono text-xs border rounded px-3 py-2 bg-gray-50"
                />
              </section>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                  <AlertTriangle className="inline mr-1" size={14} />{error}
                </div>
              )}

              {result && result.download_url && (
                <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                  生成完了:&nbsp;
                  <a href={result.download_url} target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-1">
                    <Download size={14} />ダウンロード
                  </a>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={close} className="px-4 py-2 text-sm border rounded">閉じる</button>
                <button type="submit" disabled={generate.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                  {generate.isPending ? '生成中...' : 'PDF生成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
