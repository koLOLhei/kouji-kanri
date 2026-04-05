"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertOctagon, Plus } from "lucide-react";

interface CorrectiveAction {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  found_date: string;
  found_by: string | null;
  corrective_action: string | null;
  verified_by: string | null;
  verified_date: string | null;
}

const SEVERITY_OPTIONS = [
  { value: "minor", label: "軽微", color: "bg-gray-100 text-gray-700" },
  { value: "major", label: "重大", color: "bg-yellow-100 text-yellow-700" },
  { value: "critical", label: "致命的", color: "bg-red-100 text-red-700" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "発見", color: "bg-red-100 text-red-700" },
  { value: "in_progress", label: "対応中", color: "bg-yellow-100 text-yellow-700" },
  { value: "corrected", label: "是正済", color: "bg-blue-100 text-blue-700" },
  { value: "verified", label: "検証済", color: "bg-green-100 text-green-700" },
  { value: "closed", label: "完了", color: "bg-gray-100 text-gray-600" },
];

function severityBadge(severity: string) {
  const opt = SEVERITY_OPTIONS.find(s => s.value === severity);
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${opt?.color || "bg-gray-100 text-gray-700"}`}>
      {opt?.label || severity}
    </span>
  );
}

function ncrStatusBadge(status: string) {
  const opt = STATUS_OPTIONS.find(s => s.value === status);
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${opt?.color || "bg-gray-100 text-gray-700"}`}>
      {opt?.label || status}
    </span>
  );
}

export default function CorrectiveActionsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "minor",
    found_date: new Date().toISOString().split("T")[0],
    found_by: "",
  });

  const { data: actions = [], isLoading } = useQuery<CorrectiveAction[]>({
    queryKey: ["corrective-actions", id],
    queryFn: () => apiFetch(`/api/projects/${id}/corrective-actions`, { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/corrective-actions`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corrective-actions", id] });
      setShowForm(false);
      setForm({ title: "", description: "", severity: "minor", found_date: new Date().toISOString().split("T")[0], found_by: "" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ actionId, status }: { actionId: string; status: string }) =>
      apiFetch(`/api/projects/${id}/corrective-actions/${actionId}`, {
        token: token!,
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["corrective-actions", id] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const nextStatus = (current: string): string | null => {
    const flow = ["open", "in_progress", "corrected", "verified", "closed"];
    const idx = flow.indexOf(current);
    return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertOctagon className="w-6 h-6" /> 是正処置 (NCR)
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> NCR登録
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-lg">NCR登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">タイトル</label>
              <input type="text" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">重要度</label>
              <select value={form.severity}
                onChange={e => setForm({ ...form, severity: e.target.value })}
                className="w-full border rounded px-3 py-2">
                {SEVERITY_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">発見日</label>
              <input type="date" value={form.found_date}
                onChange={e => setForm({ ...form, found_date: e.target.value })}
                className="w-full border rounded px-3 py-2" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">発見者</label>
            <input type="text" value={form.found_by}
              onChange={e => setForm({ ...form, found_by: e.target.value })}
              className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">内容</label>
            <textarea value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded px-3 py-2 h-24" required />
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
      ) : actions.length === 0 ? (
        <p className="text-gray-500">NCR記録がありません</p>
      ) : (
        <div className="space-y-3">
          {actions.map(a => {
            const next = nextStatus(a.status);
            const nextLabel = STATUS_OPTIONS.find(s => s.value === next)?.label;
            return (
              <div key={a.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {severityBadge(a.severity)}
                    <span className="font-semibold">{a.title}</span>
                    <span className="text-sm text-gray-500">{formatDate(a.found_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ncrStatusBadge(a.status)}
                    {next && (
                      <button
                        onClick={() => updateStatus.mutate({ actionId: a.id, status: next })}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                      >
                        → {nextLabel}
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{a.description}</p>
                {a.found_by && (
                  <p className="mt-1 text-xs text-gray-500">発見者: {a.found_by}</p>
                )}
                {a.corrective_action && (
                  <p className="mt-1 text-sm text-blue-700">是正内容: {a.corrective_action}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
