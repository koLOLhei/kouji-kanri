"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  PiggyBank,
  Building2,
  Truck,
  Plus,
  X,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from "lucide-react";

interface ProfitDashboard {
  contract_amount: number;
  budget_amount: number;
  planned_profit: number;
  planned_profit_rate: number;
  actual_cost: number;
  current_profit: number;
  current_profit_rate: number;
  budget_consumption_rate: number;
  in_house_count: number;
  outsource_count: number;
  work_packages: WorkPackageSummary[];
}

interface WorkPackageSummary {
  id: string;
  name: string;
  allocation: "in_house" | "outsource" | "mixed" | "undecided";
  category: string;
  budget_amount: number;
  actual_cost: number;
  profit: number;
  profit_rate: number;
  progress: number;
}

interface MonthlyProgress {
  id: string;
  year_month: string;
  progress_amount: number;
  payment_amount: number;
  cumulative_progress: number;
}

interface MonthlySummary {
  records: MonthlyProgress[];
  total_progress: number;
  total_payment: number;
}

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function formatYenCompact(amount: number): string {
  if (amount >= 100_000_000) return `¥${(amount / 100_000_000).toFixed(1)}億`;
  if (amount >= 10_000) return `¥${(amount / 10_000).toFixed(0)}万`;
  return `¥${amount.toLocaleString("ja-JP")}`;
}

const ALLOCATION_LABEL: Record<string, string> = {
  in_house: "自社",
  outsource: "外注",
  mixed: "混合",
  undecided: "未決定",
};

