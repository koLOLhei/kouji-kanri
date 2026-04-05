"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Ruler, Plus, ChevronDown, ChevronUp, CheckCircle2, XCircle, Trash2 } from "lucide-react";

interface MeasurementItem {
  name: string;
  design_value: number;
  actual_value: number;
  tolerance: number;
  unit: string;
}

interface Measurement {
  id: string;
  title: string;
  measurement_type: string;
  measured_date: string;
  measured_by: string | null;
  overall_result: string;
  items: MeasurementItem[];
  created_at: string;
}

interface MeasurementStats {
  total: number;
  pass: number;
  fail: number;
  pending: number;
}

const MEASUREMENT_TYPES = [
  { value: "dimension", label: "寸法" },
  { value: "level", label: "レベル" },
  { value: "rebar_spacing", label: "配筋間隔" },
  { value: "cover", label: "かぶり" },
];

function typeLabel(type: string): string {
  return MEASUREMENT_TYPES.find(t => t.value === type)?.label || type;
}

function resultBadge(result: string) {
  if (result === "pass") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" /> 合格
      </span>
    );
  }
  if (result === "fail") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <XCircle className="w-3.5 h-3.5" /> 不合格
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
      未判定
    </span>
  );
}

export default function MeasurementsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    measurement_type: "dimension",
    measured_date: new Date().toISOString().split("T")[0],
    measured_by: "",
    overall_result: "pending",
    items: [{ name: "", design_value: "", actual_value: "", tolerance: "", unit: "mm" }] as { name: string; design_value: string; actual_value: string; tolerance: string; unit: string }[],
  });

  const { data: measurements = [], isLoading } = useQuery<Measurement[]>({
    queryKey: ["measurements", id],
    queryFn: () => apiFetch(`/api/projects/${id}/measurements`, { token: token! }),
    enabled: !!token,
  });

  const { data: stats } = useQuery<MeasurementStats>({
    queryKey: ["measurements-stats", id],
    queryFn: () => apiFetch(`/api/projects/${id}/measurements/stats`, { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/measurements`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements", id] });
      queryClient.invalidateQueries({ queryKey: ["measurements-stats", id] });
      setShowForm(false);
      setForm({
        title: "",
        measurement_type: "dimension",
        measured_date: new Date().toISOString().split("T")[0],
        measured_by: "",
        overall_result: "pending",
        items: [{ name: "", design_value: "", actual_value: "", tolerance: "", unit: "mm" }],
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      ...form,
      items: form.items
        .filter(item => item.name.trim() !== "")
        .map(item => ({
          name: item.name,
          design_value: parseFloat(item.design_value) || 0,
          actual_value: parseFloat(item.actual_value) || 0,
          tolerance: parseFloat(item.tolerance) || 0,
          unit: item.unit,
        })),
    };
    createMutation.mutate(body);
  };

  const addItem = () =>
    setForm({ ...form, items: [...form.items, { name: "", design_value: "", actual_value: "", tolerance: "", unit: "mm" }] });

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...form.items];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, items: updated });
  };

  const removeItem = (index: number) => {
    const updated = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: updated.length === 0 ? [{ name: "", design_value: "", actual_value: "", tolerance: "", unit: "mm" }] : updated });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`} className="p-2 rounded-xl bg-white shadow-sm border border-gray-200 text-gray-500 hover:text-gray-700 hover:shadow-md transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Ruler className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">出来形管理</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all"
        >
          <Plus className="w-4 h-4" /> 新規登録
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="text-sm text-gray-500">総計測数</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">
            <div className="text-sm text-emerald-600">合格</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.pass}</div>
          </div>
          <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-sm">
            <div className="text-sm text-red-600">不合格</div>
            <div className="text-2xl font-bold text-red-700 mt-1">{stats.fail}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="text-sm text-gray-500">未判定</div>
            <div className="text-2xl font-bold text-gray-600 mt-1">{stats.pending}</div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-lg">
          <h2 className="font-bold text-lg text-gray-900">出来形記録登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="基礎コンクリート寸法"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">計測種別</label>
              <select
                value={form.measurement_type}
                onChange={e => setForm({ ...form, measurement_type: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              >
                {MEASUREMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">計測日</label>
              <input
                type="date"
                value={form.measured_date}
                onChange={e => setForm({ ...form, measured_date: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">計測者</label>
              <input
                type="text"
                value={form.measured_by}
                onChange={e => setForm({ ...form, measured_by: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Dynamic Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">計測項目</label>
            <div className="space-y-2">
              <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_1fr_80px_40px] gap-2 text-xs font-semibold text-gray-500 px-1">
                <span>項目名</span>
                <span>設計値</span>
                <span>実測値</span>
                <span>許容差</span>
                <span>単位</span>
                <span></span>
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_80px_40px] gap-2 p-2 bg-gray-50 rounded-xl">
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => updateItem(i, "name", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="幅"
                  />
                  <input
                    type="number"
                    step="any"
                    value={item.design_value}
                    onChange={e => updateItem(i, "design_value", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="1000"
                  />
                  <input
                    type="number"
                    step="any"
                    value={item.actual_value}
                    onChange={e => updateItem(i, "actual_value", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="1002"
                  />
                  <input
                    type="number"
                    step="any"
                    value={item.tolerance}
                    onChange={e => updateItem(i, "tolerance", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="5"
                  />
                  <select
                    value={item.unit}
                    onChange={e => updateItem(i, "unit", e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  >
                    <option>mm</option>
                    <option>cm</option>
                    <option>m</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-red-400 hover:text-red-600 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
              >
                + 項目を追加
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">総合判定</label>
            <select
              value={form.overall_result}
              onChange={e => setForm({ ...form, overall_result: e.target.value })}
              className="w-full md:w-48 border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            >
              <option value="pending">未判定</option>
              <option value="pass">合格</option>
              <option value="fail">不合格</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-2.5 rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 shadow-lg shadow-emerald-500/25 transition-all font-medium"
            >
              {createMutation.isPending ? "保存中..." : "保存"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-gray-300 px-6 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
            >
              キャンセル
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-red-600 text-sm">{(createMutation.error as Error).message}</p>
          )}
        </form>
      )}

      {/* Measurement List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : measurements.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Ruler className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">出来形記録がありません</p>
          <p className="text-gray-400 text-sm mt-1">「新規登録」から計測記録を追加してください</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">タイトル</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">種別</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">計測日</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">判定</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {measurements.map(m => {
                const isExpanded = expandedId === m.id;
                return (
                  <>
                    <tr
                      key={m.id}
                      onClick={() => setExpandedId(isExpanded ? null : m.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 font-semibold text-gray-900">{m.title}</td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                          {typeLabel(m.measurement_type)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{formatDate(m.measured_date)}</td>
                      <td className="px-5 py-4">{resultBadge(m.overall_result)}</td>
                      <td className="px-5 py-4">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${m.id}-detail`}>
                        <td colSpan={5} className="px-5 py-4 bg-gray-50/50">
                          {m.measured_by && (
                            <p className="text-sm text-gray-500 mb-3">計測者: {m.measured_by}</p>
                          )}
                          {m.items && m.items.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-gray-500">
                                    <th className="text-left py-2 pr-4">項目名</th>
                                    <th className="text-right py-2 pr-4">設計値</th>
                                    <th className="text-right py-2 pr-4">実測値</th>
                                    <th className="text-right py-2 pr-4">許容差</th>
                                    <th className="text-right py-2 pr-4">差異</th>
                                    <th className="text-center py-2">判定</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {m.items.map((item, i) => {
                                    const diff = Math.abs(item.actual_value - item.design_value);
                                    const isPass = diff <= item.tolerance;
                                    return (
                                      <tr key={i}>
                                        <td className="py-2 pr-4 font-medium text-gray-700">{item.name}</td>
                                        <td className="py-2 pr-4 text-right text-gray-600">{item.design_value} {item.unit}</td>
                                        <td className="py-2 pr-4 text-right text-gray-900 font-medium">{item.actual_value} {item.unit}</td>
                                        <td className="py-2 pr-4 text-right text-gray-500">&plusmn;{item.tolerance} {item.unit}</td>
                                        <td className={`py-2 pr-4 text-right font-medium ${isPass ? "text-emerald-600" : "text-red-600"}`}>
                                          {diff.toFixed(1)} {item.unit}
                                        </td>
                                        <td className="py-2 text-center">
                                          {isPass ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                                          ) : (
                                            <XCircle className="w-4 h-4 text-red-500 inline" />
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
