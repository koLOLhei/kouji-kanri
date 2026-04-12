"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BarChart2, Calendar, Zap, AlertTriangle, Clock,
  ZoomIn, ZoomOut, RefreshCw, Move, CheckCircle, X,
} from "lucide-react";
import GanttChart, { GanttPhase, GanttMilestone, GanttZoom, DragMoveResult } from "@/components/gantt-chart";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AffectedPhase {
  id: string;
  name: string;
  planned_start: string | null;
  planned_end: string | null;
}

interface CascadeResult {
  status: string;
  affected_count: number;
  affected_phases: AffectedPhase[];
}

interface PendingMove {
  dragResult: DragMoveResult;
  previewPhases: AffectedPhase[];
}

interface CriticalPhaseDetail {
  id: string;
  name: string;
  phase_code: string | null;
  earliest_start: string | null;
  earliest_finish: string | null;
  latest_start: string | null;
  latest_finish: string | null;
  total_float: number;
  is_critical: boolean;
}

interface GanttData {
  phases: GanttPhase[];
  milestones: GanttMilestone[];
  critical_path: string[];
  project_duration: number;
  critical_path_phases: CriticalPhaseDetail[];
}

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

function formatDate(s: string | null | undefined): string {
  if (!s) return "-";
  const d = new Date(s + "T00:00:00");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function SchedulePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [view, setView] = useState<"gantt" | "critical">("gantt");
  const [zoom, setZoom] = useState<GanttZoom>("month");
  const [autoScheduleDate, setAutoScheduleDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showAutoForm, setShowAutoForm] = useState(false);

  // Drag/cascade state
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [cascadeResult, setCascadeResult] = useState<CascadeResult | null>(null);

  /* ---- Data fetching ---- */
  const { data: ganttData, isLoading } = useQuery<GanttData>({
    queryKey: ["gantt", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/schedule/gantt`, { token: token! }),
    enabled: !!token,
  });

  const { data: cpData } = useQuery<{
    critical_path: string[];
    phases: CriticalPhaseDetail[];
    project_duration: number;
  }>({
    queryKey: ["critical-path", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/schedule/critical-path`, { token: token! }),
    enabled: !!token,
  });

  const autoScheduleMutation = useMutation({
    mutationFn: (project_start: string) =>
      apiFetch(`/api/projects/${id}/schedule/auto-schedule`, {
        token: token!,
        method: "POST",
        body: JSON.stringify({ project_start }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gantt", id] });
      queryClient.invalidateQueries({ queryKey: ["critical-path", id] });
      setShowAutoForm(false);
    },
  });

  const movePhaseMutation = useMutation<CascadeResult, Error, DragMoveResult>({
    mutationFn: (moveReq) =>
      apiFetch(`/api/projects/${id}/schedule/phases/${moveReq.phase_id}/move`, {
        token: token!,
        method: "PUT",
        body: JSON.stringify({ new_start_date: moveReq.new_start_date }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["gantt", id] });
      queryClient.invalidateQueries({ queryKey: ["critical-path", id] });
      setCascadeResult(data);
      setPendingMove(null);
    },
  });

  /**
   * Called when user finishes dragging a bar.
   * We do a quick local preview of affected phases before confirming.
   */
  function handlePhaseMove(dragResult: DragMoveResult) {
    // Compute preview: find phase + its transitive dependents from ganttData
    const allPhases = ganttData?.phases ?? [];
    const phaseMap = new Map(allPhases.map((p) => [p.id, p]));

    // Build successor map
    const successors = new Map<string, string[]>();
    for (const p of allPhases) {
      if (!successors.has(p.id)) successors.set(p.id, []);
      for (const depId of p.depends_on) {
        if (!successors.has(depId)) successors.set(depId, []);
        successors.get(depId)!.push(p.id);
      }
    }

    // BFS to find all dependents
    const affected: AffectedPhase[] = [];
    const changedPhase = phaseMap.get(dragResult.phase_id);
    if (changedPhase) {
      affected.push({
        id: changedPhase.id,
        name: changedPhase.name,
        planned_start: dragResult.new_start_date,
        planned_end: changedPhase.planned_end,
      });
    }

    const visited = new Set([dragResult.phase_id]);
    const queue = [...(successors.get(dragResult.phase_id) ?? [])];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const ph = phaseMap.get(cur);
      if (ph) {
        affected.push({ id: ph.id, name: ph.name, planned_start: ph.planned_start, planned_end: ph.planned_end });
        queue.push(...(successors.get(cur) ?? []));
      }
    }

    setPendingMove({ dragResult, previewPhases: affected });
    setCascadeResult(null);
  }

  function confirmMove() {
    if (!pendingMove) return;
    movePhaseMutation.mutate(pendingMove.dragResult);
  }

  function cancelMove() {
    setPendingMove(null);
  }

  /* ---- Zoom helpers ---- */
  const ZOOM_ORDER: GanttZoom[] = ["month", "week", "day"];
  const zoomIn = () => {
    const i = ZOOM_ORDER.indexOf(zoom);
    if (i < ZOOM_ORDER.length - 1) setZoom(ZOOM_ORDER[i + 1]);
  };
  const zoomOut = () => {
    const i = ZOOM_ORDER.indexOf(zoom);
    if (i > 0) setZoom(ZOOM_ORDER[i - 1]);
  };

  const zoomLabel: Record<GanttZoom, string> = {
    month: "月単位",
    week: "週単位",
    day: "日単位",
  };

  /* ---- Stats ---- */
  const criticalCount = ganttData?.critical_path?.length ?? 0;
  const totalPhases = ganttData?.phases?.length ?? 0;
  const projectDuration = ganttData?.project_duration ?? 0;
  const avgProgress =
    totalPhases > 0
      ? Math.round(
          (ganttData?.phases ?? []).reduce(
            (sum, p) => sum + (p.progress_percent || 0),
            0
          ) / totalPhases
        )
      : 0;

  /* ---- Render ---- */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">読込中...</p>
        </div>
      </div>
    );
  }

  const phases = ganttData?.phases ?? [];
  const milestones = ganttData?.milestones ?? [];

  return (
    <div className="space-y-5">
      {/* ---- Header ---- */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/projects/${id}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-blue-600" />
          工程スケジュール
        </h1>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView("gantt")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "gantt"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BarChart2 className="w-4 h-4 inline mr-1" />
              ガント
            </button>
            <button
              onClick={() => setView("critical")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "critical"
                  ? "bg-white text-red-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Zap className="w-4 h-4 inline mr-1" />
              クリティカルパス
            </button>
          </div>
        </div>
      </div>

      {/* ---- Stats row ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "総工期",
            value: `${projectDuration}日`,
            icon: Clock,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "クリティカル工程",
            value: `${criticalCount}工程`,
            icon: AlertTriangle,
            color: "text-red-600",
            bg: "bg-red-50",
          },
          {
            label: "全工程数",
            value: `${totalPhases}工程`,
            icon: BarChart2,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
          },
          {
            label: "平均進捗",
            value: `${avgProgress}%`,
            icon: Calendar,
            color: "text-green-600",
            bg: "bg-green-50",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-4 flex items-center gap-3`}>
              <Icon className={`w-5 h-5 ${stat.color} flex-shrink-0`} />
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Controls ---- */}
      {view === "gantt" && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
            <button
              onClick={zoomOut}
              disabled={zoom === "month"}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
              title="縮小"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-600 px-2 min-w-[60px] text-center">
              {zoomLabel[zoom]}
            </span>
            <button
              onClick={zoomIn}
              disabled={zoom === "day"}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
              title="拡大"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom shortcuts */}
          {(["month", "week", "day"] as GanttZoom[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                zoom === z
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}
            >
              {zoomLabel[z]}
            </button>
          ))}

          {/* Auto schedule button */}
          <button
            onClick={() => setShowAutoForm(!showAutoForm)}
            className="ml-auto flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            自動スケジュール
          </button>
        </div>
      )}

      {/* ---- Auto schedule form ---- */}
      {showAutoForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-wrap items-center gap-3">
          <div>
            <p className="text-sm font-medium text-amber-800">
              依存関係と工期（日数）を元に日程を自動計算します
            </p>
            <p className="text-xs text-amber-600">
              工期未設定の工程はデフォルト7日で計算されます。既存の日程は上書きされます。
            </p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm font-medium text-gray-700">開始日:</label>
            <input
              type="date"
              value={autoScheduleDate}
              onChange={(e) => setAutoScheduleDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <button
              onClick={() => autoScheduleMutation.mutate(autoScheduleDate)}
              disabled={autoScheduleMutation.isPending}
              className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50"
            >
              {autoScheduleMutation.isPending ? "計算中..." : "実行"}
            </button>
            <button
              onClick={() => setShowAutoForm(false)}
              className="border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
          {autoScheduleMutation.isError && (
            <p className="w-full text-sm text-red-600">
              {(autoScheduleMutation.error as Error).message}
            </p>
          )}
          {autoScheduleMutation.isSuccess && (
            <p className="w-full text-sm text-green-600">スケジュールを更新しました</p>
          )}
        </div>
      )}

      {/* ---- Legend ---- */}
      {view === "gantt" && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-3 rounded bg-bfdbfe border border-blue-400" style={{ background: "#bfdbfe", borderColor: "#3b82f6", borderWidth: 1 }} />
            <span>計画</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-3 rounded opacity-60" style={{ background: "#22c55e" }} />
            <span>実績進捗</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-3 rounded" style={{ background: "#fecaca", borderColor: "#ef4444", borderWidth: 1 }} />
            <span>クリティカル</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rotate-45 bg-amber-400 border border-amber-600" style={{ transform: "rotate(45deg)" }} />
            <span>マイルストーン</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 border-t-2 border-dashed border-red-400" />
            <span>今日</span>
          </div>
        </div>
      )}

      {/* ---- Gantt View ---- */}
      {view === "gantt" && (
        <div>
          {phases.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
              <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">工程データがありません</h3>
              <p className="text-sm text-gray-400">
                案件詳細から工程を生成し、各工程にスケジュール（計画開始/終了日）を設定してください。
              </p>
              <Link
                href={`/projects/${id}`}
                className="mt-4 inline-block text-sm text-blue-600 hover:underline"
              >
                案件詳細へ
              </Link>
            </div>
          ) : (
            <>
              <GanttChart
                phases={phases}
                milestones={milestones}
                zoom={zoom}
                onPhaseMove={handlePhaseMove}
                affectedPhaseIds={
                  pendingMove
                    ? new Set(pendingMove.previewPhases.map((p) => p.id))
                    : undefined
                }
              />

              {/* ---- Drag confirmation dialog ---- */}
              {pendingMove && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Move className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">工程を移動しますか？</h3>
                        <p className="text-sm text-gray-500">依存する工程も自動でシフトされます</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1 max-h-48 overflow-y-auto">
                      {pendingMove.previewPhases.map((p, idx) => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              idx === 0 ? "bg-blue-500" : "bg-amber-400"
                            }`}
                          />
                          <span className="text-gray-700 truncate">{p.name}</span>
                          {idx === 0 && (
                            <span className="ml-auto text-xs text-blue-600 font-medium flex-shrink-0">
                              {pendingMove.dragResult.new_start_date} 開始
                            </span>
                          )}
                          {idx > 0 && (
                            <span className="ml-auto text-xs text-amber-600 flex-shrink-0">連動</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {pendingMove.previewPhases.length > 1 && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          {pendingMove.previewPhases.length - 1}個の依存工程が同じ日数だけシフトされます。
                        </span>
                      </div>
                    )}

                    {movePhaseMutation.isError && (
                      <p className="text-sm text-red-600 mb-3">
                        {(movePhaseMutation.error as Error).message}
                      </p>
                    )}

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={cancelMove}
                        className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={confirmMove}
                        disabled={movePhaseMutation.isPending}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {movePhaseMutation.isPending ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            処理中...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            適用する
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ---- Success toast ---- */}
              {cascadeResult && (
                <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {cascadeResult.affected_count}工程のスケジュールを更新しました
                  </span>
                  <button
                    onClick={() => setCascadeResult(null)}
                    className="ml-2 opacity-70 hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ---- Critical Path View ---- */}
      {view === "critical" && (
        <div className="space-y-4">
          {/* Summary */}
          {cpData && cpData.critical_path.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">
                  クリティカルパス: {cpData.critical_path.length}工程 / 総工期 {cpData.project_duration}日
                </p>
                <p className="text-sm text-red-600 mt-0.5">
                  これらの工程が遅れると、プロジェクト全体の完工日が遅れます。
                </p>
              </div>
            </div>
          )}

          {/* Phase table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">工程名</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">最早開始</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">最早完了</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">最遅開始</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">最遅完了</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">余裕日数</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">判定</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cpData?.phases?.length ? (
                    cpData.phases.map((p) => (
                      <tr
                        key={p.id}
                        className={p.is_critical ? "bg-red-50" : "hover:bg-gray-50"}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {p.is_critical && (
                              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            )}
                            <span className={`font-medium ${p.is_critical ? "text-red-800" : "text-gray-800"}`}>
                              {p.name}
                            </span>
                            {p.phase_code && (
                              <span className="text-xs text-gray-400 font-mono">({p.phase_code})</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 tabular-nums">
                          {formatDate(p.earliest_start)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 tabular-nums">
                          {formatDate(p.earliest_finish)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 tabular-nums">
                          {formatDate(p.latest_start)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 tabular-nums">
                          {formatDate(p.latest_finish)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              p.total_float === 0
                                ? "bg-red-100 text-red-700"
                                : p.total_float <= 3
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {p.total_float}日
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.is_critical ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                              <AlertTriangle className="w-3 h-3" />
                              CP
                            </span>
                          ) : (
                            <span className="text-green-600 text-xs">余裕あり</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>計画日程が設定された工程がありません</p>
                        <p className="text-xs mt-1">各工程に計画開始日・計画終了日を設定してください</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Float distribution */}
          {cpData?.phases && cpData.phases.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">余裕日数分布</h3>
              <div className="space-y-2">
                {[
                  { label: "クリティカル (0日)", filter: (f: number) => f === 0, color: "bg-red-500" },
                  { label: "要注意 (1-3日)", filter: (f: number) => f >= 1 && f <= 3, color: "bg-amber-500" },
                  { label: "余裕あり (4日以上)", filter: (f: number) => f >= 4, color: "bg-green-500" },
                ].map(({ label, filter, color }) => {
                  const count = cpData.phases.filter((p) => filter(p.total_float)).length;
                  const pct = Math.round((count / cpData.phases.length) * 100);
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-36">{label}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-12 text-right">
                        {count}工程
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
