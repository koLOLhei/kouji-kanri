"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Plus,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Flame,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";

interface LegalInspection {
  id: string;
  inspection_type: string;
  title: string;
  authority: string;
  application_date: string;
  scheduled_date: string;
  completed_date?: string;
  result?: "合格" | "不合格" | "条件付合格" | "未実施";
  notes?: string;
  created_at: string;
}

const INSPECTION_TYPES = [
  { value: "確認申請", label: "確認申請", color: "bg-blue-500", lightBg: "bg-blue-50", textColor: "text-blue-700", borderColor: "border-blue-200", icon: FileCheck },
  { value: "中間検査", label: "中間検査", color: "bg-amber-500", lightBg: "bg-amber-50", textColor: "text-amber-700", borderColor: "border-amber-200", icon: Shield },
  { value: "完了検査", label: "完了検査", color: "bg-green-500", lightBg: "bg-green-50", textColor: "text-green-700", borderColor: "border-green-200", icon: CheckCircle2 },
  { value: "消防検査", label: "消防検査", color: "bg-red-500", lightBg: "bg-red-50", textColor: "text-red-700", borderColor: "border-red-200", icon: Flame },
];

function getTypeConfig(type: string) {
  return (
    INSPECTION_TYPES.find((t) => t.value === type) ?? {
      value: type,
      label: type,
      color: "bg-gray-500",
      lightBg: "bg-gray-50",
      textColor: "text-gray-700",
      borderColor: "border-gray-200",
      icon: Shield,
    }
  );
}

function getResultBadge(result?: string) {
  switch (result) {
    case "合格":
      return { color: "bg-green-100 text-green-800", icon: CheckCircle2 };
    case "不合格":
      return { color: "bg-red-100 text-red-800", icon: XCircle };
    case "条件付合格":
      return { color: "bg-amber-100 text-amber-800", icon: AlertCircle };
    default:
      return { color: "bg-gray-100 text-gray-600", icon: Clock };
  }
}

