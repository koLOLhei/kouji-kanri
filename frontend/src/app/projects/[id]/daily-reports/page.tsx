"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, statusLabel, statusColor } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, FileText, Plus, ChevronLeft, ChevronRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DailyReport {
  id: string;
  report_date: string;
  weather_morning: string;
  weather_afternoon: string;
  temperature_max: number | null;
  temperature_min: number | null;
  work_description: string;
  worker_count: number | null;
  equipment_used: string | null;
  special_notes: string | null;
  safety_notes: string | null;
  status: string;
  created_by_name?: string;
}

/* ------------------------------------------------------------------ */
/*  Weather helpers                                                    */
/* ------------------------------------------------------------------ */

const WEATHER_CHOICES = [
  { value: "晴", emoji: "☀️", label: "晴" },
  { value: "曇", emoji: "⛅", label: "曇" },
  { value: "雨", emoji: "🌧️", label: "雨" },
  { value: "雪", emoji: "❄️", label: "雪" },
] as const;

function WeatherEmojiDisplay({ weather }: { weather: string }) {
  const found = WEATHER_CHOICES.find((w) => w.value === weather);
  if (!found) return <span>{weather}</span>;
  return <span className="text-lg">{found.emoji}</span>;
}

function WeatherSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-600 w-8 shrink-0">
        {label}
      </span>
      <div className="flex gap-2">
        {WEATHER_CHOICES.map((w) => (
          <button
            key={w.value}
            type="button"
            onClick={() => onChange(w.value)}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 transition-all ${
              value === w.value
                ? "border-blue-500 bg-blue-50 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className="text-2xl leading-none">{w.emoji}</span>
            <span className="text-xs mt-1 text-gray-600">{w.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Japanese day-of-week                                               */
/* ------------------------------------------------------------------ */

const JP_DAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function formatJPDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = JP_DAYS[d.getDay()];
  return { month, day, dow, year: d.getFullYear() };
}

/* ------------------------------------------------------------------ */
/*  Today helper                                                       */
/* ------------------------------------------------------------------ */

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

/* ------------------------------------------------------------------ */
/*  Initial form state                                                 */
/* ------------------------------------------------------------------ */

function initialForm() {
  return {
    report_date: todayStr(),
    weather_morning: "晴",
    weather_afternoon: "晴",
    temperature_max: "",
    temperature_min: "",
    work_description: "",
    worker_count: "1",
    equipment_used: "",
    special_notes: "",
    safety_notes: "",
  };
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function DailyReportsPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);

  // Month navigation state
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);

  /* ----- Queries / Mutations ----- */

  const { data: reports = [], isLoading } = useQuery<DailyReport[]>({
    queryKey: ["daily-reports", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/daily-reports`, { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/daily-reports`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-reports", id] });
      setShowForm(false);
      setForm(initialForm());
    },
  });

  const approveMutation = useMutation({
    mutationFn: (reportId: string) =>
      apiFetch(`/api/projects/${id}/daily-reports/${reportId}/approve`, {
        token: token!,
        method: "PUT",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["daily-reports", id] }),
  });

  /* ----- Form handlers ----- */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      temperature_max: form.temperature_max
        ? Number(form.temperature_max)
        : null,
      temperature_min: form.temperature_min
        ? Number(form.temperature_min)
        : null,
      worker_count: form.worker_count ? Number(form.worker_count) : null,
    });
  };

  const adjustWorkerCount = (delta: number) => {
    const current = Number(form.worker_count) || 0;
    const next = Math.max(0, current + delta);
    setForm({ ...form, worker_count: String(next) });
  };

  /* ----- Month navigation ----- */

  const goMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  /* ----- Filtered & sorted reports ----- */

  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        const d = new Date(r.report_date + "T00:00:00");
        return (
          d.getFullYear() === viewYear && d.getMonth() + 1 === viewMonth
        );
      })
      .sort(
        (a, b) =>
          new Date(b.report_date).getTime() -
          new Date(a.report_date).getTime()
      );
  }, [reports, viewYear, viewMonth]);

  /* ----- Status badge helpers ----- */

  function badgeStatusLabel(status: string) {
    const map: Record<string, string> = {
      draft: "下書き",
      submitted: "提出済",
      approved: "承認済",
    };
    return map[status] || statusLabel(status);
  }

  function badgeStatusColor(status: string) {
    const map: Record<string, string> = {
      draft: "bg-gray-100 text-gray-600",
      submitted: "bg-blue-100 text-blue-700",
      approved: "bg-green-100 text-green-700",
    };
    return map[status] || statusColor(status);
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ===== Header ===== */}
      <div className="flex items-center gap-4">
        <Link
          href={`/projects/${id}`}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          日報管理
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1.5 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新規日報
        </button>
      </div>

      {/* ===== Create Form ===== */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm"
        >
          <h2 className="text-lg font-bold text-gray-800">日報作成</h2>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              日付
            </label>
            <input
              type="date"
              value={form.report_date}
              onChange={(e) =>
                setForm({ ...form, report_date: e.target.value })
              }
              className="border border-gray-300 rounded-lg px-4 py-2.5 w-full max-w-xs text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Weather */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              天候
            </label>
            <div className="space-y-4">
              <WeatherSelector
                label="午前"
                value={form.weather_morning}
                onChange={(v) => setForm({ ...form, weather_morning: v })}
              />
              <WeatherSelector
                label="午後"
                value={form.weather_afternoon}
                onChange={(v) => setForm({ ...form, weather_afternoon: v })}
              />
            </div>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              気温
            </label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">最高</span>
                <input
                  type="number"
                  step="0.1"
                  value={form.temperature_max}
                  onChange={(e) =>
                    setForm({ ...form, temperature_max: e.target.value })
                  }
                  placeholder="--"
                  className="border border-gray-300 rounded-lg px-3 py-2.5 w-24 text-center text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <span className="text-sm text-gray-500">°C</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">最低</span>
                <input
                  type="number"
                  step="0.1"
                  value={form.temperature_min}
                  onChange={(e) =>
                    setForm({ ...form, temperature_min: e.target.value })
                  }
                  placeholder="--"
                  className="border border-gray-300 rounded-lg px-3 py-2.5 w-24 text-center text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <span className="text-sm text-gray-500">°C</span>
              </div>
            </div>
          </div>

          {/* Work Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              作業内容
            </label>
            <textarea
              value={form.work_description}
              onChange={(e) =>
                setForm({ ...form, work_description: e.target.value })
              }
              rows={4}
              placeholder="本日の作業内容を入力..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
              required
            />
          </div>

          {/* Worker Count with stepper */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              作業員数
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => adjustWorkerCount(-1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-xl font-bold text-gray-600 transition-colors"
              >
                −
              </button>
              <input
                type="number"
                min="0"
                value={form.worker_count}
                onChange={(e) =>
                  setForm({ ...form, worker_count: e.target.value })
                }
                className="w-20 text-center border border-gray-300 rounded-lg px-2 py-2 text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => adjustWorkerCount(1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-xl font-bold text-gray-600 transition-colors"
              >
                +
              </button>
              <span className="text-sm text-gray-500 ml-1">名</span>
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              使用機材
            </label>
            <input
              type="text"
              value={form.equipment_used}
              onChange={(e) =>
                setForm({ ...form, equipment_used: e.target.value })
              }
              placeholder="例: クレーン, 高所作業車, 溶接機"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Special Notes & Safety Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                特記事項
              </label>
              <textarea
                value={form.special_notes}
                onChange={(e) =>
                  setForm({ ...form, special_notes: e.target.value })
                }
                rows={3}
                placeholder="特記事項があれば入力..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                安全事項
              </label>
              <textarea
                value={form.safety_notes}
                onChange={(e) =>
                  setForm({ ...form, safety_notes: e.target.value })
                }
                rows={3}
                placeholder="安全に関する事項を入力..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-base shadow-sm disabled:opacity-50"
            >
              {createMutation.isPending ? "保存中..." : "日報を保存"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-gray-300 text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              キャンセル
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-red-600 text-sm">
              {(createMutation.error as Error).message}
            </p>
          )}
        </form>
      )}

      {/* ===== Month Navigation ===== */}
      <div className="flex items-center justify-center gap-4 py-2">
        <button
          onClick={() => goMonth(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-bold text-gray-800 min-w-[120px] text-center">
          {viewYear}年{viewMonth}月
        </h2>
        <button
          onClick={() => goMonth(1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* ===== Report List ===== */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {viewYear}年{viewMonth}月の日報はありません
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((r) => {
            const { month, day, dow } = formatJPDate(r.report_date);
            const dowColor =
              dow === "日"
                ? "text-red-500"
                : dow === "土"
                  ? "text-blue-500"
                  : "text-gray-500";

            return (
              <div
                key={r.id}
                className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Date block */}
                  <div className="shrink-0 text-center w-14">
                    <div className="text-xs text-gray-400">
                      {month}月
                    </div>
                    <div className="text-2xl font-bold text-gray-800 leading-tight">
                      {day}
                    </div>
                    <div className={`text-xs font-medium ${dowColor}`}>
                      ({dow})
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: weather + badges */}
                    <div className="flex items-center flex-wrap gap-3 mb-2">
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        午前 <WeatherEmojiDisplay weather={r.weather_morning} />
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        午後{" "}
                        <WeatherEmojiDisplay weather={r.weather_afternoon} />
                      </span>
                      {r.temperature_max != null &&
                        r.temperature_min != null && (
                          <span className="text-sm text-gray-500">
                            {r.temperature_min}〜{r.temperature_max}°C
                          </span>
                        )}
                      {r.worker_count != null && (
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          👷 {r.worker_count}名
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-700 line-clamp-2 whitespace-pre-wrap">
                      {r.work_description}
                    </p>
                  </div>

                  {/* Right side: status + approve */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeStatusColor(r.status)}`}
                    >
                      {badgeStatusLabel(r.status)}
                    </span>
                    {user?.role === "admin" && r.status !== "approved" && (
                      <button
                        onClick={() => approveMutation.mutate(r.id)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        承認
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
