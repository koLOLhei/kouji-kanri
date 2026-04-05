"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Star, BarChart2, Plus, Trash2, Loader2, Award, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate, cn } from "@/lib/utils";

// ---------- Types ----------

interface Evaluation {
  id: string;
  project_id: string;
  subcontractor_id: string;
  evaluation_period_start: string | null;
  evaluation_period_end: string | null;
  safety_score: number | null;
  quality_score: number | null;
  schedule_score: number | null;
  cooperation_score: number | null;
  overall_score: number | null;
  comments: string | null;
  evaluated_by: string | null;
  created_at: string;
}

interface EvaluationAverage {
  evaluation_count: number;
  safety_avg: number | null;
  quality_avg: number | null;
  schedule_avg: number | null;
  cooperation_avg: number | null;
  overall_avg: number | null;
}

interface Subcontractor {
  id: string;
  company_name: string;
}

// ---------- Star rating component ----------

function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null;
  onChange?: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(n)}
          className={cn(
            "transition-colors",
            disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
        >
          <Star
            className={cn(
              "w-5 h-5",
              value != null && n <= value
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
      {value != null && (
        <span className="text-sm text-gray-600 ml-1">{value}/5</span>
      )}
    </div>
  );
}

// ---------- CSS Bar for averages ----------

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value != null ? (value / 5) * 100 : 0;
  const color =
    value == null ? "bg-gray-200"
    : value >= 4 ? "bg-green-500"
    : value >= 3 ? "bg-blue-500"
    : value >= 2 ? "bg-amber-500"
    : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn(
        "text-sm font-semibold w-8 text-right",
        value == null ? "text-gray-400"
        : value >= 4 ? "text-green-600"
        : value >= 3 ? "text-blue-600"
        : "text-amber-600"
      )}>
        {value?.toFixed(1) ?? "-"}
      </span>
    </div>
  );
}

// ---------- Create form ----------

