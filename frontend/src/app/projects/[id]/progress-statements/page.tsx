"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import { API_BASE } from "@/lib/api-base";
import {
  ArrowLeft,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  Calendar,
  AlertCircle,
  ChevronRight,
  Download,
  RefreshCw,
} from "lucide-react";

// ---------- Types ----------

interface ProgressStatementSummary {
  id: string;
  tenant_id: string;
  project_id: string;
  estimate_id: string | null;
  year: number;
  month: number;
  period_label: string | null;
  title: string | null;
  version: string;
  status: string;
  total_progress_amount: number;
  finalized_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProgressEntryDto {
  id: string;
  row_id: string;
  statement_id: string;
  year: number;
  month: number;
  progress_qty: string;
  progress_amount: number;
  progress_rate: number;
  created_at: string | null;
  updated_at: string | null;
}

interface ProgressRowDto {
  id: string;
  tenant_id: string;
  statement_id: string;
  source_item_id: string | null;
  source_section_id: string | null;
  name: string;
  specification: string | null;
  contract_qty: string;
  contract_unit: string | null;
  contract_unit_price: number;
  contract_amount: number;
  cumulative_qty: string;
  cumulative_amount: number;
  sort_order: number;
  entries: ProgressEntryDto[];
}

interface ProgressStatementDetail extends ProgressStatementSummary {
  rows: ProgressRowDto[];
}

interface EstimateSummary {
  id: string;
  estimate_number: string;
  project_name: string;
  customer_name: string | null;
  total: number;
  status: string;
}

// ---------- Helpers ----------

function yen(n: number | null | undefined): string {
  if (n == null) return "¥0";
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

function pct(n: number | null | undefined): string {
  if (n == null) return "0.0%";
  return `${(Number(n) * 100).toFixed(1)}%`;
}

function statusBadge(status: string) {
  if (status === "finalized") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-900 text-white">
        <Lock className="w-3 h-3" /> 確定
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
      下書き
    </span>
  );
}

// ---------- Main Page ----------

export default function ProgressStatementsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const psId = searchParams.get("ps");
  const { token } = useAuth();

  if (psId) {
    return <DetailView projectId={projectId} psId={psId} token={token} />;
  }
  return <ListView projectId={projectId} token={token} router={router} />;
}

// ---------- List View ----------

