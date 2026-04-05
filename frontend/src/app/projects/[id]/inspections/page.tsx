"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Plus } from "lucide-react";

interface Inspection {
  id: string;
  inspection_type: string;
  title: string;
  scheduled_date: string;
  inspector_name: string | null;
  result: string;
  notes: string | null;
  created_at: string;
}

const INSPECTION_TYPES = [
  { value: "internal", label: "社内" },
  { value: "witness", label: "立会" },
  { value: "interim", label: "中間" },
  { value: "completion", label: "完成" },
];

function typeBadge(type: string) {
  const colors: Record<string, string> = {
    internal: "bg-gray-100 text-gray-700",
    witness: "bg-blue-100 text-blue-700",
    interim: "bg-yellow-100 text-yellow-700",
    completion: "bg-green-100 text-green-700",
  };
  const labels: Record<string, string> = {
    internal: "社内",
    witness: "立会",
    interim: "中間",
    completion: "完成",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || "bg-gray-100 text-gray-700"}`}>
      {labels[type] || type}
    </span>
  );
}

function resultBadge(result: string) {
  const colors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    pass: "bg-green-100 text-green-700",
    fail: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    pending: "未実施",
    pass: "合格",
    fail: "不合格",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[result] || "bg-gray-100 text-gray-700"}`}>
      {labels[result] || result}
    </span>
  );
}

export default function InspectionsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    inspection_type: "internal",
    title: "",
    scheduled_date: "",
    inspector_name: "",
  });

  const { data: inspections = [], isLoading } = useQuery<Inspection[]>({
    queryKey: ["inspections", id],
    queryFn: () => apiFetch(`/api/projects/${id}/inspections`, { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/inspections`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections", id] });
      setShowForm(false);
      setForm({ inspection_type: "internal", title: "", scheduled_date: "", inspector_name: "" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6" /> 検査管理
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 新規登録
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-lg">検査登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">検査種別</label>
              <select value={form.inspection_type}
                onChange={e => setForm({ ...form, inspection_type: e.target.value })}
                className="w-full border rounded px-3 py-2">
                {INSPECTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">タイトル</label>
              <input type="text" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">予定日</label>
              <input type="date" value={form.scheduled_date}
                onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
                className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">検査員名</label>
              <input type="text" value={form.inspector_name}
                onChange={e => setForm({ ...form, inspector_name: e.target.value })}
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
      ) : inspections.length === 0 ? (
        <p className="text-gray-500">検査記録がありません</p>
      ) : (
        <div className="space-y-3">
          {inspections.map(insp => (
            <div key={insp.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {typeBadge(insp.inspection_type)}
                <span className="font-medium">{insp.title}</span>
                <span className="text-sm text-gray-500">{formatDate(insp.scheduled_date)}</span>
                {insp.inspector_name && (
                  <span className="text-sm text-gray-500">検査員: {insp.inspector_name}</span>
                )}
              </div>
              {resultBadge(insp.result)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
