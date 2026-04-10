"use client";

import { useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Zap,
  Droplets,
  Wind,
  Flame,
  CircleDot,
  Box,
  MapPin,
  Clock,
  Plus,
  X,
  FileText,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatAmount, formatDate } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────── */

interface ElementDetail {
  id: string;
  facility_id: string;
  facility_name: string;
  category: string;
  element_type: string;
  name: string;
  specification: string;
  condition: string;
  position_description: string;
  zone_id: string;
  zone_name: string;
}

interface InspectionLog {
  id: string;
  log_date: string;
  log_type: string;
  description: string;
  condition_before: string;
  condition_after: string;
  cost: number;
  performed_by: string;
}

/* ── Constants ─────────────────────────────────────── */

const CATEGORIES_META: Record<
  string,
  { Icon: typeof Zap; color: string; iconColor: string; bgGradient: string }
> = {
  電気: {
    Icon: Zap,
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    iconColor: "text-yellow-600",
    bgGradient: "from-yellow-400 to-yellow-600",
  },
  給排水: {
    Icon: Droplets,
    color: "bg-blue-100 text-blue-800 border-blue-300",
    iconColor: "text-blue-600",
    bgGradient: "from-blue-400 to-blue-600",
  },
  空調: {
    Icon: Wind,
    color: "bg-cyan-100 text-cyan-800 border-cyan-300",
    iconColor: "text-cyan-600",
    bgGradient: "from-cyan-400 to-cyan-600",
  },
  消防: {
    Icon: Flame,
    color: "bg-red-100 text-red-800 border-red-300",
    iconColor: "text-red-600",
    bgGradient: "from-red-400 to-red-600",
  },
  ガス: {
    Icon: CircleDot,
    color: "bg-orange-100 text-orange-800 border-orange-300",
    iconColor: "text-orange-600",
    bgGradient: "from-orange-400 to-orange-600",
  },
  構造: {
    Icon: Box,
    color: "bg-gray-100 text-gray-800 border-gray-300",
    iconColor: "text-gray-600",
    bgGradient: "from-gray-400 to-gray-600",
  },
};