export default function ProfitDashboardPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressForm, setProgressForm] = useState({
    year_month: "",
    progress_amount: "",
    payment_amount: "",
  });

  const { data: dashboard, isLoading } = useQuery<ProfitDashboard>({
    queryKey: ["profit-dashboard", projectId],
    queryFn: () =>
      apiFetch(`/api/projects/${projectId}/profit-dashboard`, { token }),
  });

  const { data: monthlySummary } = useQuery<MonthlySummary>({
    queryKey: ["monthly-progress", projectId],
    queryFn: () =>
      apiFetch(`/api/projects/${projectId}/monthly-progress/summary`, { token }),
  });

  const createProgressMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch(`/api/projects/${projectId}/monthly-progress`, {
        token,
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-progress", projectId] });
      queryClient.invalidateQueries({ queryKey: ["profit-dashboard", projectId] });
      setShowProgressForm(false);
      setProgressForm({ year_month: "", progress_amount: "", payment_amount: "" });
    },
  });

  const handleCreateProgress = () => {
    createProgressMutation.mutate({
      year_month: progressForm.year_month,
      progress_amount: Number(progressForm.progress_amount),
      payment_amount: Number(progressForm.payment_amount),
    });
  };

  if (isLoading || !dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const totalAllocation = dashboard.in_house_count + dashboard.outsource_count;
  const inHousePercent = totalAllocation > 0 ? (dashboard.in_house_count / totalAllocation) * 100 : 50;

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">粗利ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">プロジェクト収支の全体像</p>
        </div>

        {/* Top 3 Big Numbers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Contract Amount */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-blue-100">受注額</span>
            </div>
            <p className="text-3xl font-bold">{formatYenCompact(dashboard.contract_amount)}</p>
            <p className="text-xs text-blue-200 mt-1">{formatYen(dashboard.contract_amount)}</p>
          </div>

          {/* Budget */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-orange-100">実行予算</span>
            </div>
            <p className="text-3xl font-bold">{formatYenCompact(dashboard.budget_amount)}</p>
            <p className="text-xs text-orange-200 mt-1">{formatYen(dashboard.budget_amount)}</p>
          </div>

          {/* Planned Profit */}
          <div
            className={`bg-gradient-to-br ${
              dashboard.planned_profit >= 0
                ? "from-emerald-500 to-emerald-600"
                : "from-red-500 to-red-600"
            } rounded-2xl p-6 text-white shadow-lg`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                {dashboard.planned_profit >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  dashboard.planned_profit >= 0 ? "text-emerald-100" : "text-red-100"
                }`}
              >
                予定粗利
              </span>
            </div>
            <p className="text-3xl font-bold">{formatYenCompact(dashboard.planned_profit)}</p>
            <p
              className={`text-xs mt-1 ${
                dashboard.planned_profit >= 0 ? "text-emerald-200" : "text-red-200"
              }`}
            >
              {dashboard.planned_profit_rate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Second Row: Actual Cost + Current Profit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Actual Cost */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-50 rounded-xl">
                  <PiggyBank className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">実績原価</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatYen(dashboard.actual_cost)}
                  </p>
                </div>
              </div>
              <span
                className={`text-sm font-semibold px-3 py-1 rounded-lg ${
                  dashboard.budget_consumption_rate > 90
                    ? "bg-red-50 text-red-700"
                    : dashboard.budget_consumption_rate > 70
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-green-50 text-green-700"
                }`}
              >
                {dashboard.budget_consumption_rate.toFixed(1)}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>予算消化率</span>
                <span>
                  {formatYen(dashboard.actual_cost)} / {formatYen(dashboard.budget_amount)}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    dashboard.budget_consumption_rate > 90
                      ? "bg-gradient-to-r from-red-400 to-red-500"
                      : dashboard.budget_consumption_rate > 70
                        ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
                        : "bg-gradient-to-r from-green-400 to-green-500"
                  }`}
                  style={{
                    width: `${Math.min(dashboard.budget_consumption_rate, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Current Profit */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2.5 rounded-xl ${
                  dashboard.current_profit >= 0 ? "bg-emerald-50" : "bg-red-50"
                }`}
              >
                {dashboard.current_profit >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">現時点粗利</p>
                <p
                  className={`text-xl font-bold ${
                    dashboard.current_profit >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatYen(dashboard.current_profit)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">利益率:</span>
              <span
                className={`text-lg font-bold ${
                  dashboard.current_profit_rate >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {dashboard.current_profit_rate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* In-house vs Outsource Ratio */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">内外製比率</h2>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">自社施工</span>
                  <span className="text-sm font-bold text-blue-700">
                    {dashboard.in_house_count}件
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-orange-700">
                    {dashboard.outsource_count}件
                  </span>
                  <span className="text-sm font-medium text-gray-700">外注</span>
                  <Truck className="w-4 h-4 text-orange-600" />
                </div>
              </div>
              <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-blue-400 to-blue-500 h-full transition-all flex items-center justify-center"
                  style={{ width: `${inHousePercent}%` }}
                >
                  {inHousePercent > 15 && (
                    <span className="text-xs font-bold text-white">
                      {inHousePercent.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div
                  className="bg-gradient-to-r from-orange-400 to-orange-500 h-full transition-all flex items-center justify-center"
                  style={{ width: `${100 - inHousePercent}%` }}
                >
                  {100 - inHousePercent > 15 && (
                    <span className="text-xs font-bold text-white">
                      {(100 - inHousePercent).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Work Package Profit Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">工種別収支一覧</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    工種名
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    区分
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    予算
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    実績
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    利益
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    利益率
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    進捗
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dashboard.work_packages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      工種データがありません
                    </td>
                  </tr>
                ) : (
                  dashboard.work_packages.map((wp) => (
                    <tr key={wp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{wp.name}</p>
                        <p className="text-xs text-gray-400">{wp.category}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                            wp.allocation === "in_house"
                              ? "bg-blue-50 text-blue-700"
                              : wp.allocation === "outsource"
                                ? "bg-orange-50 text-orange-700"
                                : wp.allocation === "mixed"
                                  ? "bg-purple-50 text-purple-700"
                                  : "bg-gray-50 text-gray-700"
                          }`}
                        >
                          {ALLOCATION_LABEL[wp.allocation] || wp.allocation}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-700 font-medium">
                        {formatYen(wp.budget_amount)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-700 font-medium">
                        {formatYen(wp.actual_cost)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`text-sm font-bold ${
                            wp.profit >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {formatYen(wp.profit)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`text-sm font-semibold ${
                            wp.profit_rate >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {wp.profit_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 w-24 bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                              style={{ width: `${wp.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-500 w-10 text-right">
                            {wp.progress}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">月次出来高推移</h2>
            <button
              onClick={() => setShowProgressForm(!showProgressForm)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {showProgressForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showProgressForm ? "閉じる" : "出来高登録"}
            </button>
          </div>

          {/* Create Progress Form */}
          {showProgressForm && (
            <div className="p-6 bg-gray-50 border-b border-gray-100 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">対象月</label>
                  <input
                    type="month"
                    value={progressForm.year_month}
                    onChange={(e) =>
                      setProgressForm({ ...progressForm, year_month: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">出来高金額</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-medium">¥</span>
                    <input
                      type="number"
                      value={progressForm.progress_amount}
                      onChange={(e) =>
                        setProgressForm({ ...progressForm, progress_amount: e.target.value })
                      }
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">入金額</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-medium">¥</span>
                    <input
                      type="number"
                      value={progressForm.payment_amount}
                      onChange={(e) =>
                        setProgressForm({ ...progressForm, payment_amount: e.target.value })
                      }
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleCreateProgress}
                  disabled={createProgressMutation.isPending || !progressForm.year_month}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createProgressMutation.isPending ? "登録中..." : "登録する"}
                </button>
              </div>
            </div>
          )}

          {/* Monthly Records */}
          <div className="divide-y divide-gray-100">
            {!monthlySummary || monthlySummary.records.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                月次出来高データがありません
              </div>
            ) : (
              <>
                {monthlySummary.records.map((record) => (
                  <div
                    key={record.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-50 rounded-xl">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{record.year_month}</p>
                        <p className="text-xs text-gray-400">
                          累計: {formatYen(record.cumulative_progress)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">出来高</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatYen(record.progress_amount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">入金</p>
                        <p className="text-sm font-semibold text-emerald-600">
                          {formatYen(record.payment_amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Totals */}
                <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">合計</span>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatYen(monthlySummary.total_progress)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">
                        {formatYen(monthlySummary.total_payment)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
