"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  BarChart3,
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

interface Rating {
  total_score: number;
  grade: string;
  categories: {
    name: string;
    score: number;
    max_score: number;
  }[];
  updated_at: string;
}

interface CashFlowEntry {
  id: string;
  month: string;
  income: number;
  expense: number;
  cumulative_income: number;
  cumulative_expense: number;
}

interface CashFlowChart {
  entries: CashFlowEntry[];
  total_income: number;
  total_expense: number;
  balance: number;
}

interface DelayRecord {
  id: string;
  cause: string;
  days: number;
  description: string;
  recorded_date: string;
}

interface DelayAnalysis {
  total_delay_days: number;
  by_cause: {
    cause: string;
    days: number;
    percentage: number;
  }[];
}

const DELAY_CAUSES = ["天候", "資材", "人員", "設計変更", "その他"];
const CAUSE_ICONS: Record<string, typeof CloudRain> = {
  天候: CloudRain,
  資材: Package,
  人員: Users,
  設計変更: FileEdit,
  その他: AlertCircle,
};
const CAUSE_COLORS: Record<string, string> = {
  天候: "bg-blue-500",
  資材: "bg-amber-500",
  人員: "bg-purple-500",
  設計変更: "bg-rose-500",
  その他: "bg-gray-500",
};

function getGrade(score: number): { grade: string; color: string } {
  if (score >= 80) return { grade: "A", color: "text-green-600" };
  if (score >= 70) return { grade: "B", color: "text-blue-600" };
  if (score >= 60) return { grade: "C", color: "text-amber-600" };
  return { grade: "D", color: "text-red-600" };
}

