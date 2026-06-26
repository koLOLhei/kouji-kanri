'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Printer, Camera, X, Loader2, ChevronDown, Check, CloudOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/utils';
import {
  SECTIONS,
  GRADES,
  worstGrade,
  classifyCrack,
  classifyTilePull,
  compressImage,
  deriveMeta,
  SECTION_LABELS,
  PHOTO_TAGS,
  type Field,
  type Section,
  type DegradationSurvey,
  type SurveyPhoto,
} from '@/lib/degradation-schema';

type DataMap = Record<string, Record<string, unknown>>;

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'ph-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
}

export default function DegradationSurveyEditorPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const params = useParams();
  const id = params.id as string;

  const { data: survey, isLoading, isError } = useQuery<DegradationSurvey>({
    queryKey: ['degradation-survey', id],
    queryFn: () => apiFetch(`/api/degradation-surveys/${id}`, { token }),
    enabled: !!id && !!token,
  });

  const [data, setData] = useState<DataMap>({});
  const [photos, setPhotos] = useState<SurveyPhoto[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<DataMap>({});
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (survey && !loadedRef.current) {
      // サーバ取得データを編集用ローカルstateへ一度だけ取り込む（react-queryの初期化）
      /* eslint-disable react-hooks/set-state-in-effect */
      const d = (survey.data as DataMap) || {};
      setData(d);
      dataRef.current = d;
      setPhotos(survey.photos || []);
      loadedRef.current = true;
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [survey]);

  const persist = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaveState('saving');
      try {
        await apiFetch(`/api/degradation-surveys/${id}`, { token, method: 'PUT', body: JSON.stringify(patch) });
        setSaveState('saved');
        qc.invalidateQueries({ queryKey: ['degradation-surveys'] });
      } catch {
        setSaveState('error');
      }
    },
    [id, token, qc],
  );

  // 構造化データ：デバウンス保存（メタ＋data）
  const scheduleSave = useCallback(
    (nextData: DataMap) => {
      dataRef.current = nextData;
      dirtyRef.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveState('saving');
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        persist({ ...deriveMeta(nextData), data: nextData }).then(() => {
          dirtyRef.current = false;
        });
      }, 1100);
    },
    [persist],
  );

  // アンマウント時：本当に未保存の変更があるときだけフラッシュ（冗長/空PUTを防ぐ）
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dirtyRef.current && loadedRef.current) {
        const d = dataRef.current;
        apiFetch(`/api/degradation-surveys/${id}`, { token, method: 'PUT', body: JSON.stringify({ ...deriveMeta(d), data: d }) }).catch(() => {});
      }
    };
  }, [id, token]);

  const setField = (sectionKey: string, fieldKey: string, value: unknown) => {
    setData((prev) => {
      const next = { ...prev, [sectionKey]: { ...(prev[sectionKey] || {}), [fieldKey]: value } };
      scheduleSave(next);
      return next;
    });
  };

  const savePhotos = useCallback(
    (next: SurveyPhoto[]) => {
      setPhotos(next);
      persist({ photos: next });
    },
    [persist],
  );

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">読み込み中...</div>;
  }
  if (isError || !survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-600">調査の取得に失敗しました</p>
        <Link href="/degradation-surveys" className="text-sm text-gray-600 underline">一覧へ戻る</Link>
      </div>
    );
  }

  const overall = worstGrade(SECTIONS.filter((s) => s.graded).map((s) => data?.[s.key]?.grade as string | undefined));
  const title = (typeof data.building?.propertyName === 'string' && data.building.propertyName) || '(無題の調査)';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 画面ヘッダー（印刷では隠す） */}
        <div className="no-print">
          <nav aria-label="パンくず" className="mb-4">
            <Link href="/degradation-surveys" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
              <ChevronLeft size={16} aria-hidden="true" />
              劣化診断 一覧へ
            </Link>
          </nav>

          <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate max-w-[50vw]">{title}</h1>
              {overall && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded ${overall.bg} ${overall.text}`}>
                  総合 {overall.label}｜{overall.desc}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <SaveIndicator state={saveState} />
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm text-gray-900 rounded-md hover:bg-gray-50 transition"
              >
                <Printer size={16} aria-hidden="true" /> 印刷
              </button>
            </div>
          </header>

          <div className="space-y-4">
            {SECTIONS.map((section) => (
              <SectionCard key={section.key} section={section} data={data[section.key] || {}} onChange={setField} />
            ))}
            <PhotoPanel photos={photos} onChange={savePhotos} />
          </div>

          <p className="mt-6 text-xs text-gray-400">入力は自動保存され、同テナントのメンバーと共有されます。</p>
        </div>

        {/* 印刷レポート */}
        <ReportView title={title} data={data} photos={photos} overall={overall} />
      </div>
    </div>
  );
}

/* ───────────── 保存インジケータ ───────────── */
function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'saving') return <span className="text-xs text-gray-400 inline-flex items-center gap-1"><Loader2 size={13} className="animate-spin" /> 保存中…</span>;
  if (state === 'saved') return <span className="text-xs text-emerald-600 inline-flex items-center gap-1"><Check size={13} /> 保存済み</span>;
  if (state === 'error') return <span className="text-xs text-red-600 inline-flex items-center gap-1"><CloudOff size={13} /> 保存に失敗</span>;
  return null;
}

/* ───────────── セクションカード ───────────── */
function SectionCard({
  section,
  data,
  onChange,
}: {
  section: Section;
  data: Record<string, unknown>;
  onChange: (sectionKey: string, fieldKey: string, value: unknown) => void;
}) {
  const [open, setOpen] = useState(true);
  const grade = data.grade as string | undefined;
  const g = grade ? GRADES.find((x) => x.key === grade) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 text-left">
        <div>
          <span className="text-sm font-semibold text-gray-900">{section.title}</span>
          {section.subtitle && <span className="block text-xs text-gray-400 mt-0.5">{section.subtitle}</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {g && <span className={`px-2 py-0.5 text-xs font-bold rounded ${g.bg} ${g.text}`}>{g.label}</span>}
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          {section.fields.map((field) => (
            <FieldInput key={field.key} field={field} value={data[field.key]} onChange={(v) => onChange(section.key, field.key, v)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────── 汎用フィールド ───────────── */
function FieldInput({ field, value, onChange }: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  const labelEl = (
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {field.label}
      {field.unit && field.unit !== '—' && <span className="text-gray-400 font-normal">（{field.unit}）</span>}
    </label>
  );
  const help = field.help && <p className="mt-1 text-[11px] text-gray-400 leading-snug">{field.help}</p>;
  const span = field.span === 2 ? 'sm:col-span-2' : '';
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition';

  let derived: React.ReactNode = null;
  if (field.key === 'crackWidth') {
    const c = classifyCrack(typeof value === 'number' ? value : parseFloat(String(value)));
    if (c) {
      const gg = GRADES.find((x) => x.key === c.grade)!;
      derived = <p className={`mt-1 text-[11px] font-medium ${gg.text}`}>→ {c.label}</p>;
    }
  }
  if (field.key === 'pullStrength') {
    const c = classifyTilePull(typeof value === 'number' ? value : parseFloat(String(value)));
    if (c) {
      const gg = GRADES.find((x) => x.key === c.grade)!;
      derived = <p className={`mt-1 text-[11px] font-medium ${gg.text}`}>→ {c.label}</p>;
    }
  }

  switch (field.type) {
    case 'textarea':
      return (
        <div className={span}>
          {labelEl}
          <textarea rows={2} value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} className={`${inputCls} resize-y`} placeholder={field.placeholder} />
          {help}
        </div>
      );
    case 'select':
      return (
        <div className={span}>
          {labelEl}
          <select value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} className={inputCls}>
            <option value="">選択してください</option>
            {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {help}
        </div>
      );
    case 'number':
      return (
        <div className={span}>
          {labelEl}
          <input
            type="number"
            inputMode="decimal"
            value={value === undefined || value === null ? '' : String(value)}
            onChange={(e) => onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
            className={inputCls}
            placeholder={field.placeholder}
          />
          {derived}
          {help}
        </div>
      );
    case 'boolean':
      return (
        <div className={span}>
          {labelEl}
          <div className="flex gap-2">
            {[{ v: true, l: 'あり' }, { v: false, l: 'なし' }].map((o) => (
              <button
                key={o.l}
                type="button"
                onClick={() => onChange(o.v)}
                className={`px-4 py-2 text-sm border rounded-md transition ${value === o.v ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
              >
                {o.l}
              </button>
            ))}
          </div>
          {help}
        </div>
      );
    case 'multi': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className={span}>
          {labelEl}
          <div className="flex flex-wrap gap-2">
            {field.options?.map((o) => {
              const on = arr.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}
                  className={`px-3 py-1.5 text-xs border rounded-full transition ${on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {help}
        </div>
      );
    }
    case 'grade':
      return (
        <div className={span}>
          {labelEl}
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map((gr) => {
              const on = value === gr.key;
              return (
                <button
                  key={gr.key}
                  type="button"
                  onClick={() => onChange(gr.key)}
                  className={`py-2 text-center border rounded-md transition ${on ? `${gr.bg} ${gr.text} ring-2 ${gr.ring} border-transparent` : 'border-gray-300 text-gray-500 hover:border-gray-400'}`}
                >
                  <span className="block text-base font-bold">{gr.label}</span>
                  <span className="block text-[10px] mt-0.5 leading-tight">{gr.desc}</span>
                </button>
              );
            })}
          </div>
          {help}
        </div>
      );
    case 'date':
      return (
        <div className={span}>
          {labelEl}
          <input type="date" value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} className={inputCls} />
          {help}
        </div>
      );
    default:
      return (
        <div className={span}>
          {labelEl}
          <input type="text" value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder={field.placeholder} />
          {help}
        </div>
      );
  }
}

/* ───────────── 現場写真 ───────────── */
function PhotoPanel({ photos, onChange }: { photos: SurveyPhoto[]; onChange: (next: SurveyPhoto[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [tag, setTag] = useState('overall');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    const added: SurveyPhoto[] = [];
    let failed = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        failed++;
        continue;
      }
      // 1枚失敗してもバッチ全体は止めない（iOSのHEIC等）
      try {
        const dataUrl = await compressImage(file);
        added.push({ id: uid(), sectionKey: tag, caption: '', dataUrl });
      } catch {
        failed++;
      }
    }
    if (added.length) onChange([...photos, ...added]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    if (failed) alert(`${failed}枚は読み込めませんでした（対応形式: JPEG / PNG）。`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50">
        <div>
          <span className="text-sm font-semibold text-gray-900">現場写真</span>
          <span className="block text-xs text-gray-400 mt-0.5">劣化箇所を撮影。報告書に添付され、共有されます</span>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">{photos.length}枚</span>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select value={tag} onChange={(e) => setTag(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900" aria-label="写真の分類">
            {PHOTO_TAGS.map((t) => <option key={t} value={t}>{SECTION_LABELS[t]}</option>)}
          </select>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700 transition disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            {uploading ? '処理中…' : '写真を追加・撮影'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
        </div>
        {photos.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded">まだ写真がありません。</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="border border-gray-200 rounded overflow-hidden">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.dataUrl} alt={p.caption || '現場写真'} className="w-full h-28 object-cover" />
                  <button
                    type="button"
                    onClick={() => onChange(photos.filter((x) => x.id !== p.id))}
                    className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-black/60 text-white rounded-full hover:bg-black/80 transition"
                    aria-label="写真を削除"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="p-2 space-y-1.5">
                  <select
                    value={p.sectionKey}
                    onChange={(e) => onChange(photos.map((x) => (x.id === p.id ? { ...x, sectionKey: e.target.value } : x)))}
                    className="w-full px-1 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    {PHOTO_TAGS.map((t) => <option key={t} value={t}>{SECTION_LABELS[t]}</option>)}
                  </select>
                  <input
                    type="text"
                    defaultValue={p.caption}
                    placeholder="キャプション"
                    onBlur={(e) => {
                      if (e.target.value !== p.caption) onChange(photos.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)));
                    }}
                    className="w-full px-1 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────── 印刷レポート ───────────── */
function formatValue(field: Field, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (field.type === 'boolean') return value ? 'あり' : 'なし';
  if (field.type === 'multi') return Array.isArray(value) && value.length ? (value as string[]).join('・') : '—';
  if (field.type === 'grade') {
    const g = GRADES.find((x) => x.key === value);
    return g ? `${g.label}｜${g.desc}` : '—';
  }
  if (field.unit && field.unit !== '—') return `${value} ${field.unit}`;
  return String(value);
}

function ReportView({
  title,
  data,
  photos,
  overall,
}: {
  title: string;
  data: DataMap;
  photos: SurveyPhoto[];
  overall: ReturnType<typeof worstGrade>;
}) {
  return (
    <div className="print-report hidden print:block text-gray-900">
      <div className="flex items-end justify-between border-b-2 border-gray-900 pb-2 mb-4">
        <div>
          <h1 className="text-xl font-bold">建物劣化診断 調査報告書</h1>
          <p className="text-sm mt-1">{title}</p>
        </div>
        <div className="text-right text-xs">
          <p>KAMO construction</p>
          {overall && <p className="font-bold mt-1">総合判定：{overall.label}（{overall.desc}）</p>}
        </div>
      </div>
      {SECTIONS.map((section) => {
        const d = data[section.key] || {};
        return (
          <div key={section.key} className="mb-4 break-inside-avoid">
            <h2 className="text-sm font-bold bg-gray-100 px-2 py-1">{section.title}</h2>
            <table className="w-full text-xs border-collapse">
              <tbody>
                {section.fields.filter((f) => f.type !== 'grade').map((f) => (
                  <tr key={f.key} className="border-b border-gray-200">
                    <th className="text-left font-medium text-gray-500 py-1 pr-2 w-1/3 align-top">{f.label}</th>
                    <td className="py-1 align-top">{formatValue(f, d[f.key])}</td>
                  </tr>
                ))}
                {section.graded && (
                  <tr className="border-b border-gray-200">
                    <th className="text-left font-medium text-gray-500 py-1 pr-2 align-top">劣化度</th>
                    <td className="py-1 font-bold align-top">{formatValue({ key: 'grade', label: '', type: 'grade' }, d.grade)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
      {photos.length > 0 && (
        <div className="mt-6 break-before-page">
          <h2 className="text-sm font-bold bg-gray-100 px-2 py-1 mb-3">添付写真（{photos.length}枚）</h2>
          {PHOTO_TAGS.filter((t) => photos.some((p) => p.sectionKey === t)).map((t) => (
            <div key={t} className="mb-4 break-inside-avoid">
              <p className="text-xs font-bold text-gray-600 mb-2">{SECTION_LABELS[t]}</p>
              <div className="grid grid-cols-2 gap-3">
                {photos.filter((p) => p.sectionKey === t).map((p) => (
                  <figure key={p.id} className="break-inside-avoid">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.dataUrl} alt={p.caption || '現場写真'} className="w-full h-44 object-cover border border-gray-300" />
                    {p.caption && <figcaption className="text-[11px] text-gray-600 mt-1">{p.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
