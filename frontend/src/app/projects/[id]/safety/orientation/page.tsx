"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Users, Plus, CheckCircle2, Circle, Printer, ClipboardList,
} from "lucide-react";

interface Worker {
  id: string;
  name: string;
  is_active: boolean;
}

interface Orientation {
  id: string;
  worker_id: string;
  orientation_date: string;
  instructor_name: string | null;
  topics_covered: string[] | null;
  health_check_passed: boolean;
  insurance_verified: boolean;
  safety_pledge_signed: boolean;
  blood_type_confirmed: boolean;
  emergency_contact_verified: boolean;
  notes: string | null;
  created_at: string;
}

const DEFAULT_TOPICS = [
  "工事概要・現場ルール説明",
  "緊急時対応手順（避難経路）",
  "作業エリア・立入禁止区域",
  "保護具の着用義務",
  "熱中症・健康管理",
  "整理整頓・清掃",
  "化学物質取扱い",
  "重機・車両の安全",
];

const CHECKLIST_ITEMS: { key: keyof Omit<Orientation, "id" | "worker_id" | "orientation_date" | "instructor_name" | "topics_covered" | "notes" | "created_at">; label: string; description: string }[] = [
  { key: "health_check_passed", label: "健康診断確認", description: "直近の健康診断書を確認済み" },
  { key: "insurance_verified", label: "保険加入確認", description: "労災・社会保険の加入確認済み" },
  { key: "safety_pledge_signed", label: "安全宣誓書署名", description: "安全衛生誓約書に署名済み" },
  { key: "blood_type_confirmed", label: "血液型確認", description: "緊急時対応のため血液型を確認" },
  { key: "emergency_contact_verified", label: "緊急連絡先確認", description: "緊急連絡先を確認・記録済み" },
];

interface FormState {
  worker_id: string;
  orientation_date: string;
  instructor_name: string;
  topics_covered: string[];
  health_check_passed: boolean;
  insurance_verified: boolean;
  safety_pledge_signed: boolean;
  blood_type_confirmed: boolean;
  emergency_contact_verified: boolean;
  notes: string;
}

function defaultForm(): FormState {
  return {
    worker_id: "",
    orientation_date: new Date().toISOString().split("T")[0],
    instructor_name: "",
    topics_covered: [...DEFAULT_TOPICS],
    health_check_passed: false,
    insurance_verified: false,
    safety_pledge_signed: false,
    blood_type_confirmed: false,
    emergency_contact_verified: false,
    notes: "",
  };
}

