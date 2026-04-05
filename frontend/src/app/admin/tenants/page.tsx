"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  Plus, Building2, Users, FolderKanban,
  CheckCircle, XCircle, ArrowLeft,
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  max_projects: number;
  max_users: number;
  user_count: number | null;
  project_count: number | null;
  created_at: string;
}

interface Plan {
  code: string;
  name: string;
  max_projects: number;
  max_users: number;
  price_monthly: number;
  features: string[];
}

export default function TenantsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", plan: "standard",
    admin_email: "", admin_password: "", admin_name: "",
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => apiFetch<Tenant[]>("/api/tenants", { token: token! }),
    enabled: !!token,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => apiFetch<Plan[]>("/api/tenants/plans", { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch("/api/tenants", {
        token: token!,
        method: "POST",
        body: JSON.stringify({
          ...data,
          max_projects: plans.find((p) => p.code === data.plan)?.max_projects || 10,
          max_users: plans.find((p) => p.code === data.plan)?.max_users || 20,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setShowForm(false);
      setForm({ name: "", slug: "", plan: "standard", admin_email: "", admin_password: "", admin_name: "" });
    },
  });

  const planLabel: Record<string, string> = { free: "フリー", standard: "スタンダード", enterprise: "エンタープライズ" };
  const planColor: Record<string, string> = { free: "bg-gray-100 text-gray-700", standard: "bg-blue-100 text-blue-700", enterprise: "bg-purple-100 text-purple-700" };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Link href="/admin" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> 管理ダッシュボード
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-6 h-6" /> テナント管理
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 新規テナント登録
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">新規テナント（会社）登録</h2>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">会社名 *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="株式会社○○建設" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">スラッグ (URL識別子) *</label>
              <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="company-name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">プラン</label>
              <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                {plans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} - ¥{p.price_monthly.toLocaleString()}/月 ({p.max_projects}案件, {p.max_users}ユーザー)
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <p className="text-sm font-medium text-gray-700 mb-3">管理者アカウント</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">管理者名 *</label>
              <input required value={form.admin_name} onChange={(e) => setForm({ ...form, admin_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス *</label>
              <input required type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パスワード *</label>
              <input required type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {createMutation.isPending ? "登録中..." : "テナント登録"}
              </button>
            </div>
            {createMutation.isError && (
              <div className="md:col-span-2 bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {(createMutation.error as Error).message}
              </div>
            )}
          </form>
        </div>
      )}

      <div className="space-y-3">
        {tenants.map((tenant) => (
          <Link
            key={tenant.id}
            href={`/admin/tenants/${tenant.id}`}
            className="block bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {tenant.is_active ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
                  <p className="text-sm text-gray-500">slug: {tenant.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planColor[tenant.plan] || "bg-gray-100"}`}>
                  {planLabel[tenant.plan] || tenant.plan}
                </span>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {tenant.user_count || 0}/{tenant.max_users}</span>
                  <span className="flex items-center gap-1"><FolderKanban className="w-4 h-4" /> {tenant.project_count || 0}/{tenant.max_projects}</span>
                </div>
                <span className="text-xs text-gray-400">{formatDate(tenant.created_at)}</span>
              </div>
            </div>
          </Link>
        ))}
        {tenants.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>テナントがまだありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
