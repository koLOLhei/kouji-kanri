"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { Truck, Plus, Wrench, AlertTriangle } from "lucide-react";

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  model_number: string | null;
  registration_number: string | null;
  owner_company: string | null;
  inspection_expiry: string | null;
  capacity: string | null;
  created_at: string;
}

const EQUIPMENT_TYPES = [
  { value: "crane", label: "クレーン", icon: "crane" },
  { value: "excavator", label: "バックホウ", icon: "excavator" },
  { value: "truck", label: "トラック", icon: "truck" },
  { value: "pump", label: "ポンプ車", icon: "pump" },
  { value: "generator", label: "発電機", icon: "generator" },
];

function typeLabel(type: string): string {
  return EQUIPMENT_TYPES.find(t => t.value === type)?.label || type;
}

function inspectionStatus(expiry: string | null): { label: string; className: string } {
  if (!expiry) return { label: "未設定", className: "text-gray-500 bg-gray-50 border-gray-200" };
  const expiryDate = new Date(expiry);
  const now = new Date();
  const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return { label: "期限切れ", className: "text-red-600 bg-gray-50 border-gray-200" };
  if (daysUntil <= 30) return { label: `残${daysUntil}日`, className: "text-amber-600 bg-gray-50 border-gray-200" };
  return { label: "有効", className: "text-emerald-600 bg-gray-50 border-gray-200" };
}

export default function EquipmentPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    equipment_type: "crane",
    model_number: "",
    registration_number: "",
    owner_company: "",
    inspection_expiry: "",
    capacity: "",
  });

  const { data: equipment = [], isLoading } = useQuery<Equipment[]>({
    queryKey: ["equipment"],
    queryFn: () => apiFetch("/api/equipment", { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/equipment", {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setShowForm(false);
      setForm({
        name: "",
        equipment_type: "crane",
        model_number: "",
        registration_number: "",
        owner_company: "",
        inspection_expiry: "",
        capacity: "",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = { ...form };
    if (!form.inspection_expiry) delete body.inspection_expiry;
    createMutation.mutate(body);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Truck className="w-5 h-5 text-gray-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">車両・重機管理</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-700 active:bg-white active:text-gray-900 active:border active:border-gray-900 transition-colors"
        >
          <Plus className="w-4 h-4" /> 新規登録
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-lg">
          <h2 className="font-bold text-lg text-gray-900">車両・重機登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
                placeholder="25tラフター"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
              <select
                value={form.equipment_type}
                onChange={e => setForm({ ...form, equipment_type: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
              >
                {EQUIPMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">型番</label>
              <input
                type="text"
                value={form.model_number}
                onChange={e => setForm({ ...form, model_number: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
                placeholder="GR-250N-5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">登録番号</label>
              <input
                type="text"
                value={form.registration_number}
                onChange={e => setForm({ ...form, registration_number: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
                placeholder="東京100あ1234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所有会社</label>
              <input
                type="text"
                value={form.owner_company}
                onChange={e => setForm({ ...form, owner_company: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">検査有効期限</label>
              <input
                type="date"
                value={form.inspection_expiry}
                onChange={e => setForm({ ...form, inspection_expiry: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">能力・規格</label>
            <input
              type="text"
              value={form.capacity}
              onChange={e => setForm({ ...form, capacity: e.target.value })}
              className="w-full md:w-1/2 border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors"
              placeholder="吊上荷重 25t"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-xl hover:bg-gray-700 active:bg-white active:text-gray-900 active:border active:border-gray-900 disabled:opacity-50 transition-colors font-medium"
            >
              {createMutation.isPending ? "保存中..." : "保存"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-gray-300 px-6 py-2.5 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              キャンセル
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-red-600 text-sm">{(createMutation.error as Error).message}</p>
          )}
        </form>
      )}

      {/* Equipment List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : equipment.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Truck className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-700 text-lg">車両・重機が登録されていません</p>
          <p className="text-gray-500 text-sm mt-1">「新規登録」から追加してください</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map(eq => {
            const status = inspectionStatus(eq.inspection_expiry);
            const isWarning = eq.inspection_expiry && (status.label === "期限切れ" || status.label.startsWith("残"));
            return (
              <div
                key={eq.id}
                className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${
                  status.label === "期限切れ" ? "border-red-600" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-gray-700" />
                  </div>
                  {isWarning && (
                    <AlertTriangle className={`w-5 h-5 ${status.label === "期限切れ" ? "text-red-600" : "text-amber-600"}`} />
                  )}
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{eq.name}</h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  {typeLabel(eq.equipment_type)}
                </span>

                <div className="mt-4 space-y-2 text-sm">
                  {eq.model_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">型番</span>
                      <span className="text-gray-900 font-medium">{eq.model_number}</span>
                    </div>
                  )}
                  {eq.registration_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">登録番号</span>
                      <span className="text-gray-900 font-medium">{eq.registration_number}</span>
                    </div>
                  )}
                  {eq.capacity && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">能力</span>
                      <span className="text-gray-900 font-medium">{eq.capacity}</span>
                    </div>
                  )}
                  {eq.owner_company && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">所有</span>
                      <span className="text-gray-900 font-medium">{eq.owner_company}</span>
                    </div>
                  )}
                </div>

                {eq.inspection_expiry && (
                  <div className={`mt-4 flex items-center justify-between px-3 py-2 rounded-xl border text-sm font-medium ${status.className}`}>
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-4 h-4" />
                      検査期限
                    </div>
                    <div>
                      {formatDate(eq.inspection_expiry)} ({status.label})
                    </div>
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
