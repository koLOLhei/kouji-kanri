"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Clock,
  Plus,
  CloudRain,
  Package,
  Users,
  FileEdit,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatAmount, formatDate } from "@/lib/utils";

// ===== Backend response types (合わせる) =====

interface Rating {
  id?: string;
  evaluation_date?: string;
  construction_system_score: number;
  construction_system_notes?: string | null;
  schedule_management: number;
  safety_management: number;
  worker_management: number;
  quality_score: number;
  as_built_accuracy: number;
  technical_proposal: number;
  social_contribution: number;
  total_score: number;
  grade: string | null;
  notes?: string | null;
  created_at?: string;
}

// /cash-flow/chart は配列を返す
interface CashFlowChartEntry {
  year_month: string;
  income: number;
  expense: number;
  net: number;
  cumulative: number;
}

interface DelayRecord {
  id: string;
  delay_days: number;
  delay_cause: string;
  description: string | null;
  recorded_date: string;
  impact_on_completion?: boolean;
  mitigation?: string | null;
  phase_id?: string | null;
}

// /delays/analysis の by_cause は dict
interface DelayAnalysis {
  total_delay_days: number;
  by_cause: Record<string, number>;
  percentage_by_cause: Record<string, number>;
}

// ===== UI 用カテゴリ定義 (rating 詳細表示用) =====

const RATING_CATEGORIES: {
  key: keyof Rating;
  name: string;
  max: number;
}[] = [
  { key: "construction_system_score", name: "施工体制", max: 20 },
  { key: "schedule_management", name: "工程管理", max: 10 },
  { key: "safety_management", name: "安全管理", max: 10 },
  { key: "worker_management", name: "対外関係", max: 5 },
  { key: "quality_score", name: "出来形品質", max: 30 },
  { key: "as_built_accuracy", name: "出来形精度", max: 10 },
  { key: "technical_proposal", name: "技術提案", max: 5 },
  { key: "social_contribution", name: "地域貢献", max: 5 },
];

const DELAY_CAUSES = ["weather", "material", "labor", "design_change", "other"];
const CAUSE_LABEL: Record<string, string> = {
  weather: "天候",
  material: "資材",
  labor: "人員",
  design_change: "設計変更",
  subcontractor: "下請",
  client: "発注者",
  other: "その他",
};
const CAUSE_ICONS: Record<string, typeof CloudRain> = {
  weather: CloudRain,
  material: Package,
  labor: Users,
  design_change: FileEdit,
  subcontractor: Users,
  client: Users,
  other: AlertCircle,
};
const CAUSE_COLORS: Record<string, string> = {
  weather: "bg-blue-600",
  material: "bg-amber-600",
  labor: "bg-gray-700",
  design_change: "bg-emerald-600",
  subcontractor: "bg-gray-700",
  client: "bg-gray-700",
  other: "bg-gray-500",
};
const CAUSE_HEX: Record<string, string> = {
  weather: "#2563eb", // blue-600
  material: "#d97706", // amber-600
  labor: "#374151", // gray-700
  design_change: "#059669", // emerald-600
  subcontractor: "#374151",
  client: "#374151",
  other: "#9ca3af", // gray-400
};

function getGradeColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 70) return "text-blue-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function getGradeLabel(score: number): string {
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PerformancePage() {
  const { id } = useParams();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [showCashForm, setShowCashForm] = useState(false);
  const [showDelayForm, setShowDelayForm] = useState(false);

  const [ratingForm, setRatingForm] = useState({
    evaluation_date: todayISO(),
    construction_system_score: "16",
    schedule_management: "6",
    safety_management: "6",
    worker_management: "3",
    quality_score: "20",
    as_built_accuracy: "5",
    technical_proposal: "0",
    social_contribution: "0",
    notes: "",
  });

  const [cashForm, setCashForm] = useState({
    year_month: "",
    progress_payment_received: "",
    other_income: "",
    material_payment: "",
    subcontractor_payment: "",
    labor_cost: "",
    equipment_cost: "",
    overhead: "",
    other_expense: "",
  });

  const [delayForm, setDelayForm] = useState({
    delay_cause: "weather",
    delay_days: "",
    description: "",
    recorded_date: todayISO(),
  });

  const headers = { Authorization: `Bearer ${token}` };

  // Rating: 未作成だと 404 になるので空ハンドリング
  const { data: rating } = useQuery<Rating | null>({
    queryKey: ["performance-rating", id],
    queryFn: async () => {
      try {
        return await apiFetch(`/api/projects/${id}/performance/rating`, {
          headers,
        });
      } catch {
        return null;
      }
    },
  });

  const { data: cashFlowEntries = [] } = useQuery<CashFlowChartEntry[]>({
    queryKey: ["performance-cashflow-chart", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/performance/cash-flow/chart`, { headers }),
  });

  const { data: delays = [] } = useQuery<DelayRecord[]>({
    queryKey: ["performance-delays", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/performance/delays`, { headers }),
  });

  const { data: delayAnalysis } = useQuery<DelayAnalysis>({
    queryKey: ["performance-delay-analysis", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/performance/delays/analysis`, { headers }),
  });

  const ratingMutation = useMutation({
    mutationFn: (data: typeof ratingForm) =>
      apiFetch(`/api/projects/${id}/performance/rating`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluation_date: data.evaluation_date,
          construction_system_score: parseInt(data.construction_system_score || "0"),
          schedule_management: parseInt(data.schedule_management || "0"),
          safety_management: parseInt(data.safety_management || "0"),
          worker_management: parseInt(data.worker_management || "0"),
          quality_score: parseInt(data.quality_score || "0"),
          as_built_accuracy: parseInt(data.as_built_accuracy || "0"),
          technical_proposal: parseInt(data.technical_proposal || "0"),
          social_contribution: parseInt(data.social_contribution || "0"),
          notes: data.notes || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-rating", id] });
      setShowRatingForm(false);
    },
  });

  const cashMutation = useMutation({
    mutationFn: (data: typeof cashForm) =>
      apiFetch(`/api/projects/${id}/performance/cash-flow`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          year_month: data.year_month,
          progress_payment_received: parseInt(data.progress_payment_received || "0"),
          other_income: parseInt(data.other_income || "0"),
          material_payment: parseInt(data.material_payment || "0"),
          subcontractor_payment: parseInt(data.subcontractor_payment || "0"),
          labor_cost: parseInt(data.labor_cost || "0"),
          equipment_cost: parseInt(data.equipment_cost || "0"),
          overhead: parseInt(data.overhead || "0"),
          other_expense: parseInt(data.other_expense || "0"),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["performance-cashflow-chart", id],
      });
      setShowCashForm(false);
      setCashForm({
        year_month: "",
        progress_payment_received: "",
        other_income: "",
        material_payment: "",
        subcontractor_payment: "",
        labor_cost: "",
        equipment_cost: "",
        overhead: "",
        other_expense: "",
      });
    },
  });

  const delayMutation = useMutation({
    mutationFn: (data: typeof delayForm) =>
      apiFetch(`/api/projects/${id}/performance/delays`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          delay_cause: data.delay_cause,
          delay_days: parseInt(data.delay_days || "0"),
          description: data.description || null,
          recorded_date: data.recorded_date,
          impact_on_completion: false,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-delays", id] });
      queryClient.invalidateQueries({
        queryKey: ["performance-delay-analysis", id],
      });
      setShowDelayForm(false);
      setDelayForm({
        delay_cause: "weather",
        delay_days: "",
        description: "",
        recorded_date: todayISO(),
      });
    },
  });

  const totalScore = rating?.total_score ?? 0;
  const gradeColor = getGradeColor(totalScore);
  const gradeLabel = rating?.grade ?? getGradeLabel(totalScore);

  // ----- Cash flow 集計 (配列レスポンスから計算) -----
  const totalIncome = cashFlowEntries.reduce((s, e) => s + (e.income || 0), 0);
  const totalExpense = cashFlowEntries.reduce((s, e) => s + (e.expense || 0), 0);
  const balance = totalIncome - totalExpense;

  const maxValue = Math.max(
    1,
    ...cashFlowEntries.map((e) => Math.max(e.income, e.expense))
  );

  // ----- Delay analysis を配列形式に正規化 -----
  const byCauseArr: { cause: string; days: number; percentage: number }[] =
    delayAnalysis
      ? Object.entries(delayAnalysis.by_cause || {}).map(([cause, days]) => ({
          cause,
          days,
          percentage: delayAnalysis.percentage_by_cause?.[cause] ?? 0,
        }))
      : [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            工事成績評定・収支・遅延分析
          </h1>
          <p className="text-gray-500 mt-1">経営判断に必要な全指標</p>
        </div>

        {/* ===== Score Section ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div
            className="p-6 cursor-pointer flex items-center justify-between"
            onClick={() =>
              setActiveSection(activeSection === "score" ? null : "score")
            }
          >
            <div className="flex items-center gap-4">
              <div className="bg-amber-600 p-3 rounded-xl">
                <Award className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">工事成績評定</h2>
                <p className="text-sm text-gray-500">施工品質の総合評価</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className={`text-4xl font-black ${gradeColor}`}>
                  {totalScore}
                </span>
                <span className="text-lg text-gray-400">点</span>
                <span className={`ml-2 text-2xl font-black ${gradeColor}`}>
                  {gradeLabel}評定
                </span>
              </div>
              {activeSection === "score" ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          {activeSection === "score" && (
            <div className="border-t border-gray-100 p-6 bg-gray-50">
              {/* Category Breakdown */}
              <div className="space-y-3 mb-6">
                {RATING_CATEGORIES.map((cat) => {
                  const score = rating
                    ? (rating[cat.key] as number | undefined) ?? 0
                    : 0;
                  const pct = cat.max > 0 ? (score / cat.max) * 100 : 0;
                  let barColor = "bg-red-600";
                  if (pct >= 80) barColor = "bg-emerald-600";
                  else if (pct >= 60) barColor = "bg-blue-600";
                  else if (pct >= 40) barColor = "bg-amber-600";
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">
                          {cat.name}
                        </span>
                        <span className="text-gray-500">
                          {score} / {cat.max}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${barColor}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setShowRatingForm(!showRatingForm)}
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus className="w-4 h-4" />
                評定を更新
              </button>

              {showRatingForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    ratingMutation.mutate(ratingForm);
                  }}
                  className="mt-4 bg-white rounded-lg border border-gray-200 p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-32 text-sm font-medium text-gray-700">
                      評定日
                    </span>
                    <input
                      type="date"
                      value={ratingForm.evaluation_date}
                      onChange={(e) =>
                        setRatingForm({
                          ...ratingForm,
                          evaluation_date: e.target.value,
                        })
                      }
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      required
                    />
                  </div>
                  {RATING_CATEGORIES.map((cat) => (
                    <div key={cat.key} className="flex items-center gap-3">
                      <span className="w-32 text-sm font-medium text-gray-700">
                        {cat.name}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={cat.max}
                        value={
                          (ratingForm[
                            cat.key as keyof typeof ratingForm
                          ] as string) ?? ""
                        }
                        onChange={(e) =>
                          setRatingForm({
                            ...ratingForm,
                            [cat.key]: e.target.value,
                          })
                        }
                        placeholder={`0-${cat.max}`}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                        required
                      />
                      <span className="text-sm text-gray-500">/ {cat.max}</span>
                    </div>
                  ))}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRatingForm(false)}
                      className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={ratingMutation.isPending}
                      className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {ratingMutation.isPending ? "保存中..." : "保存"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ===== Cash Flow Section ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div
            className="p-6 cursor-pointer flex items-center justify-between"
            onClick={() =>
              setActiveSection(activeSection === "cash" ? null : "cash")
            }
          >
            <div className="flex items-center gap-4">
              <div className="bg-emerald-600 p-3 rounded-xl">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  キャッシュフロー
                </h2>
                <p className="text-sm text-gray-500">月次収支と累計推移</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {cashFlowEntries.length > 0 && (
                <div className="flex gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-gray-500">収入合計</p>
                    <p className="font-bold text-emerald-600 flex items-center gap-1">
                      <ArrowUpRight className="w-4 h-4" />
                      {formatAmount(totalIncome)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">支出合計</p>
                    <p className="font-bold text-red-600 flex items-center gap-1">
                      <ArrowDownRight className="w-4 h-4" />
                      {formatAmount(totalExpense)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">差引</p>
                    <p
                      className={`font-bold ${
                        balance >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatAmount(balance)}
                    </p>
                  </div>
                </div>
              )}
              {activeSection === "cash" ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          {activeSection === "cash" && (
            <div className="border-t border-gray-100 p-6 bg-gray-50">
              {/* Bar Chart */}
              {cashFlowEntries.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-end gap-1 h-48">
                    {cashFlowEntries.map((entry) => (
                      <div
                        key={entry.year_month}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div className="w-full flex flex-col items-center justify-end h-40 gap-0.5">
                          <div
                            className="w-3/5 bg-emerald-600 rounded-t"
                            style={{
                              height: `${(entry.income / maxValue) * 100}%`,
                            }}
                            title={`収入: ${formatAmount(entry.income)}`}
                          />
                          <div
                            className="w-3/5 bg-red-600 rounded-b"
                            style={{
                              height: `${(entry.expense / maxValue) * 100}%`,
                            }}
                            title={`支出: ${formatAmount(entry.expense)}`}
                          />
                        </div>
                        <span className="text-xs text-gray-500 truncate w-full text-center">
                          {entry.year_month}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 justify-center mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-emerald-600 rounded" />
                      収入
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-red-600 rounded" />
                      支出
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowCashForm(!showCashForm)}
                className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-800 font-medium"
              >
                <Plus className="w-4 h-4" />
                収支を追加
              </button>

              {showCashForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    cashMutation.mutate(cashForm);
                  }}
                  className="mt-4 bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      対象月
                    </label>
                    <input
                      type="month"
                      value={cashForm.year_month}
                      onChange={(e) =>
                        setCashForm({ ...cashForm, year_month: e.target.value })
                      }
                      className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      出来高入金 (円)
                    </label>
                    <input
                      type="number"
                      value={cashForm.progress_payment_received}
                      onChange={(e) =>
                        setCashForm({
                          ...cashForm,
                          progress_payment_received: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      その他収入 (円)
                    </label>
                    <input
                      type="number"
                      value={cashForm.other_income}
                      onChange={(e) =>
                        setCashForm({
                          ...cashForm,
                          other_income: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      材料支払 (円)
                    </label>
                    <input
                      type="number"
                      value={cashForm.material_payment}
                      onChange={(e) =>
                        setCashForm({
                          ...cashForm,
                          material_payment: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      下請支払 (円)
                    </label>
                    <input
                      type="number"
                      value={cashForm.subcontractor_payment}
                      onChange={(e) =>
                        setCashForm({
                          ...cashForm,
                          subcontractor_payment: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      労務費 (円)
                    </label>
                    <input
                      type="number"
                      value={cashForm.labor_cost}
                      onChange={(e) =>
                        setCashForm({
                          ...cashForm,
                          labor_cost: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      機械経費 (円)
                    </label>
                    <input
                      type="number"
                      value={cashForm.equipment_cost}
                      onChange={(e) =>
                        setCashForm({
                          ...cashForm,
                          equipment_cost: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      共通仮設・現場経費 (円)
                    </label>
                    <input
                      type="number"
                      value={cashForm.overhead}
                      onChange={(e) =>
                        setCashForm({ ...cashForm, overhead: e.target.value })
                      }
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      その他支出 (円)
                    </label>
                    <input
                      type="number"
                      value={cashForm.other_expense}
                      onChange={(e) =>
                        setCashForm({
                          ...cashForm,
                          other_expense: e.target.value,
                        })
                      }
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCashForm(false)}
                      className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={cashMutation.isPending}
                      className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {cashMutation.isPending ? "保存中..." : "保存"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ===== Delay Section ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div
            className="p-6 cursor-pointer flex items-center justify-between"
            onClick={() =>
              setActiveSection(activeSection === "delay" ? null : "delay")
            }
          >
            <div className="flex items-center gap-4">
              <div className="bg-red-600 p-3 rounded-xl">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">遅延分析</h2>
                <p className="text-sm text-gray-500">原因別の遅延日数と傾向</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {delayAnalysis && (
                <div className="text-right">
                  <span className="text-3xl font-black text-red-600">
                    {delayAnalysis.total_delay_days}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">日遅延</span>
                </div>
              )}
              {activeSection === "delay" ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          {activeSection === "delay" && (
            <div className="border-t border-gray-100 p-6 bg-gray-50">
              {/* Cause Breakdown */}
              {byCauseArr.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Bars breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">
                      原因別内訳
                    </h4>
                    {byCauseArr.map((item) => {
                      const Icon = CAUSE_ICONS[item.cause] ?? AlertCircle;
                      return (
                        <div
                          key={item.cause}
                          className="flex items-center gap-3"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                              CAUSE_COLORS[item.cause] ?? "bg-gray-500"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700">
                                {CAUSE_LABEL[item.cause] ?? item.cause}
                              </span>
                              <span className="text-gray-500">
                                {item.days}日 ({item.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  CAUSE_COLORS[item.cause] ?? "bg-gray-500"
                                }`}
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Donut chart */}
                  <div className="flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      <svg
                        viewBox="0 0 100 100"
                        className="w-full h-full -rotate-90"
                      >
                        {byCauseArr.reduce(
                          (acc, item) => {
                            const circumference = 2 * Math.PI * 40;
                            const strokeDash =
                              (item.percentage / 100) * circumference;
                            const strokeOffset = acc.offset;
                            const color =
                              CAUSE_HEX[item.cause] ?? "#9ca3af";
                            acc.elements.push(
                              <circle
                                key={item.cause}
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke={color}
                                strokeWidth="20"
                                strokeDasharray={`${strokeDash} ${circumference}`}
                                strokeDashoffset={-strokeOffset}
                              />
                            );
                            acc.offset += strokeDash;
                            return acc;
                          },
                          { elements: [] as React.ReactElement[], offset: 0 }
                        ).elements}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-2xl font-black text-gray-900">
                            {delayAnalysis?.total_delay_days ?? 0}
                          </p>
                          <p className="text-xs text-gray-500">日</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Delays */}
              {delays.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    遅延記録
                  </h4>
                  <div className="space-y-2">
                    {delays.slice(0, 5).map((d) => {
                      const Icon = CAUSE_ICONS[d.delay_cause] ?? AlertCircle;
                      return (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                              CAUSE_COLORS[d.delay_cause] ?? "bg-gray-500"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {d.description ||
                                CAUSE_LABEL[d.delay_cause] ||
                                d.delay_cause}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(d.recorded_date)}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-red-600">
                            +{d.delay_days}日
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowDelayForm(!showDelayForm)}
                className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                <Plus className="w-4 h-4" />
                遅延を記録
              </button>

              {showDelayForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    delayMutation.mutate(delayForm);
                  }}
                  className="mt-4 bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      原因
                    </label>
                    <select
                      value={delayForm.delay_cause}
                      onChange={(e) =>
                        setDelayForm({
                          ...delayForm,
                          delay_cause: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    >
                      {DELAY_CAUSES.map((c) => (
                        <option key={c} value={c}>
                          {CAUSE_LABEL[c] ?? c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      遅延日数
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={delayForm.delay_days}
                      onChange={(e) =>
                        setDelayForm({
                          ...delayForm,
                          delay_days: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      日付
                    </label>
                    <input
                      type="date"
                      value={delayForm.recorded_date}
                      onChange={(e) =>
                        setDelayForm({
                          ...delayForm,
                          recorded_date: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      詳細
                    </label>
                    <input
                      type="text"
                      value={delayForm.description}
                      onChange={(e) =>
                        setDelayForm({
                          ...delayForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="遅延の詳細を記入"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDelayForm(false)}
                      className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={delayMutation.isPending}
                      className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {delayMutation.isPending ? "保存中..." : "保存"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
