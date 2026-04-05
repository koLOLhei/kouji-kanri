"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Shield, Plus, AlertTriangle, BookOpen, Eye, GraduationCap,
  BarChart2, Zap, Users,
} from "lucide-react";

type TabKey = "ky" | "patrol" | "incident" | "training" | "analysis";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "ky", label: "KY活動", icon: <AlertTriangle className="w-4 h-4" /> },
  { key: "patrol", label: "安全巡回", icon: <Eye className="w-4 h-4" /> },
  { key: "incident", label: "ヒヤリハット", icon: <AlertTriangle className="w-4 h-4" /> },
  { key: "training", label: "安全教育", icon: <GraduationCap className="w-4 h-4" /> },
  { key: "analysis", label: "分析", icon: <BarChart2 className="w-4 h-4" /> },
];

const ENDPOINT_MAP: Partial<Record<TabKey, string>> = {
  ky: "ky-activities",
  patrol: "patrols",
  incident: "incidents",
  training: "trainings",
};

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
  severity?: string;
  [key: string]: unknown;
}

interface TrendData {
  month: string;
  ky_count: number;
  patrol_count: number;
  incident_count: number;
  training_count: number;
}

interface AnalysisData {
  total: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  by_location: Record<string, number>;
  by_status: Record<string, number>;
}

function getDate(r: SafetyRecord): string {
  return (r.activity_date || r.date || r.patrol_date || r.incident_date || r.training_date || "") as string;
}

const SEVERITY_COLOR: Record<string, string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
  minor: "bg-gray-100 text-gray-600",
};

const SEVERITY_LABEL: Record<string, string> = {
  low: "軽微",
  medium: "中程度",
  high: "重大",
  critical: "緊急",
  minor: "軽微",
};

function AnalysisTab({ id, token }: { id: string; token: string }) {
  const { data: trends = [] } = useQuery<TrendData[]>({
    queryKey: ["safety-trends", id],
    queryFn: () => apiFetch(`/api/projects/${id}/safety/trends?months=6`, { token }),
    enabled: !!token,
  });

  const { data: analysis } = useQuery<AnalysisData>({
    queryKey: ["safety-analysis", id],
    queryFn: () => apiFetch(`/api/projects/${id}/safety/incident-analysis`, { token }),
    enabled: !!token,
  });

  const maxIncidents = Math.max(...trends.map(t => t.incident_count), 1);
  const maxKY = Math.max(...trends.map(t => t.ky_count), 1);

  return (
    <div className="space-y-6">
      {/* Quick report CTA */}
      <Link
        href={`/projects/${id}/safety/quick-report`}
        className="flex items-center justify-between bg-orange-500 text-white rounded-xl p-4 hover:bg-orange-600 transition-colors shadow"
      >
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6" />
          <div>
            <div className="font-bold text-lg">ヒヤリハット簡易報告</div>
            <div className="text-orange-100 text-sm">3タップで報告完了</div>
          </div>
        </div>
        <span className="text-2xl">→</span>
      </Link>

      {/* Monthly incident trend */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4" /> 月次インシデント件数
        </h3>
        <div className="flex items-end gap-2 h-32">
          {trends.map(t => (
            <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-red-600">{t.incident_count}</span>
              <div
                className="w-full bg-red-400 rounded-t transition-all"
                style={{ height: `${(t.incident_count / maxIncidents) * 96}px`, minHeight: t.incident_count > 0 ? "4px" : "0" }}
              />
              <span className="text-xs text-gray-400 truncate w-full text-center">
                {t.month.slice(5)}月
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* KY activity rate */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="font-semibold mb-4">KY活動 月次件数</h3>
        <div className="flex items-end gap-2 h-24">
          {trends.map(t => (
            <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-blue-600">{t.ky_count}</span>
              <div
                className="w-full bg-blue-400 rounded-t transition-all"
                style={{ height: `${(t.ky_count / maxKY) * 72}px`, minHeight: t.ky_count > 0 ? "4px" : "0" }}
              />
              <span className="text-xs text-gray-400">{t.month.slice(5)}月</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      {trends.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {trends.reduce((s, t) => s + t.ky_count, 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">KY活動（6か月）</div>
          </div>
          <div className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {trends.reduce((s, t) => s + t.patrol_count, 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">安全巡回（6か月）</div>
          </div>
          <div className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {trends.reduce((s, t) => s + t.incident_count, 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">ヒヤリハット（6か月）</div>
          </div>
          <div className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {trends.reduce((s, t) => s + t.training_count, 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">安全教育（6か月）</div>
          </div>
        </div>
      )}

      {/* Severity breakdown */}
      {analysis && analysis.total > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold mb-4">重大度別内訳（全期間）</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(analysis.by_severity).map(([sev, count]) => (
              <div key={sev} className={`rounded-lg p-3 ${SEVERITY_COLOR[sev] || "bg-gray-100 text-gray-700"}`}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm font-medium">{SEVERITY_LABEL[sev] || sev}</div>
                <div className="text-xs opacity-70">
                  {Math.round((count / analysis.total) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type breakdown */}
      {analysis && Object.keys(analysis.by_type).length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold mb-3">種別内訳</h3>
          <div className="space-y-2">
            {Object.entries(analysis.by_type).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-32 truncate">{type}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full"
                    style={{ width: `${(count / analysis.total) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orientation link */}
      <Link
        href={`/projects/${id}/safety/orientation`}
        className="flex items-center justify-between bg-white border rounded-xl p-4 hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-gray-500" />
          <div>
            <div className="font-medium">新規入場者教育</div>
            <div className="text-sm text-gray-500">入場者チェックリスト管理</div>
          </div>
        </div>
        <span className="text-gray-400">→</span>
      </Link>
    </div>
  );
}

export default function SafetyPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("ky");
  const [showForm, setShowForm] = useState(false);

  const tab = TABS.find(t => t.key === activeTab)!;
  const endpoint = ENDPOINT_MAP[activeTab];

  const [form, setForm] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    location: "",
    participants: "",
  });

  const { data: records = [], isLoading } = useQuery<SafetyRecord[]>({
    queryKey: ["safety", id, endpoint],
    queryFn: () => apiFetch(`/api/projects/${id}/safety/${endpoint}`, { token: token! }),
    enabled: !!token && !!endpoint,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/safety/${endpoint}`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety", id, endpoint] });
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
        <Link
          href={`/projects/${id}/safety/quick-report`}
          className="ml-auto flex items-center gap-1 bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 text-sm font-medium"
        >
          <Zap className="w-4 h-4" /> 簡易報告
        </Link>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setShowForm(false); }}
            className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              activeTab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === "analysis" ? (
        <AnalysisTab id={id} token={token!} />
      ) : (
        <>
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
                      {r.severity && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SEVERITY_COLOR[r.severity] || "bg-gray-100 text-gray-600"}`}>
                          {SEVERITY_LABEL[r.severity] || r.severity}
                        </span>
                      )}
                    </div>
                    {r.location && (
                      <span className="text-sm text-gray-500">{r.location}</span>
                    )}
                  </div>
                  {r.description && (
                    <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{r.description as string}</p>
                  )}
                  {r.participants && (
                    <p className="mt-1 text-xs text-gray-500">参加者: {r.participants as string}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