export default function LegalInspectionsPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    inspection_type: "確認申請",
    title: "",
    authority: "",
    application_date: "",
    scheduled_date: "",
  });

  const headers = { Authorization: `Bearer ${token}` };

  const { data: inspections = [] } = useQuery<LegalInspection[]>({
    queryKey: ["legal-inspections", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/legal-inspections`, { headers }),
  });

  const { data: upcoming = [] } = useQuery<LegalInspection[]>({
    queryKey: ["legal-inspections-upcoming", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/legal-inspections/upcoming`, { headers }),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch(`/api/projects/${id}/legal-inspections`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["legal-inspections", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["legal-inspections-upcoming", id],
      });
      setShowForm(false);
      setForm({
        inspection_type: "確認申請",
        title: "",
        authority: "",
        application_date: "",
        scheduled_date: "",
      });
    },
  });

  const sorted = [...inspections].sort(
    (a, b) =>
      new Date(a.scheduled_date).getTime() -
      new Date(b.scheduled_date).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-3 rounded-xl shadow-lg shadow-emerald-500/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                法定検査管理
              </h1>
              <p className="text-gray-500 mt-0.5">
                確認申請・中間検査・完了検査・消防検査
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-lg shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
          >
            <Plus className="w-5 h-5" />
            検査を登録
          </button>
        </div>

        {/* Type Legend */}
        <div className="flex flex-wrap gap-2">
          {INSPECTION_TYPES.map((t) => (
            <span
              key={t.value}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${t.lightBg} ${t.textColor} border ${t.borderColor}`}
            >
              <span className={`w-2 h-2 rounded-full ${t.color}`} />
              {t.label}
            </span>
          ))}
        </div>

        {/* Upcoming Section */}
        {upcoming.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-amber-800">
                30日以内の予定検査
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcoming.map((insp) => {
                const config = getTypeConfig(insp.inspection_type);
                const daysUntil = Math.ceil(
                  (new Date(insp.scheduled_date).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={insp.id}
                    className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`${config.color} text-white text-xs font-bold px-2.5 py-1 rounded-full`}
                      >
                        {insp.inspection_type}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          daysUntil <= 7
                            ? "text-red-600"
                            : daysUntil <= 14
                            ? "text-amber-600"
                            : "text-gray-600"
                        }`}
                      >
                        {daysUntil}日後
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm">
                      {insp.title}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <Building className="w-3 h-3" />
                      {insp.authority}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(insp.scheduled_date)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              検査登録
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  検査種別
                </label>
                <select
                  value={form.inspection_type}
                  onChange={(e) =>
                    setForm({ ...form, inspection_type: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {INSPECTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  検査名称
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="例: 第1回中間検査"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  検査機関
                </label>
                <input
                  type="text"
                  value={form.authority}
                  onChange={(e) =>
                    setForm({ ...form, authority: e.target.value })
                  }
                  placeholder="例: 東京都建築指導課"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  申請日
                </label>
                <input
                  type="date"
                  value={form.application_date}
                  onChange={(e) =>
                    setForm({ ...form, application_date: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  検査予定日
                </label>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) =>
                    setForm({ ...form, scheduled_date: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex items-end">
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50"
                  >
                    {createMutation.isPending ? "登録中..." : "登録"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Timeline */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            検査タイムライン
          </h2>
          {sorted.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center text-gray-400 border border-dashed border-gray-300">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>検査記録がありません</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 hidden md:block" />

              <div className="space-y-4">
                {sorted.map((insp) => {
                  const config = getTypeConfig(insp.inspection_type);
                  const resultBadge = getResultBadge(insp.result);
                  const isExpanded = expandedId === insp.id;
                  const TypeIcon = config.icon;
                  const ResultIcon = resultBadge.icon;

                  return (
                    <div
                      key={insp.id}
                      className="relative md:pl-16"
                    >
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-4 top-5 w-5 h-5 rounded-full border-2 border-white shadow ${config.color} hidden md:flex items-center justify-center z-10`}
                      />

                      <div
                        className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${config.borderColor}`}
                      >
                        <div
                          className="p-5 cursor-pointer"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : insp.id)
                          }
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`${config.lightBg} p-2.5 rounded-lg`}
                              >
                                <TypeIcon
                                  className={`w-5 h-5 ${config.textColor}`}
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`${config.color} text-white text-xs font-bold px-2 py-0.5 rounded`}
                                  >
                                    {insp.inspection_type}
                                  </span>
                                  <h3 className="font-semibold text-gray-900">
                                    {insp.title}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Building className="w-3.5 h-3.5" />
                                    {insp.authority}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {formatDate(insp.scheduled_date)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${resultBadge.color}`}
                              >
                                <ResultIcon className="w-3.5 h-3.5" />
                                {insp.result ?? "未実施"}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-100 bg-gray-50 p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div className="bg-white p-3 rounded-lg border">
                                <p className="text-xs text-gray-500">申請日</p>
                                <p className="font-medium text-sm">
                                  {formatDate(insp.application_date)}
                                </p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border">
                                <p className="text-xs text-gray-500">検査予定日</p>
                                <p className="font-medium text-sm">
                                  {formatDate(insp.scheduled_date)}
                                </p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border">
                                <p className="text-xs text-gray-500">検査実施日</p>
                                <p className="font-medium text-sm">
                                  {insp.completed_date
                                    ? formatDate(insp.completed_date)
                                    : "---"}
                                </p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border">
                                <p className="text-xs text-gray-500">結果</p>
                                <p
                                  className={`font-medium text-sm ${
                                    insp.result === "合格"
                                      ? "text-green-700"
                                      : insp.result === "不合格"
                                      ? "text-red-700"
                                      : insp.result === "条件付合格"
                                      ? "text-amber-700"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {insp.result ?? "未実施"}
                                </p>
                              </div>
                            </div>
                            {insp.notes && (
                              <div className="mt-3 bg-white p-3 rounded-lg border">
                                <p className="text-xs text-gray-500 mb-1">備考</p>
                                <p className="text-sm text-gray-700">
                                  {insp.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
