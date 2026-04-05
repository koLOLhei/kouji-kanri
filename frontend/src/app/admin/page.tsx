"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatAmount } from "@/lib/utils";
import Link from "next/link";
import {
  Building2, Users, FolderKanban, TrendingUp,
  ArrowRight, BarChart3,
} from "lucide-react";

interface Stats {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_projects: number;
  plan_breakdown: Record<string, { name: string; count: number; price: number }>;
  monthly_revenue: number;
}

export default function AdminDashboardPage() {
  const { token } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch<Stats>("/api/tenants/stats/overview", { token: token! }),
    enabled: !!token,
  });

  if (!stats) return <div className="p-6">読込中...</div>;

  const cards = [
    { label: "テナント数", value: stats.total_tenants, sub: `アクティブ: ${stats.active_tenants}`, icon: Building2, color: "bg-blue-500" },
    { label: "総ユーザー数", value: stats.total_users, icon: Users, color: "bg-green-500" },
    { label: "総案件数", value: stats.total_projects, icon: FolderKanban, color: "bg-purple-500" },
    { label: "月次推定収益", value: formatAmount(stats.monthly_revenue), icon: TrendingUp, color: "bg-orange-500" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> SaaS管理ダッシュボード
        </h1>
        <Link
          href="/admin/tenants"
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
        >
          テナント管理 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`${c.color} p-2 rounded-lg`}>
                <c.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                <p className="text-xs text-gray-500">{c.label}</p>
                {c.sub && <p className="text-xs text-gray-400">{c.sub}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">プラン別内訳</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(stats.plan_breakdown).map(([code, plan]) => (
          <div key={code} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{plan.name}</h3>
              <span className="text-2xl font-bold text-blue-600">{plan.count}</span>
            </div>
            <p className="text-sm text-gray-500">
              月額: {plan.price === 0 ? "無料" : formatAmount(plan.price)}
            </p>
            <p className="text-sm text-gray-500">
              小計: {formatAmount(plan.count * plan.price)}/月
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
