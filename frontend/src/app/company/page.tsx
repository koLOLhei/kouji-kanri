"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ChevronRight,
  Briefcase,
  Activity,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatAmount } from "@/lib/utils";

interface ProfitProject {
  id: string;
  name: string;
  contract_amount: number;
  budget: number;
  gross_profit: number;
  profit_rate: number;
}

interface MonthlySummary {
  total_contract: number;
  total_actual: number;
  average_progress: number;
  project_count: number;
}

interface StaffProject {
  id: string;
  name: string;
  staff_count: number;
}

interface DelayProject {
  id: string;
  name: string;
  delay_days: number;
  main_cause: string;
}

export default function CompanyPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "profit" | "staff" | "delay" | "summary"
  >("profit");

  const headers = { Authorization: `Bearer ${token}` };

  const { data: profitRanking = [] } = useQuery<ProfitProject[]>({
    queryKey: ["company-profit"],
    queryFn: () => apiFetch("/api/company/profit-ranking", { headers }),
  });

  const { data: monthlySummary } = useQuery<MonthlySummary>({
    queryKey: ["company-monthly"],
    queryFn: () => apiFetch("/api/company/monthly-summary", { headers }),
  });

  const { data: staffOverview = [] } = useQuery<StaffProject[]>({
    queryKey: ["company-staff"],
    queryFn: () => apiFetch("/api/company/staff-overview", { headers }),
  });

  const { data: delayOverview = [] } = useQuery<DelayProject[]>({
    queryKey: ["company-delay"],
    queryFn: () => apiFetch("/api/company/delay-overview", { headers }),
  });

  const maxStaff = Math.max(...staffOverview.map((s) => s.staff_count), 1);

  const tabs = [
    { key: "profit" as const, label: "利益ランキング", icon: TrendingUp },
    { key: "staff" as const, label: "人員配置", icon: Users },
    { key: "delay" as const, label: "遅延状況", icon: Clock },
    { key: "summary" as const, label: "月次サマリー", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-700 p-3 rounded-xl shadow-lg shadow-indigo-500/30">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                全社ダッシュボード
              </h1>
              <p className="text-gray-500 mt-0.5">全プロジェクト横断分析</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {monthlySummary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <Briefcase className="w-7 h-7 opacity-80" />
                <span className="text-3xl font-bold">
                  {monthlySummary.project_count}
                </span>
              </div>
              <p className="mt-2 text-sm opacity-90">進行中プロジェクト</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-700 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <ArrowUpRight className="w-7 h-7 opacity-80" />
                <span className="text-2xl font-bold">
                  {formatAmount(monthlySummary.total_contract)}
                </span>
              </div>
              <p className="mt-2 text-sm opacity-90">受注総額</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-700 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <ArrowDownRight className="w-7 h-7 opacity-80" />
                <span className="text-2xl font-bold">
                  {formatAmount(monthlySummary.total_actual)}
                </span>
              </div>
              <p className="mt-2 text-sm opacity-90">実行予算合計</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-indigo-700 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <Activity className="w-7 h-7 opacity-80" />
                <span className="text-3xl font-bold">
                  {monthlySummary.average_progress}%
                </span>
              </div>
              <p className="mt-2 text-sm opacity-90">平均進捗率</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ===== Profit Ranking ===== */}
        {activeTab === "profit" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                プロジェクト別利益ランキング
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                利益率の低い順（要注意案件が上位）
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">#</th>
                    <th className="px-6 py-3">案件名</th>
                    <th className="px-6 py-3 text-right">受注額</th>
                    <th className="px-6 py-3 text-right">実行予算</th>
                    <th className="px-6 py-3 text-right">粗利</th>
                    <th className="px-6 py-3">利益率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {profitRanking.map((project, idx) => {
                    const isLow = project.profit_rate < 5;
                    const isNegative = project.profit_rate < 0;
                    return (
                      <tr
                        key={project.id}
                        className={`${
                          isNegative
                            ? "bg-red-50"
                            : isLow
                            ? "bg-amber-50"
                            : "hover:bg-gray-50"
                        } transition`}
                      >
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isNegative && (
                              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              {project.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-700">
                          {formatAmount(project.contract_amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-700">
                          {formatAmount(project.budget)}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm text-right font-medium ${
                            project.gross_profit >= 0
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {formatAmount(project.gross_profit)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2.5 max-w-[120px]">
                              <div
                                className={`h-2.5 rounded-full ${
                                  project.profit_rate >= 10
                                    ? "bg-gradient-to-r from-green-400 to-emerald-500"
                                    : project.profit_rate >= 5
                                    ? "bg-gradient-to-r from-blue-400 to-blue-600"
                                    : project.profit_rate >= 0
                                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                                    : "bg-gradient-to-r from-red-400 to-rose-600"
                                }`}
                                style={{
                                  width: `${Math.max(
                                    2,
                                    Math.min(100, Math.abs(project.profit_rate) * 3)
                                  )}%`,
                                }}
                              />
                            </div>
                            <span
                              className={`text-sm font-bold min-w-[48px] text-right ${
                                project.profit_rate >= 10
                                  ? "text-green-600"
                                  : project.profit_rate >= 5
                                  ? "text-blue-600"
                                  : project.profit_rate >= 0
                                  ? "text-amber-600"
                                  : "text-red-600"
                              }`}
                            >
                              {project.profit_rate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {profitRanking.length === 0 && (
              <div className="p-12 text-center text-gray-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>プロジェクトデータがありません</p>
              </div>
            )}
          </div>
        )}

        {/* ===== Staff Overview ===== */}
        {activeTab === "staff" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              プロジェクト別人員配置
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              各現場の配置人数（技術者・作業員合計）
            </p>
            {staffOverview.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>データがありません</p>
              </div>
            ) : (
              <div className="space-y-4">
                {staffOverview.map((project) => (
                  <div key={project.id} className="flex items-center gap-4">
                    <div className="w-40 md:w-56 text-sm font-medium text-gray-800 truncate flex-shrink-0">
                      {project.name}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-end pr-3 transition-all"
                            style={{
                              width: `${(project.staff_count / maxStaff) * 100}%`,
                              minWidth: "40px",
                            }}
                          >
                            <span className="text-xs font-bold text-white">
                              {project.staff_count}人
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== Delay Overview ===== */}
        {activeTab === "delay" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              遅延プロジェクト一覧
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              工期遅延が発生している案件と主因
            </p>
            {delayOverview.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>遅延なし</p>
              </div>
            ) : (
              <div className="space-y-3">
                {delayOverview.map((project) => (
                  <div
                    key={project.id}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      project.delay_days >= 30
                        ? "bg-red-50 border-red-200"
                        : project.delay_days >= 14
                        ? "bg-amber-50 border-amber-200"
                        : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          project.delay_days >= 30
                            ? "bg-red-100 text-red-600"
                            : project.delay_days >= 14
                            ? "bg-amber-100 text-amber-600"
                            : "bg-yellow-100 text-yellow-600"
                        }`}
                      >
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {project.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          主因: {project.main_cause}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg font-black ${
                          project.delay_days >= 30
                            ? "text-red-600"
                            : project.delay_days >= 14
                            ? "text-amber-600"
                            : "text-yellow-600"
                        }`}
                      >
                        +{project.delay_days}日
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== Monthly Summary ===== */}
        {activeTab === "summary" && monthlySummary && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">月次サマリー</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm font-medium">受注総額</span>
                  </div>
                  <p className="text-3xl font-black text-green-800">
                    {formatAmount(monthlySummary.total_contract)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-red-700 mb-2">
                    <TrendingDown className="w-5 h-5" />
                    <span className="text-sm font-medium">実行予算合計</span>
                  </div>
                  <p className="text-3xl font-black text-red-800">
                    {formatAmount(monthlySummary.total_actual)}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <Briefcase className="w-5 h-5" />
                    <span className="text-sm font-medium">進行プロジェクト数</span>
                  </div>
                  <p className="text-3xl font-black text-blue-800">
                    {monthlySummary.project_count}
                    <span className="text-lg text-blue-600 ml-1">件</span>
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-purple-700 mb-2">
                    <Activity className="w-5 h-5" />
                    <span className="text-sm font-medium">平均進捗率</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <p className="text-3xl font-black text-purple-800">
                      {monthlySummary.average_progress}%
                    </p>
                    <div className="flex-1 mb-2">
                      <div className="w-full bg-purple-200 rounded-full h-3">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 transition-all"
                          style={{
                            width: `${monthlySummary.average_progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