function EvaluationForm({
  subId,
  token,
  onClose,
}: {
  subId: string;
  token: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [scheduleScore, setScheduleScore] = useState<number | null>(null);
  const [cooperationScore, setCooperationScore] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [evaluatedBy, setEvaluatedBy] = useState("");

  const mutation = useMutation({
    mutationFn: (data: unknown) =>
      apiFetch(`/api/subcontractors/${subId}/evaluations`, {
        method: "POST", body: JSON.stringify(data), token,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evaluations", subId] });
      qc.invalidateQueries({ queryKey: ["evaluations-avg", subId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    mutation.mutate({
      project_id: projectId,
      evaluation_period_start: periodStart || null,
      evaluation_period_end: periodEnd || null,
      safety_score: safetyScore,
      quality_score: qualityScore,
      schedule_score: scheduleScore,
      cooperation_score: cooperationScore,
      comments: comments || null,
      evaluated_by: evaluatedBy || null,
    });
  };

  const scoreCategories = [
    { label: "安全管理", value: safetyScore, setter: setSafetyScore },
    { label: "品質管理", value: qualityScore, setter: setQualityScore },
    { label: "工程管理", value: scheduleScore, setter: setScheduleScore },
    { label: "協調性", value: cooperationScore, setter: setCooperationScore },
  ];

  const overallPreview = (() => {
    const scores = [safetyScore, qualityScore, scheduleScore, cooperationScore].filter(
      (s) => s != null
    ) as number[];
    return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
  })();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">評価を登録</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              案件ID <span className="text-red-500">*</span>
            </label>
            <input
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="案件IDを入力"
            />
            <p className="text-xs text-gray-400 mt-1">URLの /projects/[id] から確認できます</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">評価期間（開始）</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">評価期間（終了）</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          {/* Score inputs */}
          <div className="space-y-3 bg-gray-50 rounded-lg p-4">
            {scoreCategories.map(({ label, value, setter }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 w-24">{label}</span>
                <StarRating value={value} onChange={setter} />
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">総合評価</span>
              <span className={cn(
                "text-xl font-bold",
                overallPreview == null ? "text-gray-400"
                : Number(overallPreview) >= 4 ? "text-green-600"
                : Number(overallPreview) >= 3 ? "text-blue-600"
                : "text-amber-600"
              )}>
                {overallPreview ?? "-"} / 5
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">コメント</label>
            <textarea
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">評価者</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={evaluatedBy}
              onChange={(e) => setEvaluatedBy(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              登録
            </button>
          </div>
          {mutation.error && (
            <p className="text-red-600 text-sm">{String((mutation.error as Error).message)}</p>
          )}
        </form>
      </div>
    </div>
  );
}

// ---------- Main Page ----------

export default function EvaluationsPage() {
  const { id: subId } = useParams<{ id: string }>();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: sub } = useQuery({
    queryKey: ["subcontractor", subId],
    queryFn: () => apiFetch<Subcontractor>(`/api/subcontractors/${subId}`, { token }),
    enabled: !!token && !!subId,
  });

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["evaluations", subId],
    queryFn: () =>
      apiFetch<Evaluation[]>(`/api/subcontractors/${subId}/evaluations`, { token }),
    enabled: !!token && !!subId,
  });

  const { data: avg } = useQuery({
    queryKey: ["evaluations-avg", subId],
    queryFn: () =>
      apiFetch<EvaluationAverage>(`/api/subcontractors/${subId}/evaluations/average`, { token }),
    enabled: !!token && !!subId,
  });

  const deleteMutation = useMutation({
    mutationFn: (evalId: string) =>
      apiFetch(`/api/subcontractors/${subId}/evaluations/${evalId}`, {
        method: "DELETE", token,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evaluations", subId] });
      qc.invalidateQueries({ queryKey: ["evaluations-avg", subId] });
    },
  });

  const scoreLabel = (v: number | null) => {
    if (v == null) return "-";
    if (v >= 4.5) return "優秀";
    if (v >= 3.5) return "良好";
    if (v >= 2.5) return "普通";
    return "要改善";
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">協力業者評価</h1>
            {sub && <p className="text-sm text-gray-500">{sub.company_name}</p>}
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          評価を追加
        </button>
      </div>

      {/* Average scores */}
      {avg && avg.evaluation_count > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-500" />
              平均評価スコア（{avg.evaluation_count}件）
            </h2>
            <div className="text-right">
              <span className={cn(
                "text-3xl font-bold",
                (avg.overall_avg ?? 0) >= 4 ? "text-green-600"
                : (avg.overall_avg ?? 0) >= 3 ? "text-blue-600"
                : "text-amber-600"
              )}>
                {avg.overall_avg?.toFixed(1) ?? "-"}
              </span>
              <span className="text-gray-400 text-sm">/5</span>
              <p className="text-xs text-gray-500 mt-0.5">{scoreLabel(avg.overall_avg)}</p>
            </div>
          </div>
          <div className="space-y-3">
            <ScoreBar label="安全管理" value={avg.safety_avg} />
            <ScoreBar label="品質管理" value={avg.quality_avg} />
            <ScoreBar label="工程管理" value={avg.schedule_avg} />
            <ScoreBar label="協調性" value={avg.cooperation_avg} />
          </div>
        </div>
      )}

      {/* Evaluations list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>評価はまだ登録されていません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {evaluations.map((ev) => (
            <div
              key={ev.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="p-4 flex items-start gap-3">
                {/* Overall score badge */}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-bold",
                  (ev.overall_score ?? 0) >= 4 ? "bg-green-100 text-green-700"
                  : (ev.overall_score ?? 0) >= 3 ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
                )}>
                  <span className="text-lg leading-none">{ev.overall_score?.toFixed(1) ?? "-"}</span>
                  <span className="text-[10px]">/ 5</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {ev.evaluation_period_start && (
                      <span className="text-sm text-gray-600">
                        {formatDate(ev.evaluation_period_start)} 〜 {formatDate(ev.evaluation_period_end)}
                      </span>
                    )}
                    {ev.evaluated_by && (
                      <span className="text-xs text-gray-400">by {ev.evaluated_by}</span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1">
                    {[
                      { label: "安全", value: ev.safety_score },
                      { label: "品質", value: ev.quality_score },
                      { label: "工程", value: ev.schedule_score },
                      { label: "協調", value: ev.cooperation_score },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <StarRating value={value} disabled />
                        <p className="text-[10px] text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    {expandedId === ev.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("この評価を削除しますか？")) deleteMutation.mutate(ev.id);
                    }}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedId === ev.id && ev.comments && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <p className="text-xs font-medium text-gray-500 mb-1">コメント</p>
                  <p className="text-sm text-gray-700">{ev.comments}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <EvaluationForm
          subId={subId}
          token={token!}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