export default function PerformancePage() {
  const { id } = useParams();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [showCashForm, setShowCashForm] = useState(false);
  const [showDelayForm, setShowDelayForm] = useState(false);

  const [ratingForm, setRatingForm] = useState<
    { name: string; score: string; max_score: string }[]
  >([
    { name: "施工管理", score: "", max_score: "20" },
    { name: "工程管理", score: "", max_score: "15" },
    { name: "安全管理", score: "", max_score: "15" },
    { name: "品質管理", score: "", max_score: "20" },
    { name: "出来形", score: "", max_score: "20" },
    { name: "環境対策", score: "", max_score: "10" },
  ]);

  const [cashForm, setCashForm] = useState({
    month: "",
    income: "",
    expense: "",
  });

  const [delayForm, setDelayForm] = useState({
    cause: "天候",
    days: "",
    description: "",
    recorded_date: "",
  });

  const headers = { Authorization: `Bearer ${token}` };

  const { data: rating } = useQuery<Rating>({
    queryKey: ["performance-rating", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/performance/rating`, { headers }),
  });

  const { data: cashFlowChart } = useQuery<CashFlowChart>({
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
          categories: data.map((c) => ({
            name: c.name,
            score: parseInt(c.score),
            max_score: parseInt(c.max_score),
          })),
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
          month: data.month,
          income: parseFloat(data.income),
          expense: parseFloat(data.expense),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["performance-cashflow-chart", id],
      });
      setShowCashForm(false);
      setCashForm({ month: "", income: "", expense: "" });
    },
  });

  const delayMutation = useMutation({
    mutationFn: (data: typeof delayForm) =>
      apiFetch(`/api/projects/${id}/performance/delays`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          days: parseInt(data.days),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-delays", id] });
      queryClient.invalidateQueries({
        queryKey: ["performance-delay-analysis", id],
      });
      setShowDelayForm(false);
      setDelayForm({ cause: "天候", days: "", description: "", recorded_date: "" });
    },
  });

  const totalScore = rating?.total_score ?? 0;
  const gradeInfo = getGrade(totalScore);

  const maxIncome = Math.max(
    ...(cashFlowChart?.entries.map((e) => e.income) ?? [1])
  );
  const maxExpense = Math.max(
    ...(cashFlowChart?.entries.map((e) => e.expense) ?? [1])
  );
  const maxValue = Math.max(maxIncome, maxExpense);

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
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-xl shadow-lg shadow-amber-500/25">
                <Award className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">工事成績評定</h2>
                <p className="text-sm text-gray-500">施工品質の総合評価</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className={`text-4xl font-black ${gradeInfo.color}`}>
                  {totalScore}
                </span>
                <span className="text-lg text-gray-400">点</span>
                <span
                  className={`ml-2 text-2xl font-black ${gradeInfo.color}`}
                >
                  {gradeInfo.grade}評定
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
                {(rating?.categories ?? []).map((cat) => {
                  const pct = (cat.score / cat.max_score) * 100;
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">
                          {cat.name}
                        </span>
                        <span className="text-gray-500">
                          {cat.score} / {cat.max_score}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            pct >= 80
                              ? "bg-gradient-to-r from-green-400 to-emerald-500"
                              : pct >= 60
                              ? "bg-gradient-to-r from-blue-400 to-blue-600"
                              : pct >= 40
                              ? "bg-gradient-to-r from-amber-400 to-orange-500"
                              : "bg-gradient-to-r from-red-400 to-rose-600"
                          }`}
                          style={{ width: `${pct}%` }}
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
                  className="mt-4 bg-white rounded-lg border p-4 space-y-3"
                >
                  {ratingForm.map((cat, idx) => (
                    <div
                      key={cat.name}
                      className="flex items-center gap-3"
                    >
                      <span className="w-24 text-sm font-medium text-gray-700">
                        {cat.name}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={cat.max_score}
                        value={cat.score}
                        onChange={(e) => {
                          const updated = [...ratingForm];
                          updated[idx].score = e.target.value;
                          setRatingForm(updated);
                        }}
                        placeholder={`0-${cat.max_score}`}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      <span className="text-sm text-gray-500">
                        / {cat.max_score}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRatingForm(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
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
              <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-3 rounded-xl shadow-lg shadow-green-500/25">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">キャッシュフロー</h2>
                <p className="text-sm text-gray-500">月次収支と累計推移</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {cashFlowChart && (
                <div className="flex gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-gray-500">収入合計</p>
                    <p className="font-bold text-green-600 flex items-center gap-1">
                      <ArrowUpRight className="w-4 h-4" />
                      {formatAmount(cashFlowChart.total_income)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">支出合計</p>
                    <p className="font-bold text-red-600 flex items-center gap-1">
                      <ArrowDownRight className="w-4 h-4" />
                      {formatAmount(cashFlowChart.total_expense)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">差引</p>
                    <p
                      className={`font-bold ${
                        cashFlowChart.balance >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatAmount(cashFlowChart.balance)}
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
              {cashFlowChart && cashFlowChart.entries.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-end gap-1 h-48">
                    {cashFlowChart.entries.map((entry) => (
                      <div
                        key={entry.month}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div className="w-full flex flex-col items-center justify-end h-40 gap-0.5">
                          <div
                            className="w-3/5 bg-gradient-to-t from-green-500 to-green-400 rounded-t"
                            style={{
                              height: `${(entry.income / maxValue) * 100}%`,
                            }}
                            title={`収入: ${formatAmount(entry.income)}`}
                          />
                          <div
                            className="w-3/5 bg-gradient-to-b from-red-400 to-red-500 rounded-b"
                            style={{
                              height: `${(entry.expense / maxValue) * 100}%`,
                            }}
                            title={`支出: ${formatAmount(entry.expense)}`}
                          />
                        </div>
                        <span className="text-xs text-gray-500 truncate w-full text-center">
                          {entry.month}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 justify-center mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-green-500 rounded" />
                      収入
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-red-500 rounded" />
                      支出
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowCashForm(!showCashForm)}
                className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-800 font-medium"
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
                  className="mt-4 bg-white rounded-lg border p-4 grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      月
                    </label>
                    <input
                      type="month"
                      value={cashForm.month}
                      onChange={(e) =>
                        setCashForm({ ...cashForm, month: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      収入 (円)
                    </label>
                    <input
                      type="number"
                      value={cashForm.income}
                      onChange={(e) =>
                        setCashForm({ ...cashForm, income: e.target.value })
                      }
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      支出 (円)
                    </label>
                    <input
                      type="number"
                      value={cashForm.expense}
                      onChange={(e) =>
                        setCashForm({ ...cashForm, expense: e.target.value })
                      }
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCashForm(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={cashMutation.isPending}
                      className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
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
              <div className="bg-gradient-to-br from-rose-400 to-red-600 p-3 rounded-xl shadow-lg shadow-red-500/25">
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
              {delayAnalysis && delayAnalysis.by_cause.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Pie-like breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">
                      原因別内訳
                    </h4>
                    {delayAnalysis.by_cause.map((item) => {
                      const Icon = CAUSE_ICONS[item.cause] ?? AlertCircle;
                      return (
                        <div key={item.cause} className="flex items-center gap-3">
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
                                {item.cause}
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

                  {/* Visual pie */}
                  <div className="flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {delayAnalysis.by_cause.reduce(
                          (acc, item, idx) => {
                            const circumference = 2 * Math.PI * 40;
                            const strokeDash =
                              (item.percentage / 100) * circumference;
                            const strokeOffset = acc.offset;
                            const colors = [
                              "#3b82f6",
                              "#f59e0b",
                              "#8b5cf6",
                              "#ef4444",
                              "#6b7280",
                            ];
                            acc.elements.push(
                              <circle
                                key={item.cause}
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke={colors[idx % colors.length]}
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
                            {delayAnalysis.total_delay_days}
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
                      const Icon = CAUSE_ICONS[d.cause] ?? AlertCircle;
                      return (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 bg-white p-3 rounded-lg border"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                              CAUSE_COLORS[d.cause] ?? "bg-gray-500"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {d.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(d.recorded_date)}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-red-600">
                            +{d.days}日
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
                  className="mt-4 bg-white rounded-lg border p-4 grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      原因
                    </label>
                    <select
                      value={delayForm.cause}
                      onChange={(e) =>
                        setDelayForm({ ...delayForm, cause: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      {DELAY_CAUSES.map((c) => (
                        <option key={c} value={c}>
                          {c}
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
                      value={delayForm.days}
                      onChange={(e) =>
                        setDelayForm({ ...delayForm, days: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDelayForm(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
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
