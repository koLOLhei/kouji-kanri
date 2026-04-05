"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Plus, ChevronDown, ChevronUp, Users } from "lucide-react";

interface Meeting {
  id: string;
  meeting_date: string;
  meeting_type: string;
  title: string;
  location: string | null;
  minutes: string | null;
  decisions: string[];
  attendees: { name: string; company: string }[];
  created_at: string;
}

const MEETING_TYPES = [
  { value: "regular", label: "定例" },
  { value: "safety", label: "安全" },
  { value: "client", label: "発注者" },
  { value: "internal", label: "社内" },
  { value: "inspection", label: "検査" },
];

function typeBadge(type: string) {
  const colors: Record<string, string> = {
    regular: "bg-blue-100 text-blue-700",
    safety: "bg-orange-100 text-orange-700",
    client: "bg-purple-100 text-purple-700",
    internal: "bg-gray-100 text-gray-700",
    inspection: "bg-green-100 text-green-700",
  };
  const labels: Record<string, string> = {
    regular: "定例",
    safety: "安全",
    client: "発注者",
    internal: "社内",
    inspection: "検査",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[type] || "bg-gray-100 text-gray-700"}`}>
      {labels[type] || type}
    </span>
  );
}

export default function MeetingsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    meeting_date: new Date().toISOString().split("T")[0],
    meeting_type: "regular",
    title: "",
    location: "",
    minutes: "",
    decisions: [""],
  });

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["meetings", id],
    queryFn: () => apiFetch(`/api/projects/${id}/meetings`, { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/meetings`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings", id] });
      setShowForm(false);
      setForm({
        meeting_date: new Date().toISOString().split("T")[0],
        meeting_type: "regular",
        title: "",
        location: "",
        minutes: "",
        decisions: [""],
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      ...form,
      decisions: form.decisions.filter(d => d.trim() !== ""),
    };
    createMutation.mutate(body);
  };

  const addDecision = () => setForm({ ...form, decisions: [...form.decisions, ""] });
  const updateDecision = (index: number, value: string) => {
    const updated = [...form.decisions];
    updated[index] = value;
    setForm({ ...form, decisions: updated });
  };
  const removeDecision = (index: number) => {
    const updated = form.decisions.filter((_, i) => i !== index);
    setForm({ ...form, decisions: updated.length === 0 ? [""] : updated });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`} className="p-2 rounded-xl bg-white shadow-sm border border-gray-200 text-gray-500 hover:text-gray-700 hover:shadow-md transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">打合せ記録</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all"
        >
          <Plus className="w-4 h-4" /> 新規登録
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-lg">
          <h2 className="font-bold text-lg text-gray-900">打合せ登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
              <input
                type="date"
                value={form.meeting_date}
                onChange={e => setForm({ ...form, meeting_date: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
              <select
                value={form.meeting_type}
                onChange={e => setForm({ ...form, meeting_type: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                {MEETING_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="第○回定例会議"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">場所</label>
              <input
                type="text"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="現場事務所"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">議事内容</label>
            <textarea
              value={form.minutes}
              onChange={e => setForm({ ...form, minutes: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
              placeholder="議事内容を入力..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">決定事項</label>
            <div className="space-y-2">
              {form.decisions.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={d}
                    onChange={e => updateDecision(i, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder={`決定事項 ${i + 1}`}
                  />
                  {form.decisions.length > 1 && (
                    <button type="button" onClick={() => removeDecision(i)} className="text-red-400 hover:text-red-600 px-2 transition-colors">
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addDecision}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                + 決定事項を追加
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg shadow-blue-500/25 transition-all font-medium"
            >
              {createMutation.isPending ? "保存中..." : "保存"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-gray-300 px-6 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
            >
              キャンセル
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-red-600 text-sm">{(createMutation.error as Error).message}</p>
          )}
        </form>
      )}

      {/* Meeting List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">打合せ記録がありません</p>
          <p className="text-gray-400 text-sm mt-1">「新規登録」から打合せ記録を追加してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map(m => {
            const isExpanded = expandedId === m.id;
            return (
              <div key={m.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className="w-full p-5 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-gray-500 min-w-[90px]">
                      {formatDate(m.meeting_date)}
                    </div>
                    {typeBadge(m.meeting_type)}
                    <span className="font-semibold text-gray-900">{m.title}</span>
                    {m.attendees && m.attendees.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Users className="w-3.5 h-3.5" />
                        {m.attendees.length}名
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 space-y-4">
                    {m.location && (
                      <div className="pt-4">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">場所</span>
                        <p className="text-sm text-gray-700 mt-1">{m.location}</p>
                      </div>
                    )}
                    {m.minutes && (
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">議事内容</span>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">{m.minutes}</p>
                      </div>
                    )}
                    {m.decisions && m.decisions.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">決定事項</span>
                        <ul className="mt-2 space-y-1.5">
                          {m.decisions.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
