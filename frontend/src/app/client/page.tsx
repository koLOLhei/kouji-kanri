"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate, formatAmount } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

// ─── Types ───

interface ProgressPayment {
  id: string;
  project_id: string;
  period_number: number;
  period_start: string;
  period_end: string;
  total_this_period: number | null;
  total_cumulative_amount: number | null;
  progress_rate: number | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

interface DesignChange {
  id: string;
  project_id: string;
  change_number: number;
  title: string;
  reason: string | null;
  change_type: string;
  status: string;
  difference_amount: number | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

// ─── Status helpers ───

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    submitted: { label: "承認待ち", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="w-3.5 h-3.5" /> },
    approved: { label: "承認済", cls: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    rejected: { label: "却下", cls: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3.5 h-3.5" /> },
    negotiating: { label: "協議中", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: <RefreshCw className="w-3.5 h-3.5" /> },
    draft: { label: "下書き", cls: "bg-gray-100 text-gray-600 border-gray-200", icon: <FileText className="w-3.5 h-3.5" /> },
  };
  const { label, cls, icon } = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600 border-gray-200", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

// ─── Reject Modal ───

function RejectModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">却下理由を入力</h3>
        <p className="text-sm text-gray-500 mb-4">却下する理由を具体的に記入してください。</p>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px] resize-none"
          placeholder="例：金額の根拠が不明確です。内訳を再度提出してください。"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "処理中..." : "却下する"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Card ───

function PaymentCard({
  payment,
  token,
  onAction,
}: {
  payment: ProgressPayment;
  token: string;
  onAction: () => void;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const approveMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/client-portal/progress-payments/${payment.id}/approve`, {
        method: "PUT",
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-payments"] });
      onAction();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      apiFetch(`/api/client-portal/progress-payments/${payment.id}/reject`, {
        method: "PUT",
        token,
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      setRejectTarget(null);
      queryClient.invalidateQueries({ queryKey: ["client-payments"] });
      onAction();
    },
  });

  const isPending = payment.status === "submitted";

  return (
    <>
      {rejectTarget && (
        <RejectModal
          onConfirm={(r) => rejectMutation.mutate(r)}
          onCancel={() => setRejectTarget(null)}
          loading={rejectMutation.isPending}
        />
      )}
      <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isPending ? "border-amber-200" : "border-gray-100"}`}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900 text-sm">
                  第{payment.period_number}回 出来高払い
                </span>
                <StatusBadge status={payment.status} />
              </div>
              <p className="text-xs text-gray-500">
                {formatDate(payment.period_start)} 〜 {formatDate(payment.period_end)}
              </p>
              {payment.total_this_period != null && (
                <p className="text-lg font-bold text-gray-900 mt-2">
                  {formatAmount(payment.total_this_period)}
                  {payment.progress_rate != null && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      進捗 {Math.round(payment.progress_rate)}%
                    </span>
                  )}
                </p>
              )}
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {payment.approved_by && (
            <p className="text-xs text-gray-500 mt-2 truncate">
              {payment.status === "rejected" ? "却下: " : "承認者: "}
              {payment.approved_by}
              {payment.approved_at && ` (${formatDate(payment.approved_at)})`}
            </p>
          )}

