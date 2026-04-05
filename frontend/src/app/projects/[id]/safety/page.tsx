"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Shield, Plus, AlertTriangle, BookOpen, Eye, GraduationCap,
} from "lucide-react";

type TabKey = "ky" | "patrol" | "incident" | "training";

const TABS: { key: TabKey; label: string; icon: React.ReactNode; endpoint: string }[] = [
  { key: "ky", label: "KY活動", icon: <AlertTriangle className="w-4 h-4" />, endpoint: "ky-activities" },
  { key: "patrol", label: "安全巡回", icon: <Eye className="w-4 h-4" />, endpoint: "patrols" },
  { key: "incident", label: "ヒヤリハット", icon: <AlertTriangle className="w-4 h-4" />, endpoint: "incidents" },
  { key: "training", label: "安全教育", icon: <GraduationCap className="w-4 h-4" />, endpoint: "trainings" },
];

interface SafetyRecord {
  id: string;
  title?: string;
  activity_date?: string;
  date?: string;
  patrol_date?: string;
  incident_date?: string;
  training_date?: string;
  description?: string;
  location?: string;
  participants?: string;
  findings?: string;
  status?: string;
  [key: string]: unknown;
}

function getDate(r: SafetyRecord): string {
  return (r.activity_date || r.date || r.patrol_date || r.incident_date || r.training_date || "") as string;
}

export default function SafetyPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("ky");
  const [showForm, setShowForm] = useState(false);

  const tab = TABS.find(t => t.key === activeTab)!;

  const [form, setForm] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    location: "",
    participants: "",
  });

  const { data: records = [], isLoading } = useQuery<SafetyRecord[]>({
    queryKey: ["safety", id, tab.endpoint],
    queryFn: () => apiFetch(`/api/projects/${id}/safety/${tab.endpoint}`, { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/safety/${tab.endpoint}`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety", id, tab.endpoint] });
      setShowForm(false);
      setForm({ title: "", date: new Date().toISOString().split("T")[0], description: "", location: "", participants: "" });
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
          <Shield className="w-6 h-6" /> 安全管理
        </h1>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setShowForm(false); }}
            className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 新規登録
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-lg">{tab.label} 登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">タイトル</label>
              <input type="text" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">日付</label>
              <input type="date" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">場所</label>
              <input type="text" value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">参加者</label>
              <input type="text" value={form.participants}
                onChange={e => setForm({ ...form, participants: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
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
      ) : records.length === 0 ? (
        <p className="text-gray-500">記録がありません</p>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{r.title || "無題"}</span>
                  <span className="text-sm text-gray-500">{formatDate(getDate(r))}</span>
                </div>
                {r.location && (
                  <span className="text-sm text-gray-500">{r.location}</span>
                )}
              </div>
              {r.description && (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{r.description}</p>
              )}
              {r.participants && (
                <p className="mt-1 text-xs text-gray-500">参加者: {r.participants}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