function ListView({
  projectId,
  token,
  router,
}: {
  projectId: string;
  token: string | null;
  router: ReturnType<typeof useRouter>;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    estimate_id: "",
    generate_from_estimate: true,
  });

  const {
    data: statements = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ProgressStatementSummary[]>({
    queryKey: ["progress-statements", projectId],
    queryFn: () =>
      apiFetch(`/api/projects/${projectId}/progress-statements`, { token: token! }),
    enabled: !!token,
  });

  const { data: estimates = [] } = useQuery<EstimateSummary[]>({
    queryKey: ["estimates-for-progress"],
    queryFn: () => apiFetch(`/api/estimates`, { token: token! }),
    enabled: !!token && showForm,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<ProgressStatementSummary>(
        `/api/projects/${projectId}/progress-statements`,
        {
          token: token!,
          method: "POST",
          body: JSON.stringify(body),
        }
      ),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["progress-statements", projectId] });
      setShowForm(false);
      router.push(`/projects/${projectId}/progress-statements?ps=${created.id}`);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      year: Number(form.year),
      month: Number(form.month),
      generate_from_estimate: form.generate_from_estimate,
    };
    if (form.estimate_id) body.estimate_id = form.estimate_id;
    createMutation.mutate(body);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            案件詳細へ戻る
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">出来高調書</h1>
            <p className="text-sm text-gray-500 mt-1">
              月次 × 種別マトリクスで出来高を集計・確定します。
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            aria-label="新規調書作成"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm"
          >
            <h2 className="font-semibold text-gray-900 mb-4">新規出来高調書</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  対象年
                </label>
                <input
                  type="number"
                  min={2000}
                  max={2999}
                  value={form.year}
                  onChange={(e) =>
                    setForm({ ...form, year: Number(e.target.value) })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  対象月
                </label>
                <select
                  value={form.month}
                  onChange={(e) =>
                    setForm({ ...form, month: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}月
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  見積 (明細自動生成)
                </label>
                <select
                  value={form.estimate_id}
                  onChange={(e) =>
                    setForm({ ...form, estimate_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                >
                  <option value="">選択しない (空の調書)</option>
                  {estimates.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.estimate_number} - {est.project_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input
                id="generate_from_estimate"
                type="checkbox"
                checked={form.generate_from_estimate}
                onChange={(e) =>
                  setForm({
                    ...form,
                    generate_from_estimate: e.target.checked,
                  })
                }
                disabled={!form.estimate_id}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <label
                htmlFor="generate_from_estimate"
                className="text-sm text-gray-700"
              >
                見積明細から行を自動生成する
              </label>
            </div>
            {createMutation.isError && (
              <p
                className="mt-3 text-sm text-red-600 flex items-center gap-1"
                role="alert"
              >
                <AlertCircle className="w-4 h-4" />
                {(createMutation.error as Error).message}
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? "作成中..." : "作成"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : isError ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
            <p className="text-gray-700 mb-3">データの取得に失敗しました</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              再試行
            </button>
          </div>
        ) : statements.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-700 font-medium mb-1">
              まだ出来高調書がありません
            </p>
            <p className="text-sm text-gray-500 mb-4">
              「新規作成」から月次の出来高調書を作成してください。
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新規作成
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    対象月
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    版
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    当月出来高合計
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    状態
                  </th>
                  <th className="px-5 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statements.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() =>
                      router.push(
                        `/projects/${projectId}/progress-statements?ps=${s.id}`
                      )
                    }
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900">
                        {s.period_label || `${s.year}年${s.month}月`}
                      </div>
                      {s.title && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {s.title}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {s.version}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-900">
                      {yen(s.total_progress_amount)}
                    </td>
                    <td className="px-5 py-4">{statusBadge(s.status)}</td>
                    <td className="px-5 py-4 text-right">
                      <ChevronRight className="w-4 h-4 text-gray-400 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Detail View ----------

function DetailView({
  projectId,
  psId,
  token,
}: {
  projectId: string;
  psId: string;
  token: string | null;
}) {
  const queryClient = useQueryClient();
  const [draftEntries, setDraftEntries] = useState<
    Record<string, { qty: string; rate: string }>
  >({});

  const {
    data: detail,
    isLoading,
    isError,
    refetch,
  } = useQuery<ProgressStatementDetail>({
    queryKey: ["progress-statement", psId],
    queryFn: () =>
      apiFetch(`/api/progress-statements/${psId}`, { token: token! }),
    enabled: !!token,
  });

  const updateEntryMutation = useMutation({
    mutationFn: (vars: {
      rowId: string;
      year: number;
      month: number;
      progress_qty: number;
      progress_rate?: number | null;
    }) =>
      apiFetch(`/api/progress-rows/${vars.rowId}/entry`, {
        token: token!,
        method: "PUT",
        body: JSON.stringify({
          year: vars.year,
          month: vars.month,
          progress_qty: vars.progress_qty,
          progress_rate: vars.progress_rate,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-statement", psId] });
      queryClient.invalidateQueries({
        queryKey: ["progress-statements", projectId],
      });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/progress-statements/${psId}/finalize`, {
        token: token!,
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-statement", psId] });
      queryClient.invalidateQueries({
        queryKey: ["progress-statements", projectId],
      });
    },
  });

  const isFinalized = detail?.status === "finalized";

  const handleSaveRow = (row: ProgressRowDto) => {
    if (!detail) return;
    const draft = draftEntries[row.id];
    if (!draft) return;
    const qty = Number(draft.qty) || 0;
    const rate = draft.rate.trim() === "" ? null : Number(draft.rate) / 100;
    updateEntryMutation.mutate({
      rowId: row.id,
      year: detail.year,
      month: detail.month,
      progress_qty: qty,
      progress_rate: rate,
    });
  };

  // Get current month entry for a row (useMemo は React Compiler 互換のため使わない)
  const currentEntryFor = (row: ProgressRowDto): ProgressEntryDto | null => {
    if (!detail) return null;
    return (
      row.entries.find(
        (e) => e.year === detail.year && e.month === detail.month
      ) || null
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href={`/projects/${projectId}/progress-statements`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            一覧へ戻る
          </Link>
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
            <p className="text-gray-700 mb-3">データの取得に失敗しました</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalContract = detail.rows.reduce(
    (sum, r) => sum + (r.contract_amount || 0),
    0
  );
  const totalCumulative = detail.rows.reduce(
    (sum, r) => sum + (r.cumulative_amount || 0),
    0
  );
  const overallRate =
    totalContract > 0 ? totalCumulative / totalContract : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link
            href={`/projects/${projectId}/progress-statements`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            出来高調書一覧へ戻る
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {detail.period_label || `${detail.year}年${detail.month}月`}
              </h1>
              {statusBadge(detail.status)}
            </div>
            {detail.title && (
              <p className="text-sm text-gray-500 mt-1">{detail.title}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              版: {detail.version}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                window.open(
                  `${API_BASE}/api/progress-statements/${detail.id}/export.xlsx`
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              aria-label="Excel出力"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel出力
            </button>
            {!isFinalized && (
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "この調書を確定します。確定後は編集できません。よろしいですか?"
                    )
                  ) {
                    finalizeMutation.mutate();
                  }
                }}
                disabled={finalizeMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                aria-label="調書を確定する"
              >
                <CheckCircle2 className="w-4 h-4" />
                {finalizeMutation.isPending ? "確定中..." : "確定"}
              </button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-500 mb-1">契約金額合計</div>
            <div className="text-2xl font-bold text-gray-900">
              {yen(totalContract)}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-500 mb-1">累計出来高</div>
            <div className="text-2xl font-bold text-gray-900">
              {yen(totalCumulative)}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs text-gray-500 mb-1">当月出来高合計</div>
            <div className="text-2xl font-bold text-blue-600">
              {yen(detail.total_progress_amount)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              全体進捗率: {pct(overallRate)}
            </div>
          </div>
        </div>

        {/* Finalized notice */}
        {isFinalized && (
          <div className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 text-sm text-gray-700">
            <Lock className="w-4 h-4 text-gray-600" />
            この調書は確定済みです (
            {detail.finalized_at
              ? new Date(detail.finalized_at).toLocaleString("ja-JP")
              : ""}
            )。編集できません。
          </div>
        )}

        {finalizeMutation.isError && (
          <div
            className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 text-sm text-red-700"
            role="alert"
          >
            <AlertCircle className="w-4 h-4" />
            確定に失敗: {(finalizeMutation.error as Error).message}
          </div>
        )}

        {/* Rows */}
        {detail.rows.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-700 font-medium mb-1">
              まだ明細行がありません
            </p>
            <p className="text-sm text-gray-500">
              見積から生成するか、Excel出力後に明細を追加してください。
            </p>
            <button
              onClick={() =>
                window.open(
                  `${API_BASE}/api/progress-statements/${detail.id}/export.xlsx`
                )
              }
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              テンプレートExcel
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[180px]">
                      種別 / 仕様
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      契約数量
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      単価
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      契約金額
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-100">
                      当月数量
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-100">
                      当月金額
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-100">
                      進捗率(%)
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      累計数量
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      累計金額
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      進捗%
                    </th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detail.rows.map((row) => {
                    const currentEntry = currentEntryFor(row);
                    const draft = draftEntries[row.id];
                    const qtyValue =
                      draft?.qty ??
                      (currentEntry ? currentEntry.progress_qty : "");
                    const rateValue =
                      draft?.rate ??
                      (currentEntry
                        ? (currentEntry.progress_rate * 100).toFixed(2)
                        : "");
                    const currentAmount = currentEntry?.progress_amount ?? 0;
                    const overallRowRate =
                      row.contract_amount > 0
                        ? (row.cumulative_amount / row.contract_amount) * 100
                        : 0;
                    const isDirty =
                      draft !== undefined &&
                      (draft.qty !==
                        (currentEntry ? currentEntry.progress_qty : "") ||
                        draft.rate !==
                          (currentEntry
                            ? (currentEntry.progress_rate * 100).toFixed(2)
                            : ""));

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {row.name}
                          </div>
                          {row.specification && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {row.specification}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-700 tabular-nums">
                          {row.contract_qty}
                          {row.contract_unit && (
                            <span className="text-xs text-gray-400 ml-1">
                              {row.contract_unit}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-700 tabular-nums">
                          {yen(row.contract_unit_price)}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-900 font-medium tabular-nums">
                          {yen(row.contract_amount)}
                        </td>
                        <td className="px-3 py-3 text-right bg-gray-50">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={qtyValue}
                            onChange={(e) =>
                              setDraftEntries((prev) => ({
                                ...prev,
                                [row.id]: {
                                  qty: e.target.value,
                                  rate:
                                    prev[row.id]?.rate ??
                                    (currentEntry
                                      ? (
                                          currentEntry.progress_rate * 100
                                        ).toFixed(2)
                                      : ""),
                                },
                              }))
                            }
                            disabled={isFinalized}
                            aria-label={`${row.name} の当月数量`}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-400 tabular-nums"
                          />
                        </td>
                        <td className="px-3 py-3 text-right bg-gray-50 text-gray-700 tabular-nums">
                          {yen(currentAmount)}
                        </td>
                        <td className="px-3 py-3 text-right bg-gray-50">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={100}
                            value={rateValue}
                            onChange={(e) =>
                              setDraftEntries((prev) => ({
                                ...prev,
                                [row.id]: {
                                  qty:
                                    prev[row.id]?.qty ??
                                    (currentEntry
                                      ? currentEntry.progress_qty
                                      : ""),
                                  rate: e.target.value,
                                },
                              }))
                            }
                            disabled={isFinalized}
                            aria-label={`${row.name} の当月進捗率`}
                            placeholder="auto"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none disabled:bg-gray-100 disabled:text-gray-400 tabular-nums"
                          />
                        </td>
                        <td className="px-3 py-3 text-right text-gray-700 tabular-nums">
                          {row.cumulative_qty}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-900 font-medium tabular-nums">
                          {yen(row.cumulative_amount)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              overallRowRate >= 100
                                ? "text-emerald-600"
                                : overallRowRate >= 50
                                ? "text-blue-600"
                                : "text-gray-700"
                            }`}
                          >
                            {overallRowRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {!isFinalized && (
                            <button
                              onClick={() => handleSaveRow(row)}
                              disabled={
                                !isDirty || updateEntryMutation.isPending
                              }
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                isDirty
                                  ? "bg-gray-900 text-white hover:bg-gray-700"
                                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                              }`}
                              aria-label={`${row.name} の入力を保存`}
                            >
                              保存
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-900">合計</td>
                    <td className="px-3 py-3"></td>
                    <td className="px-3 py-3"></td>
                    <td className="px-3 py-3 text-right font-bold text-gray-900 tabular-nums">
                      {yen(totalContract)}
                    </td>
                    <td className="px-3 py-3 bg-gray-100"></td>
                    <td className="px-3 py-3 text-right bg-gray-100 font-bold text-blue-600 tabular-nums">
                      {yen(detail.total_progress_amount)}
                    </td>
                    <td className="px-3 py-3 bg-gray-100"></td>
                    <td className="px-3 py-3"></td>
                    <td className="px-3 py-3 text-right font-bold text-gray-900 tabular-nums">
                      {yen(totalCumulative)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-gray-900 tabular-nums">
                      {(overallRate * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {updateEntryMutation.isError && (
          <div
            className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-700"
            role="alert"
          >
            <AlertCircle className="w-4 h-4" />
            保存に失敗: {(updateEntryMutation.error as Error).message}
          </div>
        )}
      </div>
    </div>
  );
}
