"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate, formatAmount, statusLabel, statusColor } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileSignature, Plus } from "lucide-react";

interface Contract {
  id: string;
  contract_type: string;
  company_name: string;
  work_scope: string;
  amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

const CONTRACT_TYPES = [
  { value: "primary", label: "一次" },
  { value: "secondary", label: "二次" },
  { value: "tertiary", label: "三次" },
];

function contractTypeBadge(type: string) {
  const colors: Record<string, string> = {
    primary: "bg-blue-100 text-blue-700",
    secondary: "bg-purple-100 text-purple-700",
    tertiary: "bg-orange-100 text-orange-700",
  };
  const labels: Record<string, string> = {
    primary: "一次",
    secondary: "二次",
    tertiary: "三次",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || "bg-gray-100 text-gray-700"}`}>
      {labels[type] || type}
    </span>
  );
}

export default function ContractsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    contract_type: "primary",
    company_name: "",
    work_scope: "",
    amount: "",
    start_date: "",
    end_date: "",
  });

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["contracts", id],
    queryFn: () => apiFetch(`/api/projects/${id}/contracts`, { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/contracts`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", id] });
      setShowForm(false);
      setForm({ contract_type: "primary", company_name: "", work_scope: "", amount: "", start_date: "", end_date: "" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      amount: form.amount ? Number(form.amount) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSignature className="w-6 h-6" /> 契約管理
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 契約登録
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-lg">契約登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">契約種別</label>
              <select value={form.contract_type}
                onChange={e => setForm({ ...form, contract_type: e.target.value })}
                className="w-full border rounded px-3 py-2">
                {CONTRACT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">会社名</label>
              <input type="text" value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })}
                className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">契約金額</label>
              <input type="number" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">工事範囲</label>
            <textarea value={form.work_scope}
              onChange={e => setForm({ ...form, work_scope: e.target.value })}
              className="w-full border rounded px-3 py-2 h-20" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">開始日</label>
              <input type="date" value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">終了日</label>
              <input type="date" value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createMutation.isPending}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {createMutation.isPending ? "保存中..." : "保存"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="border px-6 py-2 rounded-lg hover:bg-gray-50">キャンセル</button>
          </div>
          {createMutation.isError && (
            <p className="text-red-600 text-sm">{(createMutation.error as Error).message}</p>
          )}
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : contracts.length === 0 ? (
        <p className="text-gray-500">契約がありません</p>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => (
            <div key={c.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {contractTypeBadge(c.contract_type)}
                  <span className="font-semibold">{c.company_name}</span>
                  {c.amount != null && (
                    <span className="text-sm font-medium">{formatAmount(c.amount)}</span>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(c.status)}`}>
                  {statusLabel(c.status)}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">{c.work_scope}</p>
              {(c.start_date || c.end_date) && (
                <p className="mt-1 text-xs text-gray-400">
                  期間: {formatDate(c.start_date)} 〜 {formatDate(c.end_date)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
