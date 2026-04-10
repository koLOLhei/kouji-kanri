"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Droplets,
  AlertTriangle,
  FlaskConical,
  Layers,
  Plus,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  Beaker,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";

interface ConcretePlacement {
  id: string;
  placement_date: string;
  location: string;
  member_type: string;
  volume_m3: number;
  design_strength: string;
  slump: number;
  curing_method: string;
  curing_days_required: number;
  formwork_removal_days: number;
  curing_completed: boolean;
  formwork_removed: boolean;
  test_7day_result?: number;
  test_28day_result?: number;
  created_at: string;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  placement_id: string;
  severity: "high" | "medium" | "low";
}

interface Dashboard {
  total_placements: number;
  curing_active: number;
  tests_pending: number;
  alert_count: number;
}

const MEMBER_TYPES = ["柱", "梁", "床版", "壁", "基礎"];
const CURING_METHODS = ["散水", "シート", "膜養生"];

export default function ConcretePage() {
  const { id } = useParams();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const [form, setForm] = useState({
    placement_date: "",
    location: "",
    member_type: "柱",
    volume_m3: "",
    design_strength: "",
    slump: "",
    curing_method: "散水",
    curing_days_required: "5",
    formwork_removal_days: "28",
  });

  const headers = { Authorization: `Bearer ${token}` };

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ["concrete-dashboard", id],
    queryFn: () => apiFetch(`/api/projects/${id}/concrete/dashboard`, { headers }),
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["concrete-alerts", id],
    queryFn: () => apiFetch(`/api/projects/${id}/concrete/alerts`, { headers }),
  });

  const { data: placements = [] } = useQuery<ConcretePlacement[]>({
    queryKey: ["concrete", id],
    queryFn: () => apiFetch(`/api/projects/${id}/concrete`, { headers }),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch(`/api/projects/${id}/concrete`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          volume_m3: parseFloat(data.volume_m3),
          slump: parseFloat(data.slump),
          curing_days_required: parseInt(data.curing_days_required),
          formwork_removal_days: parseInt(data.formwork_removal_days),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concrete", id] });
      queryClient.invalidateQueries({ queryKey: ["concrete-dashboard", id] });
      setShowForm(false);
      setForm({
        placement_date: "",
        location: "",
        member_type: "柱",
        volume_m3: "",
        design_strength: "",
        slump: "",
        curing_method: "散水",
        curing_days_required: "5",
        formwork_removal_days: "28",
      });
    },
  });

  const getCuringProgress = (placement: ConcretePlacement) => {
    const start = new Date(placement.placement_date).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const progress = Math.min(100, (elapsed / placement.curing_days_required) * 100);
    return { elapsed, progress };
  };

  const addDays = (dateStr: string, days: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const stats = [
    {
      label: "打設回数",
      value: dashboard?.total_placements ?? 0,
      icon: Layers,
      gradient: "from-blue-500 to-blue-700",
    },
    {
      label: "養生中",
      value: dashboard?.curing_active ?? 0,
      icon: Droplets,
      gradient: "from-cyan-500 to-teal-600",
    },
    {
      label: "強度試験待ち",
      value: dashboard?.tests_pending ?? 0,
      icon: FlaskConical,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      label: "アラート数",
      value: dashboard?.alert_count ?? 0,
      icon: AlertTriangle,
      gradient: "from-red-500 to-rose-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              コンクリート養生管理
            </h1>
            <p className="text-gray-500 mt-1">打設・養生・強度試験の一元管理</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
          >
            <Plus className="w-5 h-5" />
            新規打設記録
          </button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-5 text-white shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <stat.icon className="w-8 h-8 opacity-80" />
                <span className="text-3xl font-bold">{stat.value}</span>
              </div>
              <p className="mt-2 text-sm opacity-90">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="bg-white border-2 border-red-300 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-bold text-red-800">緊急アラート</h2>
            </div>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    alert.severity === "high"
                      ? "bg-red-50 border border-red-200"
                      : alert.severity === "medium"
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-yellow-50 border border-yellow-200"
                  }`}
                >
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      alert.severity === "high"
                        ? "bg-red-500"
                        : alert.severity === "medium"
                        ? "bg-amber-500"
                        : "bg-yellow-500"
                    }`}
                  />
                  <p className="text-sm text-gray-800">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">新規打設記録</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  打設日
                </label>
                <input
                  type="date"
                  value={form.placement_date}
                  onChange={(e) => setForm({ ...form, placement_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  打設箇所
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="例: 1F柱 C1-C4"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  部材種別
                </label>
                <select
                  value={form.member_type}
                  onChange={(e) => setForm({ ...form, member_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {MEMBER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  打設量 (m3)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.volume_m3}
                  onChange={(e) => setForm({ ...form, volume_m3: e.target.value })}
                  placeholder="例: 45.5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  設計基準強度
                </label>
                <input
                  type="text"
                  value={form.design_strength}
                  onChange={(e) => setForm({ ...form, design_strength: e.target.value })}
                  placeholder="例: 24N/mm2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  スランプ (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={form.slump}
                  onChange={(e) => setForm({ ...form, slump: e.target.value })}
                  placeholder="例: 18"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  養生方法
                </label>
                <select
                  value={form.curing_method}
                  onChange={(e) => setForm({ ...form, curing_method: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CURING_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  養生日数
                </label>
                <input
                  type="number"
                  value={form.curing_days_required}
                  onChange={(e) =>
                    setForm({ ...form, curing_days_required: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  型枠存置日数
                </label>
                <input
                  type="number"
                  value={form.formwork_removal_days}
                  onChange={(e) =>
                    setForm({ ...form, formwork_removal_days: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50"
                >
                  {createMutation.isPending ? "登録中..." : "登録"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Placement Timeline */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">打設一覧</h2>
          {placements.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center text-gray-400 border border-dashed border-gray-300">
              <Droplets className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>打設記録がありません</p>
            </div>
          ) : (
            placements.map((p) => {
              const { elapsed, progress } = getCuringProgress(p);
              const isExpanded = expandedCard === p.id;
              const curingEnd = addDays(p.placement_date, p.curing_days_required);
              const formworkEnd = addDays(p.placement_date, p.formwork_removal_days);
              const test7day = addDays(p.placement_date, 7);
              const test28day = addDays(p.placement_date, 28);

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => setExpandedCard(isExpanded ? null : p.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-2.5 rounded-lg">
                          <MapPin className="w-5 h-5 text-blue-700" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{p.location}</h3>
                          <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500">
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">
                              {p.member_type}
                            </span>
                            <span>{formatDate(p.placement_date)}</span>
                            <span>{p.volume_m3} m3</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                          {p.curing_completed && (
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                              養生完了
                            </span>
                          )}
                          {p.formwork_removed && (
                            <span className="bg-teal-100 text-teal-800 text-xs font-medium px-2.5 py-1 rounded-full">
                              脱型完了
                            </span>
                          )}
                          {!p.curing_completed && (
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              養生中
                            </span>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>
                          養生進捗: {elapsed}日 / {p.curing_days_required}日
                        </span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            progress >= 100
                              ? "bg-gradient-to-r from-green-400 to-emerald-500"
                              : progress >= 70
                              ? "bg-gradient-to-r from-blue-400 to-blue-600"
                              : "bg-gradient-to-r from-amber-400 to-orange-500"
                          }`}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Timeline */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            スケジュール
                          </h4>
                          <div className="space-y-3">
                            {[
                              {
                                label: "打設日",
                                date: p.placement_date,
                                icon: Calendar,
                                done: true,
                              },
                              {
                                label: "養生終了",
                                date: curingEnd,
                                icon: Droplets,
                                done: p.curing_completed,
                              },
                              {
                                label: "脱型予定",
                                date: formworkEnd,
                                icon: Layers,
                                done: p.formwork_removed,
                              },
                              {
                                label: "7日強度試験",
                                date: test7day,
                                icon: Beaker,
                                done: !!p.test_7day_result,
                              },
                              {
                                label: "28日強度試験",
                                date: test28day,
                                icon: FlaskConical,
                                done: !!p.test_28day_result,
                              },
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    item.done
                                      ? "bg-green-100 text-green-600"
                                      : "bg-gray-200 text-gray-400"
                                  }`}
                                >
                                  {item.done ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                  ) : (
                                    <item.icon className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-800">
                                    {item.label}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(item.date)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Specs & Results */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              配合・仕様
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-white p-2.5 rounded-lg border">
                                <p className="text-gray-500 text-xs">設計基準強度</p>
                                <p className="font-semibold">{p.design_strength}</p>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border">
                                <p className="text-gray-500 text-xs">スランプ</p>
                                <p className="font-semibold">{p.slump} cm</p>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border">
                                <p className="text-gray-500 text-xs">養生方法</p>
                                <p className="font-semibold">{p.curing_method}</p>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border">
                                <p className="text-gray-500 text-xs">打設量</p>
                                <p className="font-semibold">{p.volume_m3} m3</p>
                              </div>
                            </div>
                          </div>
                          {(p.test_7day_result || p.test_28day_result) && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                試験結果
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {p.test_7day_result && (
                                  <div className="bg-white p-2.5 rounded-lg border">
                                    <p className="text-gray-500 text-xs">7日強度</p>
                                    <p className="font-semibold text-blue-700">
                                      {p.test_7day_result} N/mm2
                                    </p>
                                  </div>
                                )}
                                {p.test_28day_result && (
                                  <div className="bg-white p-2.5 rounded-lg border">
                                    <p className="text-gray-500 text-xs">28日強度</p>
                                    <p className="font-semibold text-green-700">
                                      {p.test_28day_result} N/mm2
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