const CONDITION_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  良好: { label: "良好", cls: "bg-green-100 text-green-700", dot: "bg-green-500" },
  注意: { label: "注意", cls: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  不良: { label: "不良", cls: "bg-red-100 text-red-700", dot: "bg-red-500" },
  不明: { label: "不明", cls: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
};

const CONDITIONS = ["良好", "注意", "不良", "不明"] as const;
const LOG_TYPES = ["点検", "修理", "交換", "発見"] as const;

/* ── Component ─────────────────────────────────────── */

export default function ElementDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const facilityId = params.id as string;
  const elementId = searchParams.get("eid") ?? "";

  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({
    element_id: elementId,
    log_type: "点検" as string,
    log_date: new Date().toISOString().split("T")[0],
    description: "",
    condition_before: "良好" as string,
    condition_after: "良好" as string,
    cost: 0,
    performed_by: "",
  });

  /* ── Queries ── */

  const { data: element, isLoading } = useQuery<ElementDetail>({
    queryKey: ["element-detail", facilityId, elementId],
    queryFn: () =>
      apiFetch(`/api/facilities/${facilityId}/elements/${elementId}`, {
        token,
      }),
    enabled: !!elementId,
  });

  const { data: inspectionLogs } = useQuery<InspectionLog[]>({
    queryKey: ["element-logs", facilityId, elementId],
    queryFn: () =>
      apiFetch(
        `/api/facilities/${facilityId}/logs?element_id=${elementId}`,
        { token }
      ),
    enabled: !!elementId,
  });

  /* ── Create log mutation ── */

  const createLogMutation = useMutation({
    mutationFn: (data: typeof logForm) =>
      apiFetch(`/api/facilities/${facilityId}/logs`, {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["element-logs", facilityId, elementId],
      });
      queryClient.invalidateQueries({
        queryKey: ["element-detail", facilityId, elementId],
      });
      queryClient.invalidateQueries({
        queryKey: ["facility-logs", facilityId],
      });
      setShowLogForm(false);
      setLogForm({
        element_id: elementId,
        log_type: "点検",
        log_date: new Date().toISOString().split("T")[0],
        description: "",
        condition_before: "良好",
        condition_after: "良好",
        cost: 0,
        performed_by: "",
      });
    },
  });

  /* ── Helpers ── */

  const getCatMeta = (cat: string) =>
    CATEGORIES_META[cat] ?? CATEGORIES_META["構造"];
  const getCond = (cond: string) =>
    CONDITION_MAP[cond] ?? CONDITION_MAP["不明"];

  /* ── Loading / error states ── */

  if (!elementId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">
            要素が指定されていません
          </p>
          <button
            onClick={() => router.push(`/facilities/${facilityId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
          >
            施設詳細に戻る
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (!element) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">要素が見つかりません</p>
          <button
            onClick={() => router.push(`/facilities/${facilityId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
          >
            施設詳細に戻る
          </button>
        </div>
      </div>
    );
  }

  const catMeta = getCatMeta(element.category);
  const currentCond = getCond(element.condition);
  const CatIcon = catMeta.Icon;

  /* ── Build condition timeline from logs ── */
  const timelineEntries = (inspectionLogs ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back nav */}
        <button
          onClick={() => router.push(`/facilities/${facilityId}`)}
          className="flex items-center gap-1 text-gray-500 hover:text-blue-600 mb-4 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {element.facility_name ?? "施設詳細"}に戻る
        </button>

        {/* ── Element header ──────────────────────── */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl bg-gradient-to-br ${catMeta.bgGradient} text-white flex-shrink-0`}
            >
              <CatIcon className="w-10 h-10" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {element.name}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold ${currentCond.cls}`}
                >
                  {currentCond.label}
                </span>
              </div>
              <p className="text-gray-600 mt-1">
                {element.element_type}
                {element.specification && (
                  <span className="text-gray-400">
                    {" "}
                    / {element.specification}
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${catMeta.color}`}
                >
                  {element.category}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Position info ───────────────────────── */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 mb-6">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-400" />
            設置位置
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">ゾーン</p>
              <p className="font-bold text-gray-900">
                {element.zone_name || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">位置詳細</p>
              <p className="font-bold text-gray-900">
                {element.position_description || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Condition timeline ──────────────────── */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 mb-6">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            状態タイムライン
          </h2>
          {timelineEntries.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {timelineEntries.map((entry, idx) => {
                  const condAfter = getCond(entry.condition_after);
                  return (
                    <div key={entry.id} className="relative flex items-start gap-4 pl-1">
                      {/* Dot */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 border-white shadow ${condAfter.dot}`}
                      >
                        <span className="text-white text-xs font-bold">
                          {idx + 1}
                        </span>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-bold text-gray-800">
                            {formatDate(entry.log_date)}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {entry.log_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs">
                          <span
                            className={`px-1.5 py-0.5 rounded ${getCond(entry.condition_before).cls}`}
                          >
                            {getCond(entry.condition_before).label}
                          </span>
                          <span className="text-gray-400">&rarr;</span>
                          <span
                            className={`px-1.5 py-0.5 rounded ${condAfter.cls}`}
                          >
                            {condAfter.label}
                          </span>
                        </div>
                        {entry.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {entry.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-2">
              タイムラインデータがありません
            </p>
          )}
        </div>

        {/* ── Inspection log list ─────────────────── */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              点検ログ一覧
            </h2>
            <button
              onClick={() => setShowLogForm(!showLogForm)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              {showLogForm ? (
                <X className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {showLogForm ? "閉じる" : "ログを追加"}
            </button>
          </div>

          {/* Add inspection log form */}
          {showLogForm && (
            <div className="border border-gray-200 rounded-lg p-5 mb-4 bg-gray-50">
              <h3 className="font-bold text-gray-900 mb-3">
                点検ログを記録
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createLogMutation.mutate(logForm);
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    ログ種別 *
                  </label>
                  <select
                    value={logForm.log_type}
                    onChange={(e) =>
                      setLogForm((p) => ({ ...p, log_type: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {LOG_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    実施日 *
                  </label>
                  <input
                    type="date"
                    required
                    value={logForm.log_date}
                    onChange={(e) =>
                      setLogForm((p) => ({ ...p, log_date: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    処置前の状態
                  </label>
                  <select
                    value={logForm.condition_before}
                    onChange={(e) =>
                      setLogForm((p) => ({
                        ...p,
                        condition_before: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    処置後の状態
                  </label>
                  <select
                    value={logForm.condition_after}
                    onChange={(e) =>
                      setLogForm((p) => ({
                        ...p,
                        condition_after: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    内容・説明
                  </label>
                  <textarea
                    rows={3}
                    placeholder="実施内容や発見事項を記入"
                    value={logForm.description}
                    onChange={(e) =>
                      setLogForm((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    費用
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={logForm.cost}
                    onChange={(e) =>
                      setLogForm((p) => ({
                        ...p,
                        cost: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    実施者
                  </label>
                  <input
                    type="text"
                    placeholder="例: 田中太郎"
                    value={logForm.performed_by}
                    onChange={(e) =>
                      setLogForm((p) => ({
                        ...p,
                        performed_by: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowLogForm(false)}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg font-bold hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={createLogMutation.isPending}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createLogMutation.isPending ? "記録中..." : "記録する"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Log entries */}
          {inspectionLogs && inspectionLogs.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {inspectionLogs.map((log) => {
                const condBefore = getCond(log.condition_before);
                const condAfter = getCond(log.condition_after);
                return (
                  <div key={log.id} className="py-4">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="font-bold text-gray-800 text-sm">
                        {formatDate(log.log_date)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {log.log_type}
                      </span>
                      <div className="flex items-center gap-1 text-xs">
                        <span
                          className={`px-1.5 py-0.5 rounded ${condBefore.cls}`}
                        >
                          {condBefore.label}
                        </span>
                        <span className="text-gray-400">&rarr;</span>
                        <span
                          className={`px-1.5 py-0.5 rounded ${condAfter.cls}`}
                        >
                          {condAfter.label}
                        </span>
                      </div>
                    </div>
                    {log.description && (
                      <p className="text-sm text-gray-700">{log.description}</p>
                    )}
                    <div className="flex gap-4 mt-1 text-xs text-gray-400">
                      {log.performed_by && (
                        <span>実施者: {log.performed_by}</span>
                      )}
                      {log.cost > 0 && (
                        <span>費用: {formatAmount(log.cost)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4">
              点検ログがありません
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
