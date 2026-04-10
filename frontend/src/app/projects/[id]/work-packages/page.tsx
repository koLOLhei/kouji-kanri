"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import {
  Plus,
  X,
  Hammer,
  Zap,
  Cog,
  Droplets,
  Mountain,
  MoreHorizontal,
  Building2,
  Truck,
  Shuffle,
  HelpCircle,
  Pencil,
  Check,
  ChevronDown,
  Users,
  DollarSign,
  BarChart3,
} from "lucide-react";

type Allocation = "in_house" | "outsource" | "mixed" | "undecided";
type Category = "建築" | "電気" | "機械" | "衛生" | "土木" | "その他";

interface WorkPackage {
  id: string;
  name: string;
  category: Category;
  allocation: Allocation;
  subcontractor_id: string | null;
  subcontractor_name: string | null;
  budget_amount: number;
  contract_amount: number | null;
  actual_cost: number;
  planned_start: string;
  planned_end: string;
  manager_name: string;
  progress: number;
}

interface Subcontractor {
  id: string;
  name: string;
}

const ALLOCATION_CONFIG: Record<
  Allocation,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  in_house: {
    label: "自社施工",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-400",
    icon: <Building2 className="w-4 h-4" />,
  },
  outsource: {
    label: "外注",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-400",
    icon: <Truck className="w-4 h-4" />,
  },
  mixed: {
    label: "混合",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-400",
    icon: <Shuffle className="w-4 h-4" />,
  },
  undecided: {
    label: "未決定",
    color: "text-gray-700",
    bg: "bg-gray-50",
    border: "border-gray-400",
    icon: <HelpCircle className="w-4 h-4" />,
  },
};

const ALLOCATION_BAR_COLOR: Record<Allocation, string> = {
  in_house: "bg-blue-500",
  outsource: "bg-orange-500",
  mixed: "bg-purple-500",
  undecided: "bg-gray-400",
};

const CATEGORY_CONFIG: Record<Category, { icon: React.ReactNode; color: string }> = {
  建築: { icon: <Hammer className="w-3.5 h-3.5" />, color: "bg-amber-100 text-amber-800" },
  電気: { icon: <Zap className="w-3.5 h-3.5" />, color: "bg-yellow-100 text-yellow-800" },
  機械: { icon: <Cog className="w-3.5 h-3.5" />, color: "bg-slate-100 text-slate-800" },
  衛生: { icon: <Droplets className="w-3.5 h-3.5" />, color: "bg-cyan-100 text-cyan-800" },
  土木: { icon: <Mountain className="w-3.5 h-3.5" />, color: "bg-green-100 text-green-800" },
  その他: { icon: <MoreHorizontal className="w-3.5 h-3.5" />, color: "bg-gray-100 text-gray-800" },
};

