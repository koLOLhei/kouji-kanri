"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarEvent {
  date: string;
  type: string;
  title: string;
  color?: string;
}

interface Milestone {
  id: string;
  title: string;
  due_date: string;
  milestone_type: string;
  description?: string;
  notes: string | null;
  status: string;
}

const EVENT_COLORS: Record<string, string> = {
  milestone: "bg-red-500",
  inspection: "bg-yellow-500",
  delivery: "bg-blue-500",
  meeting: "bg-green-500",
  default: "bg-gray-400",
};

export default function CalendarPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    due_date: "",
    milestone_type: "other",
    notes: "",
  });

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar", id, year, month],
    queryFn: () => apiFetch(`/api/projects/${id}/calendar?year=${year}&month=${month}`, { token: token! }),
    enabled: !!token,
  });

  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ["milestones", id],
    queryFn: () => apiFetch(`/api/projects/${id}/calendar/milestones`, { token: token! }),
    enabled: !!token,
  });

  const createMilestone = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/projects/${id}/calendar/milestones`, {
        token: token!, method: "POST", body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones", id] });
      queryClient.invalidateQueries({ queryKey: ["calendar", id, year, month] });
      setShowForm(false);
      setForm({ title: "", due_date: "", milestone_type: "other", notes: "" });
    },
  });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.date === dateStr);
  };

  const DOW = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" /> 工程カレンダー
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> マイルストーン追加
        </button>
      </div>

      {showForm && (
        <form onSubmit={e => { e.preventDefault(); createMilestone.mutate(form); }}
          className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-lg">マイルストーン登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">タイトル</label>
              <input type="text" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">日付</label>
              <input type="date" value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })}
                className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">種別</label>
              <select value={form.milestone_type}
                onChange={e => setForm({ ...form, milestone_type: e.target.value })}
                className="w-full border rounded px-3 py-2">
                <option value="inspection">検査</option>
                <option value="submission">提出</option>
                <option value="delivery">納品</option>
                <option value="meeting">会議</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">メモ</label>
            <textarea value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full border rounded px-3 py-2 h-20" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createMilestone.isPending}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {createMilestone.isPending ? "保存中..." : "保存"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="border px-6 py-2 rounded-lg hover:bg-gray-50">キャンセル</button>
          </div>
          {createMilestone.isError && (
            <p className="text-red-600 text-sm">{(createMilestone.error as Error).message}</p>
          )}
        </form>
      )}

      {/* Calendar Navigation */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-center gap-4 mb-4">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold">{year}年 {month}月</h2>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {DOW.map((d, i) => (
            <div key={d} className={`bg-gray-50 text-center text-sm font-medium py-2 ${
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-700"
            }`}>
              {d}
            </div>
          ))}
          {weeks.flat().map((day, i) => {
            const dayEvents = day ? getEventsForDay(day) : [];
            const dow = i % 7;
            return (
              <div key={i} className={`bg-white min-h-[80px] p-1 ${!day ? "bg-gray-50" : ""}`}>
                {day && (
                  <>
                    <span className={`text-sm ${
                      dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-gray-700"
                    }`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.map((ev, j) => (
                        <div key={j} className="flex items-center gap-1" title={ev.title}>
                          <span className={`w-2 h-2 rounded-full ${EVENT_COLORS[ev.type] || EVENT_COLORS.default}`} />
                          <span className="text-xs truncate">{ev.title}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestones list */}
      {milestones.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">マイルストーン一覧</h2>
          <div className="space-y-2">
            {milestones.map(m => (
              <div key={m.id} className="bg-white border rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="font-medium">{m.title}</span>
                  <span className="text-sm text-gray-500">{formatDate(m.due_date)}</span>
                </div>
                {m.description && (
                  <span className="text-sm text-gray-500">{m.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
