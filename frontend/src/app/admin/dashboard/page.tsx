"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard, TrendingUp, TrendingDown, AlertTriangle,
  AlertCircle, CheckCircle2, Loader2, BarChart3, ChevronUp,
  ChevronDown, Building2, Target, DollarSign, Activity,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatAmount, statusLabel, statusColor, cn } from "@/lib/utils";

// ---------- Types ----------

interface Overview {
  total_projects: number;
  status_counts: Record<string, number>;
  total_budget: number;
  total_actual: number;
  budget_utilization_rate: number;
  average_progress: number;
  overdue_project_count: number;
  pending_ncr_count: number;
}

interface ProjectComparison {
  project_id: string;
  project_name: string;
  project_code: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  actual_cost: number;
  cost_rate: number;
  progress: number;
  incident_count: number;
  document_count: number;
  document_approved: number;
  document_completion_rate: number;
}

interface TrendMonth {
  month: string;
  actual_cost: number;
  incident_count: number;
  document_completion_rate: number;
  worker_attendance_count: number;
}

interface RiskItem {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  status: string;
  severity: number;
  likelihood: number;
  risk_score: number;
}

interface RiskMatrix {
  items: RiskItem[];
  matrix: number[][];
}

interface AlertItem {
  id: string;
  severity: string;
  title: string;
  project_name: string;
  project_id: string;
  days_until: number;
  action_link: string;
}

// ---------- Helpers ----------

type SortKey = keyof ProjectComparison;

function ProgressBar({ value, color = "bg-blue-500" }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function SummaryCard({
  label, value, sub, icon: Icon, color = "blue", trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
          {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
        </div>
      )}
    </div>
  );
}

// ---------- Risk Matrix cell color ----------

function riskColor(score: number): string {
  if (score >= 20) return "bg-red-600 text-white";
  if (score >= 12) return "bg-red-400 text-white";
  if (score >= 8) return "bg-amber-400 text-white";
  if (score >= 4) return "bg-yellow-200 text-gray-800";
  return "bg-green-100 text-gray-600";
}

// ---------- CSS Bar chart component ----------