const CATEGORIES: Category[] = ["建築", "電気", "機械", "衛生", "土木", "その他"];
const ALLOCATIONS: Allocation[] = ["in_house", "outsource", "mixed", "undecided"];

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export default function WorkPackagesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState(0);
  const [editActualCost, setEditActualCost] = useState(0);

  const [form, setForm] = useState({
    name: "",
    category: "建築" as Category,
    allocation: "undecided" as Allocation,
    subcontractor_id: "",
    budget_amount: "",
    contract_amount: "",
    planned_start: "",
    planned_end: "",
    manager_name: "",
  });

  const { data: workPackages = [], isLoading } = useQuery<WorkPackage[]>({
    queryKey: ["work-packages", projectId],
    queryFn: () =>
      apiFetch(`/api/projects/${projectId}/work-packages`, { token }),
  });

  const { data: subcontractors = [] } = useQuery<Subcontractor[]>({
    queryKey: ["subcontractors"],
    queryFn: () => apiFetch(`/api/subcontractors`, { token }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch(`/api/projects/${projectId}/work-packages`, {
        token,
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-packages", projectId] });
      setShowForm(false);
      setForm({
        name: "",
        category: "建築",
        allocation: "undecided",
        subcontractor_id: "",
        budget_amount: "",
        contract_amount: "",
        planned_start: "",
        planned_end: "",
        manager_name: "",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ wpId, data }: { wpId: string; data: Record<string, unknown> }) =>
      apiFetch(`/api/projects/${projectId}/work-packages/${wpId}`, {
        token,
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-packages", projectId] });
      setEditingId(null);
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      name: form.name,
      category: form.category,
      allocation: form.allocation,
      subcontractor_id: form.subcontractor_id || null,
      budget_amount: Number(form.budget_amount),
      contract_amount: form.contract_amount ? Number(form.contract_amount) : null,
      planned_start: form.planned_start,
      planned_end: form.planned_end,
      manager_name: form.manager_name,
    });
  };

  const handleInlineUpdate = (wpId: string) => {
    updateMutation.mutate({
      wpId,
      data: { progress: editProgress, actual_cost: editActualCost },
    });
  };

  const startEditing = (wp: WorkPackage) => {
    setEditingId(wp.id);
    setEditProgress(wp.progress);
    setEditActualCost(wp.actual_cost);
  };

  const inHouseCount = workPackages.filter((w) => w.allocation === "in_house").length;
  const outsourceCount = workPackages.filter((w) => w.allocation === "outsource").length;
  const totalBudget = workPackages.reduce((sum, w) => sum + w.budget_amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">工種別管理</h1>
            <p className="text-sm text-gray-500 mt-1">内外製振り分け・予算管理</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "閉じる" : "工種追加"}
          </button>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">内製件数</p>
                <p className="text-2xl font-bold text-blue-700">{inHouseCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 rounded-xl">
                <Truck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">外注件数</p>
                <p className="text-2xl font-bold text-orange-700">{outsourceCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">合計予算</p>
                <p className="text-2xl font-bold text-emerald-700">{formatYen(totalBudget)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800">新規工種登録</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工種名</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例: 鉄骨工事"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">区分</label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Allocation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内外製区分</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALLOCATIONS.map((a) => {
                    const cfg = ALLOCATION_CONFIG[a];
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setForm({ ...form, allocation: a })}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                          form.allocation === a
                            ? `${cfg.border} ${cfg.bg} ${cfg.color}`
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subcontractor (only if outsource or mixed) */}
              {(form.allocation === "outsource" || form.allocation === "mixed") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">下請業者</label>
                  <div className="relative">
                    <select
                      value={form.subcontractor_id}
                      onChange={(e) => setForm({ ...form, subcontractor_id: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none"
                    >
                      <option value="">選択してください</option>
                      {subcontractors.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">予算金額</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-medium">¥</span>
                  <input
                    type="number"
                    value={form.budget_amount}
                    onChange={(e) => setForm({ ...form, budget_amount: e.target.value })}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Contract Amount (only if outsource) */}
              {(form.allocation === "outsource" || form.allocation === "mixed") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">契約金額</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-medium">¥</span>
                    <input
                      type="number"
                      value={form.contract_amount}
                      onChange={(e) => setForm({ ...form, contract_amount: e.target.value })}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Planned Start */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">着工予定日</label>
                <input
                  type="date"
                  value={form.planned_start}
                  onChange={(e) => setForm({ ...form, planned_start: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Planned End */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">完了予定日</label>
                <input
                  type="date"
                  value={form.planned_end}
                  onChange={(e) => setForm({ ...form, planned_end: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Manager */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
                <input
                  type="text"
                  value={form.manager_name}
                  onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
                  placeholder="例: 田中太郎"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || !form.name}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? "登録中..." : "登録する"}
              </button>
            </div>
          </div>
        )}

        {/* Work Package List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : workPackages.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">工種が登録されていません</p>
            <p className="text-gray-400 text-sm mt-1">「工種追加」ボタンから登録してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workPackages.map((wp) => {
              const allocCfg = ALLOCATION_CONFIG[wp.allocation];
              const catCfg = CATEGORY_CONFIG[wp.category] || CATEGORY_CONFIG["その他"];
              const profit = wp.budget_amount - wp.actual_cost;
              const profitRate = wp.budget_amount > 0 ? (profit / wp.budget_amount) * 100 : 0;
              const budgetUsage = wp.budget_amount > 0 ? (wp.actual_cost / wp.budget_amount) * 100 : 0;
              const isEditing = editingId === wp.id;

              return (
                <div
                  key={wp.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex"
                >
                  {/* Left Color Bar */}
                  <div className={`w-2 ${ALLOCATION_BAR_COLOR[wp.allocation]} flex-shrink-0`} />

                  <div className="flex-1 p-5 space-y-4">
                    {/* Top Row */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-gray-900">{wp.name}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${catCfg.color}`}
                          >
                            {catCfg.icon}
                            {wp.category}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${allocCfg.bg} ${allocCfg.color}`}
                          >
                            {allocCfg.icon}
                            {allocCfg.label}
                          </span>
                          {wp.subcontractor_name && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                              <Users className="w-3.5 h-3.5" />
                              {wp.subcontractor_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => (isEditing ? setEditingId(null) : startEditing(wp))}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Budget vs Actual */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">予算</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatYen(wp.budget_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">実績原価</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatYen(wp.actual_cost)}
                        </p>
                        <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              budgetUsage > 100 ? "bg-red-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${Math.min(budgetUsage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">利益</p>
                        <p
                          className={`text-sm font-bold ${
                            profit >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {formatYen(profit)}{" "}
                          <span className="text-xs font-medium">({profitRate.toFixed(1)}%)</span>
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-gray-500">進捗</p>
                        <p className="text-xs font-semibold text-gray-700">{wp.progress}%</p>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                          style={{ width: `${wp.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Inline Edit */}
                    {isEditing && (
                      <div className="flex items-end gap-4 pt-2 border-t border-gray-100">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            進捗 (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={editProgress}
                            onChange={(e) => setEditProgress(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            実績原価
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-gray-400 text-sm">¥</span>
                            <input
                              type="number"
                              value={editActualCost}
                              onChange={(e) => setEditActualCost(Number(e.target.value))}
                              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleInlineUpdate(wp.id)}
                          disabled={updateMutation.isPending}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
