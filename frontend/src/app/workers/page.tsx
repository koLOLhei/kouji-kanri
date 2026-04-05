"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import Link from "next/link";
import { HardHat, Plus, ChevronRight, AlertTriangle, Clock, Filter } from "lucide-react";

interface Worker {
  id: string;
  name: string;
  blood_type: string | null;
  company_name: string | null;
  phone: string | null;
  is_active: boolean;
}

interface ExpiringQual {
  id: string;
  worker_id: string;
  worker_name: string;
  qualification_name: string;
  expiry_date: string;
  days_left: number;
  alert_level: "critical" | "high" | "medium";
}

const ALERT_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export default function WorkersPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [form, setForm] = useState({
    name: "",
    blood_type: "",
    company_name: "",
    phone: "",
  });

  const { data: workers = [], isLoading } = useQuery<Worker[]>({
    queryKey: ["workers"],
    queryFn: () => apiFetch("/api/workers", { token: token! }),
    enabled: !!token,
  });

  const { data: expiringQuals = [] } = useQuery<ExpiringQual[]>({
    queryKey: ["expiring-qualifications"],
    queryFn: () => apiFetch("/api/workers/expiring-qualifications?days=60", { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/workers", {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      setShowForm(false);
      setForm({ name: "", blood_type: "", company_name: "", phone: "" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      blood_type: form.blood_type || null,
      company_name: form.company_name || null,
      phone: form.phone || null,
    });
  };

  // Map worker_id -> expiring qualification count & worst alert level
  const workerAlertMap = new Map<string, { count: number; level: string }>();
  for (const q of expiringQuals) {
    const existing = workerAlertMap.get(q.worker_id);
    const levelPriority = { critical: 3, high: 2, medium: 1 };
    const newLevel = q.alert_level;
    if (!existing || (levelPriority[newLevel] || 0) > (levelPriority[existing.level as keyof typeof levelPriority] || 0)) {
      workerAlertMap.set(q.worker_id, { count: (existing?.count || 0) + 1, level: newLevel });
    } else {
      workerAlertMap.set(q.worker_id, { count: existing.count + 1, level: existing.level });
    }
  }

  const workersWithExpiringQuals = new Set(expiringQuals.map(q => q.worker_id));
  const displayedWorkers = showExpiringOnly
    ? workers.filter(w => workersWithExpiringQuals.has(w.id))
    : workers;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HardHat className="w-6 h-6" /> 作業員管理
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 作業員登録
        </button>
      </div>

      {/* Expiring qualification alert banner */}
      {expiringQuals.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-800 mb-2">
                資格期限切れ間近 {expiringQuals.length}件
              </h3>
              <div className="space-y-1">
                {expiringQuals.slice(0, 5).map(q => (
                  <div key={q.id} className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${ALERT_COLOR[q.alert_level]}`}>
                      {q.days_left}日
                    </span>
                    <Link href={`/workers/${q.worker_id}`} className="font-medium text-orange-800 hover:underline">
                      {q.worker_name}
                    </Link>
                    <span className="text-orange-600">{q.qualification_name}</span>
                    <span className="text-gray-500">{formatDate(q.expiry_date)}</span>
                  </div>
                ))}
                {expiringQuals.length > 5 && (
                  <p className="text-xs text-orange-600 mt-1">他 {expiringQuals.length - 5}件...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-lg">作業員登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">氏名</label>
              <input type="text" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">血液型</label>
              <select value={form.blood_type}
                onChange={e => setForm({ ...form, blood_type: e.target.value })}
                className="w-full border rounded px-3 py-2">
                <option value="">未設定</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="O">O</option>
                <option value="AB">AB</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">所属会社</label>
              <input type="text" value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">電話番号</label>
              <input type="tel" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
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

      {/* Filter toggle */}
      {expiringQuals.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => setShowExpiringOnly(!showExpiringOnly)}
            className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border transition-colors ${
              showExpiringOnly
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-gray-600 border-gray-300 hover:border-orange-400"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            期限切れ間近
            {showExpiringOnly ? "" : ` (${workersWithExpiringQuals.size})`}
          </button>
          {showExpiringOnly && (
            <button onClick={() => setShowExpiringOnly(false)} className="text-sm text-gray-500 hover:text-gray-700">
              全員表示
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : displayedWorkers.length === 0 ? (
        <p className="text-gray-500">{showExpiringOnly ? "該当する作業員はいません" : "作業員がいません"}</p>
      ) : (
        <div className="space-y-2">
          {displayedWorkers.map(w => {
            const alert = workerAlertMap.get(w.id);
            return (
              <Link key={w.id} href={`/workers/${w.id}`}
                className="bg-white border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 block">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-semibold">{w.name}</span>
                  {w.blood_type && (
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">{w.blood_type}型</span>
                  )}
                  {w.company_name && (
                    <span className="text-sm text-gray-500">{w.company_name}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    w.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {w.is_active ? "稼働中" : "非稼働"}
                  </span>
                  {alert && (
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${ALERT_COLOR[alert.level]}`}>
                      <AlertTriangle className="w-3 h-3" />
                      資格期限 {alert.count}件
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