function BarChart({
  data,
  valueKey,
  labelKey,
  label,
  color = "bg-blue-500",
}: {
  data: TrendMonth[];
  valueKey: keyof TrendMonth;
  labelKey: keyof TrendMonth;
  label: string;
  color?: string;
}) {
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const maxVal = Math.max(...values, 1);
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-3">{label}</p>
      <div className="flex items-end gap-1 h-32">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-500">{values[i]}</span>
            <div
              className={`w-full ${color} rounded-t transition-all`}
              style={{ height: `${Math.round((values[i] / maxVal) * 96)}px` }}
              title={`${d[labelKey]}: ${values[i]}`}
            />
            <span className="text-[9px] text-gray-400 -rotate-45 origin-top-left w-10 truncate">
              {String(d[labelKey]).slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Main Page ----------

export default function DashboardPage() {
  const { token } = useAuth();
  const [sortKey, setSortKey] = useState<SortKey>("project_name");
  const [sortAsc, setSortAsc] = useState(true);

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => apiFetch<Overview>("/api/dashboard/overview", { token }),
    enabled: !!token,
  });

  const { data: comparison = [], isLoading: loadingComparison } = useQuery({
    queryKey: ["dashboard-comparison"],
    queryFn: () => apiFetch<ProjectComparison[]>("/api/dashboard/projects-comparison", { token }),
    enabled: !!token,
  });

  const { data: trends = [], isLoading: loadingTrends } = useQuery({
    queryKey: ["dashboard-trends"],
    queryFn: () => apiFetch<TrendMonth[]>("/api/dashboard/trends?months=6", { token }),
    enabled: !!token,
  });

  const { data: riskData, isLoading: loadingRisk } = useQuery({
    queryKey: ["dashboard-risk"],
    queryFn: () => apiFetch<RiskMatrix>("/api/dashboard/risk-matrix", { token }),
    enabled: !!token,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => apiFetch<AlertItem[]>("/api/alerts", { token }),
    enabled: !!token,
  });

  const isLoading = loadingOverview || loadingComparison || loadingTrends || loadingRisk;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Sort comparison table
  const sortedComparison = [...comparison].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800 whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === k ? (
          sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : null}
      </div>
    </th>
  );

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6 print-area">
      {/* Header */}
      <div className="flex items-center gap-3 no-print">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">横断ダッシュボード</h1>
          <p className="text-sm text-gray-500">全案件のリアルタイム状況</p>
        </div>
      </div>

      {/* Summary Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="総案件数"
            value={overview.total_projects}
            sub={`施工中 ${overview.status_counts?.active || 0} 件`}
            icon={Building2}
            color="blue"
          />
          <SummaryCard
            label="総予算"
            value={formatAmount(overview.total_budget)}
            sub={`実績 ${formatAmount(overview.total_actual)}`}
            icon={DollarSign}
            color="green"
          />
          <SummaryCard
            label="平均進捗率"
            value={`${overview.average_progress}%`}
            sub={`遅延案件 ${overview.overdue_project_count} 件`}
            icon={Target}
            color={overview.overdue_project_count > 0 ? "amber" : "green"}
          />
          <SummaryCard
            label="未解決是正指摘"
            value={overview.pending_ncr_count}
            sub="件（全案件合計）"
            icon={AlertTriangle}
            color={overview.pending_ncr_count > 0 ? "red" : "green"}
          />
        </div>
      )}

      {/* Alerts */}
      {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            アラート
          </h2>
          <div className="space-y-2">
            {[...criticalAlerts, ...warningAlerts].slice(0, 10).map((a) => (
              <Link
                key={a.id}
                href={a.action_link || "#"}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border text-sm",
                  a.severity === "critical"
                    ? "bg-red-50 border-red-200"
                    : "bg-amber-50 border-amber-200"
                )}
              >
                {a.severity === "critical" ? (
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <span className="font-medium">{a.title}</span>
                  <span className="text-gray-500 ml-2">{a.project_name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Project Comparison Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            案件比較
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <SortHeader k="project_name" label="案件名" />
                <SortHeader k="status" label="ステータス" />
                <SortHeader k="progress" label="進捗" />
                <SortHeader k="budget" label="予算" />
                <SortHeader k="actual_cost" label="実績" />
                <SortHeader k="cost_rate" label="消化率" />
                <SortHeader k="incident_count" label="安全事故" />
                <SortHeader k="document_completion_rate" label="書類完了率" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedComparison.map((p) => (
                <tr key={p.project_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <Link
                      href={`/projects/${p.project_id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {p.project_name}
                    </Link>
                    {p.project_code && (
                      <span className="ml-1 text-xs text-gray-400">#{p.project_code}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(p.status)}`}>
                      {statusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3 w-32">
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        value={p.progress}
                        color={p.progress >= 80 ? "bg-green-500" : p.progress >= 50 ? "bg-blue-500" : "bg-amber-500"}
                      />
                      <span className="text-xs text-gray-600 w-10 text-right">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-gray-700">{formatAmount(p.budget)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{formatAmount(p.actual_cost)}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={cn(
                      "text-sm font-medium",
                      p.cost_rate > 90 ? "text-red-600" : p.cost_rate > 70 ? "text-amber-600" : "text-green-600"
                    )}>
                      {p.cost_rate}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {p.incident_count > 0 ? (
                      <span className="text-red-600 font-semibold">{p.incident_count}</span>
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                    )}
                  </td>
                  <td className="px-3 py-3 w-28">
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        value={p.document_completion_rate}
                        color="bg-purple-500"
                      />
                      <span className="text-xs text-gray-600 w-10 text-right">
                        {p.document_completion_rate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedComparison.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                    案件データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Trend Charts */}
      {trends.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            月次トレンド（過去6ヶ月）
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <BarChart
              data={trends}
              valueKey="actual_cost"
              labelKey="month"
              label="月次実績コスト（円）"
              color="bg-blue-500"
            />
            <BarChart
              data={trends}
              valueKey="incident_count"
              labelKey="month"
              label="安全インシデント件数"
              color="bg-red-400"
            />
            <BarChart
              data={trends}
              valueKey="document_completion_rate"
              labelKey="month"
              label="書類完了率（%）"
              color="bg-purple-500"
            />
          </div>
        </div>
      )}

      {/* Risk Matrix */}
      {riskData && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            リスクマトリクス
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 5x5 Grid */}
            <div>
              <p className="text-xs text-gray-500 mb-2">縦軸: 発生可能性（高→低）/ 横軸: 重大度（低→高）</p>
              <div className="grid grid-cols-5 gap-1">
                {[4, 3, 2, 1, 0].map((likelihood) => (
                  [0, 1, 2, 3, 4].map((severity) => {
                    const count = riskData.matrix[likelihood]?.[severity] || 0;
                    const score = (likelihood + 1) * (severity + 1);
                    return (
                      <div
                        key={`${likelihood}-${severity}`}
                        className={`h-12 rounded flex items-center justify-center text-sm font-bold ${riskColor(score)}`}
                        title={`重大度${severity + 1} × 発生可能性${likelihood + 1} = ${score}`}
                      >
                        {count > 0 ? count : ""}
                      </div>
                    );
                  })
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-400">
                <span>重大度: 低</span>
                <span>高</span>
              </div>
              <div className="mt-2 flex gap-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block" />低リスク</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" />中リスク</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" />高リスク</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600 inline-block" />最高リスク</span>
              </div>
            </div>

            {/* Top risk items */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">上位リスク項目</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {riskData.items.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2 p-2.5 rounded-lg border text-sm ${riskColor(item.risk_score)}`}
                  >
                    <span className="font-bold text-xs w-5 text-center">{item.risk_score}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-xs opacity-80">{item.project_name}</p>
                    </div>
                  </div>
                ))}
                {riskData.items.length === 0 && (
                  <div className="flex items-center gap-2 p-3 text-green-600 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">リスク項目なし</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