export default function OrientationPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [printId, setPrintId] = useState<string | null>(null);

  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["workers"],
    queryFn: () => apiFetch("/api/workers?is_active=true", { token: token! }),
    enabled: !!token,
  });

  const { data: orientations = [], isLoading } = useQuery<Orientation[]>({
    queryKey: ["orientations", id],
    queryFn: () => apiFetch(`/api/projects/${id}/safety/worker-orientations`, { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: FormState) =>
      apiFetch(`/api/projects/${id}/safety/worker-orientations`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orientations", id] });
      setShowForm(false);
      setForm(defaultForm());
    },
  });

  const toggleTopic = (topic: string) => {
    setForm(f => ({
      ...f,
      topics_covered: f.topics_covered.includes(topic)
        ? f.topics_covered.filter(t => t !== topic)
        : [...f.topics_covered, topic],
    }));
  };

  const toggleAll = (allChecked: boolean) => {
    setForm(f => ({
      ...f,
      topics_covered: allChecked ? [] : [...DEFAULT_TOPICS],
    }));
  };

  const workerName = (worker_id: string) =>
    workers.find(w => w.id === worker_id)?.name || worker_id;

  const completionRate = (o: Orientation) => {
    const checks = CHECKLIST_ITEMS.filter(item => o[item.key]).length;
    return Math.round((checks / CHECKLIST_ITEMS.length) * 100);
  };

  const printOrientation = orientations.find(o => o.id === printId);

  if (printId && printOrientation) {
    return (
      <div className="p-8 max-w-3xl mx-auto print:p-4">
        <div className="flex justify-between items-start mb-6 print:hidden">
          <button onClick={() => setPrintId(null)} className="text-blue-600 hover:underline flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> 一覧に戻る
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            <Printer className="w-4 h-4" /> 印刷
          </button>
        </div>

        <div className="border-2 border-gray-800 rounded-lg p-6">
          <h1 className="text-xl font-bold text-center mb-2">新規入場者教育 実施記録</h1>
          <div className="text-center text-sm text-gray-500 mb-6">実施日: {formatDate(printOrientation.orientation_date)}</div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-gray-500">作業員氏名</p>
              <p className="font-bold text-lg">{workerName(printOrientation.worker_id)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">指導者</p>
              <p className="font-medium">{printOrientation.instructor_name || "-"}</p>
            </div>
          </div>

          <h2 className="font-semibold border-b pb-1 mb-3">確認チェックリスト</h2>
          <div className="space-y-2 mb-6">
            {CHECKLIST_ITEMS.map(item => (
              <div key={item.key} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  printOrientation[item.key] ? "bg-green-500 border-green-500" : "border-gray-400"
                }`}>
                  {printOrientation[item.key] && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <span className="font-medium">{item.label}</span>
                  <span className="text-sm text-gray-500 ml-2">（{item.description}）</span>
                </div>
              </div>
            ))}
          </div>

          <h2 className="font-semibold border-b pb-1 mb-3">教育実施内容</h2>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {(printOrientation.topics_covered || []).map(t => (
              <div key={t} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                {t}
              </div>
            ))}
          </div>

          {printOrientation.notes && (
            <div className="mb-6">
              <h2 className="font-semibold border-b pb-1 mb-2">備考</h2>
              <p className="text-sm whitespace-pre-wrap">{printOrientation.notes}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-8 mt-8">
            <div className="border-t pt-2 text-center text-sm text-gray-500">指導者 署名</div>
            <div className="border-t pt-2 text-center text-sm text-gray-500">作業員 署名</div>
          </div>
        </div>
      </div>
    );
  }

  const allTopicsChecked = DEFAULT_TOPICS.every(t => form.topics_covered.includes(t));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}/safety`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" /> 新規入場者教育
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 教育記録を追加
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }}
          className="bg-white border rounded-xl p-6 space-y-5"
        >
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> 新規入場者教育 登録
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">作業員 <span className="text-red-500">*</span></label>
              <select
                value={form.worker_id}
                onChange={e => setForm({ ...form, worker_id: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">選択してください</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">実施日 <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.orientation_date}
                onChange={e => setForm({ ...form, orientation_date: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">指導者名</label>
              <input
                type="text"
                value={form.instructor_name}
                onChange={e => setForm({ ...form, instructor_name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="担当者名"
              />
            </div>
          </div>

          {/* Checklist items */}
          <div>
            <h3 className="font-medium text-sm mb-3">確認事項</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CHECKLIST_ITEMS.map(item => (
                <label key={item.key} className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form[item.key] as boolean}
                    onChange={e => setForm({ ...form, [item.key]: e.target.checked })}
                    className="mt-0.5 w-4 h-4 text-blue-600"
                  />
                  <div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">教育実施内容</h3>
              <button
                type="button"
                onClick={() => toggleAll(allTopicsChecked)}
                className="text-xs text-blue-600 hover:underline"
              >
                {allTopicsChecked ? "全選択解除" : "全選択"}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {DEFAULT_TOPICS.map(topic => (
                <label key={topic} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.topics_covered.includes(topic)}
                    onChange={() => toggleTopic(topic)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">{topic}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">備考</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full border rounded px-3 py-2 h-20 resize-none"
              placeholder="特記事項があれば入力"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending || !form.worker_id}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? "保存中..." : "保存"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="border px-6 py-2 rounded-lg hover:bg-gray-50">キャンセル</button>
          </div>
          {createMutation.isError && (
            <p className="text-red-600 text-sm">{(createMutation.error as Error).message}</p>
          )}
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : orientations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>入場者教育記録がありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orientations.map(o => {
            const rate = completionRate(o);
            return (
              <div key={o.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">{workerName(o.worker_id)}</span>
                      <span className="text-sm text-gray-500">{formatDate(o.orientation_date)}</span>
                    </div>
                    {o.instructor_name && (
                      <p className="text-sm text-gray-500 mt-0.5">指導者: {o.instructor_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${rate === 100 ? "text-green-600" : rate >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                        {rate}%
                      </div>
                      <div className="text-xs text-gray-400">完了率</div>
                    </div>
                    <button
                      onClick={() => setPrintId(o.id)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="印刷"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Checklist status */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {CHECKLIST_ITEMS.map(item => (
                    <span
                      key={item.key}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                        o[item.key] ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {o[item.key]
                        ? <CheckCircle2 className="w-3 h-3" />
                        : <Circle className="w-3 h-3" />
                      }
                      {item.label}
                    </span>
                  ))}
                </div>

                {/* Topics */}
                {o.topics_covered && o.topics_covered.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    教育項目: {o.topics_covered.length}項目
                  </div>
                )}

                {o.notes && (
                  <p className="mt-2 text-sm text-gray-600 italic">{o.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
