"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, statusLabel, statusColor, formatDate, formatAmount } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  project_code: string | null;
  client_name: string | null;
  contractor_name: string | null;
  site_address: string | null;
  contract_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  phase_count: number | null;
  completed_phases: number | null;
  created_at: string;
}

export default function ProjectsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    project_code: "",
    client_name: "",
    contractor_name: "",
    site_address: "",
    contract_amount: "",
    start_date: "",
    end_date: "",
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<Project[]>("/api/projects", { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/projects", {
        token: token!,
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowForm(false);
      setForm({ name: "", project_code: "", client_name: "", contractor_name: "", site_address: "", contract_amount: "", start_date: "", end_date: "" });
    },
  });

  const filtered = projects.filter(
    (p) =>
      p.name.includes(search) ||
      (p.project_code && p.project_code.includes(search)) ||
      (p.client_name && p.client_name.includes(search))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">案件管理</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> 新規案件
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="案件名、工事番号、発注者で検索..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">新規案件作成</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                name: form.name,
                project_code: form.project_code || null,
                client_name: form.client_name || null,
                contractor_name: form.contractor_name || null,
                site_address: form.site_address || null,
                contract_amount: form.contract_amount ? parseInt(form.contract_amount) : null,
                start_date: form.start_date || null,
                end_date: form.end_date || null,
              });
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">工事名 *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工事番号</label>
              <input value={form.project_code} onChange={(e) => setForm({ ...form, project_code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">発注者</label>
              <input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">施工者</label>
              <input value={form.contractor_name} onChange={(e) => setForm({ ...form, contractor_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">請負金額</label>
              <input type="number" value={form.contract_amount} onChange={(e) => setForm({ ...form, contract_amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">工事場所</label>
              <input value={form.site_address} onChange={(e) => setForm({ ...form, site_address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">着工日</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">竣工日</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {createMutation.isPending ? "作成中..." : "作成"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((project) => {
          const progress = project.phase_count ? Math.round(((project.completed_phases || 0) / project.phase_count) * 100) : 0;
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(project.status)}`}>
                      {statusLabel(project.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    {project.project_code && <span>No. {project.project_code}</span>}
                    {project.client_name && <span>発注: {project.client_name}</span>}
                    {project.contract_amount && <span>{formatAmount(project.contract_amount)}</span>}
                    <span>{formatDate(project.start_date)} ~ {formatDate(project.end_date)}</span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm text-gray-500">{project.completed_phases || 0}/{project.phase_count || 0} 工程</div>
                  <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-1">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
