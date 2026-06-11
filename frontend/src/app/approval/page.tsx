"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  FileText,
  ClipboardList,
  Loader2,
  Check,
  Calculator,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";

interface ApprovalItem {
  id: string;
  type: "daily_report" | "report";
  title: string;
  project_id: string;
  project_name: string;
  date: string;
  submitted_by: string;
}

interface EstimateApproval {
  id: string;
  estimate_id: string;
  estimate_title?: string;
  estimate_number?: string;
  project_id?: string;
  project_name?: string;
  total_amount?: number;
  status: "pending" | "approved" | "rejected";
  requested_by?: string;
  requested_at?: string;
  comment?: string;
}

type TabKey = "queue" | "estimate";

const TABS: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: "queue", label: "承認キュー", icon: ClipboardList },
  { key: "estimate", label: "見積承認", icon: Calculator },
];

export default function ApprovalQueuePage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("queue");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            ホームへ戻る
          </Link>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-xl">
              <ClipboardList className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">承認管理</h1>
              <p className="text-gray-300 mt-1">
                日報・報告書・見積の承認待ち項目を一括管理
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6"
          role="tablist"
          aria-label="承認タブ"
        >
          <div className="flex border-b border-gray-200">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`tabpanel-${t.key}`}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "text-gray-900 border-b-2 border-gray-900 -mb-px"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {!token ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            ログインが必要です
          </div>
        ) : activeTab === "queue" ? (
          <div id="tabpanel-queue" role="tabpanel">
            <ApprovalQueueTab />
          </div>
        ) : (
          <div id="tabpanel-estimate" role="tabpanel">
            <EstimateApprovalTab />
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Approval Queue Tab ----------------------------- */

function ApprovalQueueTab() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch } = useQuery<{
    total: number;
    items: ApprovalItem[];
  }>({
    queryKey: ["approval-queue"],
    queryFn: () => apiFetch("/api/approval-queue", { token: token! }),
    enabled: !!token,
  });
  const items: ApprovalItem[] = data?.items ?? [];

  const approveMutation = useMutation({
    mutationFn: (item: ApprovalItem) => {
      if (item.type === "daily_report") {
        return apiFetch(
          `/api/projects/${item.project_id}/daily-reports/${item.id}/approve`,
          { method: "PUT", token: token! }
        );
      }
      return apiFetch(
        `/api/projects/${item.project_id}/reports/${item.id}/review?action=approve`,
        { method: "PUT", token: token! }
      );
    },
    onSuccess: (_, item) => {
      setDismissedIds((prev) => new Set(prev).add(item.id));
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      }, 400);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (item: ApprovalItem) => {
      if (item.type === "daily_report") {
        return apiFetch(
          `/api/projects/${item.project_id}/daily-reports/${item.id}`,
          {
            method: "PUT",
            token: token!,
            body: JSON.stringify({ status: "rejected" }),
          }
        );
      }
      return apiFetch(
        `/api/projects/${item.project_id}/reports/${item.id}/review?action=reject`,
        { method: "PUT", token: token! }
      );
    },
    onSuccess: (_, item) => {
      setDismissedIds((prev) => new Set(prev).add(item.id));
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      }, 400);
    },
  });

  const visibleItems = items.filter((i) => !dismissedIds.has(i.id));

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" aria-label="読み込み中" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-red-600" />
        </div>
        <p className="text-gray-700 mb-4">データの取得に失敗しました</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <>
      {visibleItems.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-700 mb-1">
            まだ承認待ちのアイテムがありません
          </h2>
          <p className="text-gray-500 text-sm">
            日報・報告書が提出されると、ここに表示されます
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visibleItems.map((item) => {
          const isDismissed = dismissedIds.has(item.id);
          const isProcessing =
            (approveMutation.isPending &&
              approveMutation.variables?.id === item.id) ||
            (rejectMutation.isPending &&
              rejectMutation.variables?.id === item.id);

          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${
                isDismissed
                  ? "opacity-0 scale-95 -translate-x-4"
                  : "opacity-100"
              }`}
            >
              <div className="flex items-center gap-4 px-6 py-5">
                <div
                  className={`p-3 rounded-xl flex-shrink-0 ${
                    item.type === "daily_report" ? "bg-blue-50" : "bg-amber-50"
                  }`}
                >
                  {item.type === "daily_report" ? (
                    <FileText className="w-6 h-6 text-blue-600" />
                  ) : (
                    <ClipboardList className="w-6 h-6 text-amber-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        item.type === "daily_report"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.type === "daily_report" ? "日報" : "報告書"}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 truncate">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">
                      {item.project_name}
                    </span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(item.date)}
                    </span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">
                      {item.submitted_by}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => rejectMutation.mutate(item)}
                    disabled={isProcessing}
                    aria-label={`${item.title} を却下`}
                    className="flex items-center gap-1.5 px-4 py-2.5 border border-red-600 text-red-600 font-bold text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 transition-all"
                  >
                    {rejectMutation.isPending &&
                    rejectMutation.variables?.id === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    却下
                  </button>
                  <button
                    type="button"
                    onClick={() => approveMutation.mutate(item)}
                    disabled={isProcessing}
                    aria-label={`${item.title} を承認`}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 shadow-sm disabled:opacity-50 transition-all"
                  >
                    {approveMutation.isPending &&
                    approveMutation.variables?.id === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    承認
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ----------------------------- Estimate Approval Tab ----------------------------- */

function EstimateApprovalTab() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery<
    EstimateApproval[] | { items?: EstimateApproval[] }
  >({
    queryKey: ["estimate-approvals", "pending"],
    queryFn: () =>
      apiFetch("/api/estimate-approvals?status=pending", { token: token! }),
    enabled: !!token,
  });

  const list: EstimateApproval[] = Array.isArray(data)
    ? data
    : data?.items ?? [];

  const approveMutation = useMutation({
    mutationFn: (a: EstimateApproval) =>
      apiFetch(`/api/estimate-approvals/${a.id}/approve`, {
        method: "POST",
        token: token!,
        body: JSON.stringify({ comment: comments[a.id] ?? "" }),
      }),
    onSuccess: (_, a) => {
      setComments((prev) => {
        const { [a.id]: _omit, ...rest } = prev;
        return rest;
      });
      setErrorMap((prev) => {
        const { [a.id]: _omit, ...rest } = prev;
        return rest;
      });
      queryClient.invalidateQueries({ queryKey: ["estimate-approvals"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (a: EstimateApproval) => {
      const c = (comments[a.id] ?? "").trim();
      if (!c) {
        throw new Error("差戻し時はコメント必須です");
      }
      return apiFetch(`/api/estimate-approvals/${a.id}/reject`, {
        method: "POST",
        token: token!,
        body: JSON.stringify({ comment: c }),
      });
    },
    onSuccess: (_, a) => {
      setComments((prev) => {
        const { [a.id]: _omit, ...rest } = prev;
        return rest;
      });
      setErrorMap((prev) => {
        const { [a.id]: _omit, ...rest } = prev;
        return rest;
      });
      queryClient.invalidateQueries({ queryKey: ["estimate-approvals"] });
    },
    onError: (err, a) => {
      setErrorMap((prev) => ({
        ...prev,
        [a.id]: err instanceof Error ? err.message : "差戻しに失敗しました",
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" aria-label="読み込み中" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-red-600" />
        </div>
        <p className="text-gray-700 mb-4">データの取得に失敗しました</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700"
        >
          再試行
        </button>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-700 mb-1">
          まだ承認待ちの見積がありません
        </h2>
        <p className="text-gray-500 text-sm mb-4">
          見積が承認申請されると、ここに表示されます
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700"
        >
          案件一覧へ
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((a) => {
        const comment = comments[a.id] ?? "";
        const err = errorMap[a.id];
        const isProcessing =
          (approveMutation.isPending && approveMutation.variables?.id === a.id) ||
          (rejectMutation.isPending && rejectMutation.variables?.id === a.id);

        const statusColor =
          a.status === "approved"
            ? "bg-emerald-100 text-emerald-700"
            : a.status === "rejected"
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700";
        const statusLabel =
          a.status === "approved"
            ? "承認済"
            : a.status === "rejected"
              ? "差戻し"
              : "承認待ち";

        return (
          <div
            key={a.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl flex-shrink-0 bg-gray-100">
                  <Calculator className="w-6 h-6 text-gray-700" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                    {a.estimate_number && (
                      <span className="text-xs font-mono text-gray-500">
                        {a.estimate_number}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 truncate">
                    {a.estimate_title ?? `見積 ${a.estimate_id}`}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {a.project_name && (
                      <>
                        <span className="text-xs text-gray-500">
                          {a.project_name}
                        </span>
                        <span className="text-xs text-gray-400">|</span>
                      </>
                    )}
                    {typeof a.total_amount === "number" && (
                      <>
                        <span className="text-xs text-gray-700 font-semibold">
                          ¥{a.total_amount.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400">|</span>
                      </>
                    )}
                    {a.requested_by && (
                      <span className="text-xs text-gray-500">
                        申請者: {a.requested_by}
                      </span>
                    )}
                    {a.requested_at && (
                      <>
                        <span className="text-xs text-gray-400">|</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(a.requested_at)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor={`comment-${a.id}`}
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  コメント
                  <span className="text-gray-400 font-normal ml-2">
                    (差戻し時は必須)
                  </span>
                </label>
                <textarea
                  id={`comment-${a.id}`}
                  value={comment}
                  onChange={(e) =>
                    setComments((prev) => ({
                      ...prev,
                      [a.id]: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="承認/差戻しの理由を入力..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                {err && (
                  <p className="text-xs text-red-600 mt-1" role="alert">
                    {err}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => rejectMutation.mutate(a)}
                  disabled={isProcessing || a.status !== "pending"}
                  aria-label="見積を差戻し"
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-red-600 text-red-600 font-bold text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 transition-all"
                >
                  {rejectMutation.isPending &&
                  rejectMutation.variables?.id === a.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  差戻し
                </button>
                <button
                  type="button"
                  onClick={() => approveMutation.mutate(a)}
                  disabled={isProcessing || a.status !== "pending"}
                  aria-label="見積を承認"
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 shadow-sm disabled:opacity-50 transition-all"
                >
                  {approveMutation.isPending &&
                  approveMutation.variables?.id === a.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  承認
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