          {isPending && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <ThumbsUp className="w-4 h-4" />
                {approveMutation.isPending ? "処理中..." : "承認"}
              </button>
              <button
                onClick={() => setRejectTarget(payment.id)}
                disabled={rejectMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                <ThumbsDown className="w-4 h-4" />
                却下
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Design Change Card ───

function DesignChangeCard({
  change,
  token,
  onAction,
}: {
  change: DesignChange;
  token: string;
  onAction: () => void;
}) {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const approveMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/client-portal/design-changes/${change.id}/approve`, {
        method: "PUT",
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-changes"] });
      onAction();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      apiFetch(`/api/client-portal/design-changes/${change.id}/reject`, {
        method: "PUT",
        token,
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      setRejectTarget(null);
      queryClient.invalidateQueries({ queryKey: ["client-changes"] });
      onAction();
    },
  });

  const isPending = change.status === "submitted" || change.status === "negotiating";

  return (
    <>
      {rejectTarget && (
        <RejectModal
          onConfirm={(r) => rejectMutation.mutate(r)}
          onCancel={() => setRejectTarget(null)}
          loading={rejectMutation.isPending}
        />
      )}
      <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isPending ? "border-amber-200" : "border-gray-100"}`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">
                  第{change.change_number}号 {change.title}
                </span>
                <StatusBadge status={change.status} />
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {change.change_type}
                </span>
              </div>
              {change.reason && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{change.reason}</p>
              )}
              {change.difference_amount != null && (
                <p className={`text-sm font-semibold mt-2 ${change.difference_amount >= 0 ? "text-red-600" : "text-green-600"}`}>
                  増減額: {change.difference_amount >= 0 ? "+" : ""}{formatAmount(change.difference_amount)}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{formatDate(change.created_at)}</p>
            </div>
          </div>

          {change.approved_by && (
            <p className="text-xs text-gray-500 mt-2 truncate">
              {change.status === "rejected" ? "却下: " : "承認者: "}
              {change.approved_by}
            </p>
          )}

          {isPending && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <ThumbsUp className="w-4 h-4" />
                {approveMutation.isPending ? "処理中..." : "承認"}
              </button>
              <button
                onClick={() => setRejectTarget(change.id)}
                disabled={rejectMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                <ThumbsDown className="w-4 h-4" />
                却下
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Page ───

export default function ClientPortalPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<"payments" | "changes">("payments");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const paymentsQuery = useQuery<ProgressPayment[]>({
    queryKey: ["client-payments"],
    queryFn: () => apiFetch("/api/client-portal/progress-payments", { token }),
    enabled: !!token,
  });

  const changesQuery = useQuery<DesignChange[]>({
    queryKey: ["client-changes"],
    queryFn: () => apiFetch("/api/client-portal/design-changes", { token }),
    enabled: !!token,
  });

  const payments = paymentsQuery.data ?? [];
  const changes = changesQuery.data ?? [];

  const pendingPayments = payments.filter((p) => p.status === "submitted");
  const pendingChanges = changes.filter(
    (c) => c.status === "submitted" || c.status === "negotiating"
  );

  const handleAction = () => {
    setSuccessMsg("処理が完了しました");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const recentPayments = payments.filter((p) => p.status !== "submitted").slice(0, 5);
  const recentChanges = changes.filter((c) => c.status !== "submitted" && c.status !== "negotiating").slice(0, 5);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">発注者承認ポータル</h1>
        <p className="text-sm text-gray-500 mt-1">出来高払い・設計変更の承認・却下を行います</p>
      </div>

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Summary badges */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div
          className={`rounded-xl p-4 cursor-pointer transition-all border-2 ${tab === "payments" ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-white hover:border-gray-200"}`}
          onClick={() => setTab("payments")}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">出来高払い</span>
            {pendingPayments.length > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingPayments.length}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p>
          <p className="text-xs text-gray-500">承認待ち: {pendingPayments.length}件</p>
        </div>
        <div
          className={`rounded-xl p-4 cursor-pointer transition-all border-2 ${tab === "changes" ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-white hover:border-gray-200"}`}
          onClick={() => setTab("changes")}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">設計変更</span>
            {pendingChanges.length > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingChanges.length}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{changes.length}</p>
          <p className="text-xs text-gray-500">承認待ち: {pendingChanges.length}件</p>
        </div>
      </div>

      {/* Pending items */}
      {tab === "payments" && (
        <div className="space-y-4">
          {pendingPayments.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4" />
                承認待ち ({pendingPayments.length}件)
              </h2>
              <div className="space-y-3">
                {pendingPayments.map((p) => (
                  <PaymentCard key={p.id} payment={p} token={token!} onAction={handleAction} />
                ))}
              </div>
            </div>
          )}

          {recentPayments.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-600 mb-2 mt-4">最近の履歴</h2>
              <div className="space-y-2">
                {recentPayments.map((p) => (
                  <PaymentCard key={p.id} payment={p} token={token!} onAction={handleAction} />
                ))}
              </div>
            </div>
          )}

          {payments.length === 0 && !paymentsQuery.isLoading && (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">出来高払いデータがありません</p>
            </div>
          )}

          {paymentsQuery.isLoading && (
            <div className="text-center py-8 text-gray-400 text-sm">読み込み中...</div>
          )}
        </div>
      )}

      {tab === "changes" && (
        <div className="space-y-4">
          {pendingChanges.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4" />
                承認待ち ({pendingChanges.length}件)
              </h2>
              <div className="space-y-3">
                {pendingChanges.map((c) => (
                  <DesignChangeCard key={c.id} change={c} token={token!} onAction={handleAction} />
                ))}
              </div>
            </div>
          )}

          {recentChanges.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-600 mb-2 mt-4">最近の履歴</h2>
              <div className="space-y-2">
                {recentChanges.map((c) => (
                  <DesignChangeCard key={c.id} change={c} token={token!} onAction={handleAction} />
                ))}
              </div>
            </div>
          )}

          {changes.length === 0 && !changesQuery.isLoading && (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">設計変更データがありません</p>
            </div>
          )}

          {changesQuery.isLoading && (
            <div className="text-center py-8 text-gray-400 text-sm">読み込み中...</div>
          )}
        </div>
      )}
    </div>
  );
}
