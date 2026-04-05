"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus, CheckCircle2 } from "lucide-react";

interface WasteManifest {
  id: string;
  manifest_number: string;
  waste_type: string;
  waste_category: string | null;
  quantity: number;
  unit: string;
  collector_name: string | null;
  disposal_name: string | null;
  issued_date: string;
  status: string;
  created_at: string;
}

interface WasteSummary {
  by_type: { waste_type: string; total_quantity: number; unit: string; count: number }[];
  total_manifests: number;
}

const WASTE_TYPES = [
  { value: "concrete", label: "コンクリートがら" },
  { value: "wood", label: "木くず" },
  { value: "metal", label: "金属くず" },
  { value: "plastic", label: "廃プラ" },
  { value: "sludge", label: "汚泥" },
  { value: "rubble", label: "がれき" },
];

const STATUS_FLOW = [
  { value: "issued", label: "発行" },
  { value: "collected", label: "収集" },
  { value: "disposed", label: "処分" },
  { value: "final_disposed", label: "最終処分" },
  { value: "completed", label: "完了" },
];

function wasteTypeLabel(type: string): string {
  return WASTE_TYPES.find(t => t.value === type)?.label || type;
}

function wasteTypeBadge(type: string) {
  const colors: Record<string, string> = {
    concrete: "bg-gray-100 text-gray-700",
    wood: "bg-amber-100 text-amber-700",
    metal: "bg-slate-100 text-slate-700",
    plastic: "bg-purple-100 text-purple-700",
    sludge: "bg-yellow-100 text-yellow-700",
    rubble: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[type] || "bg-gray-100 text-gray-700"}`}>
      {wasteTypeLabel(type)}
    </span>
  );
}

function StatusSteps({ currentStatus }: { currentStatus: string }) {
  const currentIndex = STATUS_FLOW.findIndex(s => s.value === currentStatus);
  return (
    <div className="flex items-center gap-1">
      {STATUS_FLOW.map((step, i) => {
        const isDone = i <= currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step.value} className="flex items-center gap-1">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
              isCurrent
                ? "bg-blue-600 text-white shadow-sm"
                : isDone
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-400"
            }`}>
              {isDone && !isCurrent && <CheckCircle2 className="w-3 h-3" />}
              {step.label}
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div className={`w-3 h-0.5 ${i < currentIndex ? "bg-emerald-300" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function WastePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    manifest_number: "",
    waste_type: "concrete",
    waste_category: "",
    quantity: "",
    unit: "t",
    collector_name: "",
    disposal_name: "",
    issued_date: new Date().toISOString().split("T")[0],
  });

  const { data: manifests = [], isLoading } = useQuery<WasteManifest[]>({
    queryKey: ["waste-manifests", id],
    queryFn: () => apiFetch(`/api/projects/${id}/waste-manifests`, { token: token! }),
    enabled: !!token,
  });

  const { data: summary } = useQuery<WasteSummary>({
    queryKey: ["waste-summary", id],
    queryFn: () => apiFetch(`/api/projects/${id}/waste-manifests/summary`, { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/waste-manifests`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waste-manifests", id] });
      queryClient.invalidateQueries({ queryKey: ["waste-summary", id] });
      setShowForm(false);
      setForm({
        manifest_number: "",
        waste_type: "concrete",
        waste_category: "",
        quantity: "",
        unit: "t",
        collector_name: "",
        disposal_name: "",
        issued_date: new Date().toISOString().split("T")[0],
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ manifestId, status }: { manifestId: string; status: string }) =>
      apiFetch(`/api/projects/${id}/waste-manifests/${manifestId}/update-status`, {
        token: token!,
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waste-manifests", id] });
      queryClient.invalidateQueries({ queryKey: ["waste-summary", id] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      quantity: parseFloat(form.quantity) || 0,
    });
  };

  const nextStatus = (current: string): string | null => {
    const idx = STATUS_FLOW.findIndex(s => s.value === current);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1].value : null;
  };

  const nextStatusLabel = (current: string): string | null => {
    const idx = STATUS_FLOW.findIndex(s => s.value === current);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1].label : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`} className="p-2 rounded-xl bg-white shadow-sm border border-gray-200 text-gray-500 hover:text-gray-700 hover:shadow-md transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Trash2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">廃棄物管理</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-5 py-2.5 rounded-xl hover:from-amber-700 hover:to-orange-700 shadow-lg shadow-amber-500/25 transition-all"
        >
          <Plus className="w-4 h-4" /> マニフェスト登録
        </button>
      </div>

      {/* Summary */}
      {summary && summary.by_type.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {summary.by_type.map(item => (
            <div key={item.waste_type} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">{wasteTypeLabel(item.waste_type)}</div>
              <div className="text-xl font-bold text-gray-900">
                {item.total_quantity.toLocaleString()} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{item.count}件</div>
            </div>
          ))}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-lg">
          <h2 className="font-bold text-lg text-gray-900">マニフェスト登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">マニフェスト番号</label>
              <input
                type="text"
                value={form.manifest_number}
                onChange={e => setForm({ ...form, manifest_number: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                placeholder="A-001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">廃棄物種類</label>
              <select
                value={form.waste_type}
                onChange={e => setForm({ ...form, waste_type: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
              >
                {WASTE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
              <input
                type="text"
                value={form.waste_category}
                onChange={e => setForm({ ...form, waste_category: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                placeholder="産業廃棄物"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">交付日</label>
              <input
                type="date"
                value={form.issued_date}
                onChange={e => setForm({ ...form, issued_date: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
              <input
                type="number"
                step="any"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                placeholder="10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">単位</label>
              <select
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
              >
                <option value="t">t</option>
                <option value="m3">m3</option>
                <option value="kg">kg</option>
                <option value="L">L</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">収集運搬業者</label>
              <input
                type="text"
                value={form.collector_name}
                onChange={e => setForm({ ...form, collector_name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">処分業者</label>
              <input
                type="text"
                value={form.disposal_name}
                onChange={e => setForm({ ...form, disposal_name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-2.5 rounded-xl hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 shadow-lg shadow-amber-500/25 transition-all font-medium"
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

      {/* Manifest List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : manifests.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">マニフェストがありません</p>
          <p className="text-gray-400 text-sm mt-1">「マニフェスト登録」から追加してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {manifests.map(m => {
            const next = nextStatus(m.status);
            const nextLabel = nextStatusLabel(m.status);
            return (
              <div key={m.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-mono font-bold text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg">
                      {m.manifest_number}
                    </div>
                    {wasteTypeBadge(m.waste_type)}
                    <span className="text-sm text-gray-700 font-medium">
                      {m.quantity.toLocaleString()} {m.unit}
                    </span>
                    <span className="text-sm text-gray-400">{formatDate(m.issued_date)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {next && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ manifestId: m.id, status: next })}
                        disabled={updateStatusMutation.isPending}
                        className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium transition-colors disabled:opacity-50"
                      >
                        {nextLabel}へ進める
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <StatusSteps currentStatus={m.status} />
                </div>
                {(m.collector_name || m.disposal_name) && (
                  <div className="mt-3 flex gap-6 text-xs text-gray-500">
                    {m.collector_name && <span>収集: {m.collector_name}</span>}
                    {m.disposal_name && <span>処分: {m.disposal_name}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
