"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  FileText,
  ClipboardList,
  Loader2,
  Inbox,
  Check,
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

export default function ApprovalQueuePage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const { data: items, isLoading } = useQuery<ApprovalItem[]>({
    queryKey: ["approval-queue"],
    queryFn: () => apiFetch("/api/approval-queue", { token: token! }),
    enabled: !!token,
  });

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
          `/api/projects/${item.project_id}/daily-reports/${item.id}/reject`,
          { method: "PUT", token: token! }
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

  const visibleItems = items?.filter((i) => !dismissedIds.has(i.id)) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <ClipboardList className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">承認キュー</h1>
              {visibleItems.length > 0 && (
                <span className="bg-white/25 text-white text-sm font-bold px-3 py-1 rounded-full">
                  {visibleItems.length}件
                </span>
              )}
            </div>
            <p className="text-indigo-100 mt-1">
              承認待ちのアイテムを確認・処理
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-4 pb-8">
        {/* Empty State */}
        {visibleItems.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">
              承認待ちのアイテムはありません
            </h2>
            <p className="text-gray-400">
              新しいアイテムが提出されると、ここに表示されます
            </p>
          </div>
        )}

        {/* Approval Items */}
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
                className={`bg-white rounded-2xl shadow-md overflow-hidden transition-all duration-300 ${
                  isDismissed
                    ? "opacity-0 scale-95 -translate-x-4"
                    : "opacity-100"
                }`}
              >
                <div className="flex items-center gap-4 px-6 py-5">
                  {/* Type Icon */}
                  <div
                    className={`p-3 rounded-xl flex-shrink-0 ${
                      item.type === "daily_report"
                        ? "bg-blue-50"
                        : "bg-amber-50"
                    }`}
                  >
                    {item.type === "daily_report" ? (
                      <FileText className="w-6 h-6 text-blue-500" />
                    ) : (
                      <ClipboardList className="w-6 h-6 text-amber-500" />
                    )}
                  </div>

                  {/* Content */}
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
                      <span className="text-xs text-gray-400">
                        {item.project_name}
                      </span>
                      <span className="text-xs text-gray-300">|</span>
                      <span className="text-xs text-gray-400">
                        {formatDate(item.date)}
                      </span>
                      <span className="text-xs text-gray-300">|</span>
                      <span className="text-xs text-gray-400">
                        {item.submitted_by}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => rejectMutation.mutate(item)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-all"
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
                      onClick={() => approveMutation.mutate(item)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm rounded-xl hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
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
      </div>
    </div>
  );
}
