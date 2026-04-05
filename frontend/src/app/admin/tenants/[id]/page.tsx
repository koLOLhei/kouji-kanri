"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Users, Plus, Shield,
  UserPlus, Pencil, Ban, CheckCircle, XCircle,
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

interface TenantUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
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

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ email: "", password: "", name: "", role: "worker" });
  const [editPlan, setEditPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");

  const { data: tenant } = useQuery({
    queryKey: ["tenant", id],
    queryFn: () => apiFetch<Tenant>(`/api/tenants/${id}`, { token: token! }),
    enabled: !!token,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["tenant-users", id],
    queryFn: () => apiFetch<TenantUser[]>(`/api/tenants/${id}/users`, { token: token! }),
    enabled: !!token,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => apiFetch<Plan[]>("/api/tenants/plans", { token: token! }),
    enabled: !!token,
  });

  const addUserMutation = useMutation({
    mutationFn: (data: typeof userForm) =>
      apiFetch(`/api/tenants/${id}/users`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users", id] });
      queryClient.invalidateQueries({ queryKey: ["tenant", id] });
      setShowUserForm(false);
      setUserForm({ email: "", password: "", name: "", role: "worker" });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: (plan: string) =>
      apiFetch(`/api/tenants/${id}`, {
        token: token!,
        method: "PUT",
        body: JSON.stringify({ plan }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", id] });
      setEditPlan(false);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (is_active: boolean) =>
      apiFetch(`/api/tenants/${id}`, {
        token: token!,
        method: "PUT",
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", id] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/tenants/${id}/users/${userId}`, {
        token: token!,
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users", id] });
      queryClient.invalidateQueries({ queryKey: ["tenant", id] });
    },
  });

  const planLabel: Record<string, string> = { free: "フリー", standard: "スタンダード", enterprise: "エンタープライズ" };
  const roleLabel: Record<string, string> = { admin: "管理者", project_manager: "工事長", worker: "作業員", inspector: "検査員" };

  if (!tenant) return <div className="p-6">読込中...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/admin/tenants" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> テナント一覧
      </Link>

      {/* Tenant Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-sm text-gray-500">slug: {tenant.slug} | 登録日: {formatDate(tenant.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tenant.is_active ? (
              <button
                onClick={() => toggleActiveMutation.mutate(false)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                <Ban className="w-4 h-4" /> 無効化
              </button>
            ) : (
              <button
                onClick={() => toggleActiveMutation.mutate(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-green-300 text-green-600 rounded-lg hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4" /> 有効化
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">ステータス</span>
            <p className="font-medium flex items-center gap-1">
              {tenant.is_active ? (
                <><CheckCircle className="w-4 h-4 text-green-500" /> アクティブ</>
              ) : (
                <><XCircle className="w-4 h-4 text-red-400" /> 無効</>
              )}
            </p>
          </div>
          <div>
            <span className="text-gray-500">プラン</span>
            <div className="flex items-center gap-2">
              <p className="font-medium">{planLabel[tenant.plan] || tenant.plan}</p>
              <button onClick={() => { setSelectedPlan(tenant.plan); setEditPlan(true); }} className="text-blue-600 hover:text-blue-800">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div>
            <span className="text-gray-500">ユーザー</span>
            <p className="font-medium">{tenant.user_count || 0} / {tenant.max_users}</p>
          </div>
          <div>
            <span className="text-gray-500">案件</span>
            <p className="font-medium">{tenant.project_count || 0} / {tenant.max_projects}</p>
          </div>
        </div>

        {editPlan && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">プラン変更</p>
            <div className="flex items-center gap-3">
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                {plans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} - ¥{p.price_monthly.toLocaleString()}/月
                  </option>
                ))}
              </select>
              <button
                onClick={() => updatePlanMutation.mutate(selectedPlan)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                変更
              </button>
              <button onClick={() => setEditPlan(false)} className="text-sm text-gray-500 hover:text-gray-700">
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Users */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" /> ユーザー一覧 ({users.length})
          </h2>
          <button
            onClick={() => setShowUserForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4" /> ユーザー追加
          </button>
        </div>

        {showUserForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <form
              onSubmit={(e) => { e.preventDefault(); addUserMutation.mutate(userForm); }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              <input required placeholder="名前 *" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input required type="email" placeholder="メール *" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input required type="password" placeholder="パスワード *" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="admin">管理者</option>
                <option value="project_manager">工事長</option>
                <option value="worker">作業員</option>
                <option value="inspector">検査員</option>
              </select>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowUserForm(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg">キャンセル</button>
                <button type="submit" disabled={addUserMutation.isPending} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {addUserMutation.isPending ? "追加中..." : "追加"}
                </button>
              </div>
              {addUserMutation.isError && (
                <div className="md:col-span-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                  {(addUserMutation.error as Error).message}
                </div>
              )}
            </form>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${u.is_active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
                  {u.name[0]}
                </div>
                <div>
                  <p className={`text-sm font-medium ${u.is_active ? "text-gray-900" : "text-gray-400 line-through"}`}>{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Shield className="w-3 h-3" /> {roleLabel[u.role] || u.role}
                </span>
                <span className="text-xs text-gray-400">{formatDate(u.created_at)}</span>
                {u.is_active && (
                  <button
                    onClick={() => deactivateUserMutation.mutate(u.id)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    無効化
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
