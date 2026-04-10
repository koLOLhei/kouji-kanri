"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Copy,
  Check,
  Mail,
  Bell,
  Send,
  Eye,
  ToggleLeft,
  ToggleRight,
  Plus,
  X,
  ChevronDown,
  ExternalLink,
  Settings,
} from "lucide-react";

interface PortalConfig {
  enabled: boolean;
  portal_url: string | null;
  show_progress: boolean;
  show_photos: boolean;
  show_daily_reports: boolean;
  show_inspections: boolean;
  show_documents: boolean;
  show_costs: boolean;
  auto_email_enabled: boolean;
  email_recipients: string[];
  email_trigger: string;
  welcome_message: string;
}

interface NotificationLog {
  id: string;
  sent_at: string;
  subject: string;
  status: string;
}

const EMAIL_TRIGGERS = [
  { value: "daily_report", label: "日報提出時" },
  { value: "weekly", label: "週次" },
  { value: "phase_complete", label: "工程完了時" },
];

const SCOPE_OPTIONS = [
  { key: "show_progress", label: "工事進捗" },
  { key: "show_photos", label: "写真" },
  { key: "show_daily_reports", label: "日報" },
  { key: "show_inspections", label: "検査記録" },
  { key: "show_documents", label: "書類" },
  { key: "show_costs", label: "コスト情報" },
] as const;

export default function ClientPortalConfigPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  const { data: config, isLoading } = useQuery<PortalConfig>({
    queryKey: ["client-portal-config", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/client-portal/config`, { token: token! }),
    enabled: !!token,
  });

  const { data: logs = [] } = useQuery<NotificationLog[]>({
    queryKey: ["client-portal-logs", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/client-portal/notification-logs`, {
        token: token!,
      }),
    enabled: !!token && !!config?.enabled,
  });

  const updateMutation = useMutation({
    mutationFn: (body: Partial<PortalConfig>) =>
      apiFetch(`/api/projects/${id}/client-portal/config`, {
        token: token!,
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["client-portal-config", id],
      });
    },
  });

  const enableMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/projects/${id}/client-portal/config`, {
        token: token!,
        method: "POST",
        body: JSON.stringify({ enabled: true }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["client-portal-config", id],
      });
    },
  });

  const sendNowMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/projects/${id}/client-portal/send-now`, {
        token: token!,
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["client-portal-logs", id],
      });
    },
  });

  const handleCopyUrl = () => {
    if (config?.portal_url) {
      navigator.clipboard.writeText(config.portal_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleScope = (key: keyof PortalConfig) => {
    if (!config) return;
    updateMutation.mutate({ [key]: !config[key] });
  };

  const toggleEnabled = () => {
    if (!config) return;
    updateMutation.mutate({ enabled: !config.enabled });
  };

  const addEmail = () => {
    if (!config || !newEmail.trim()) return;
    const updated = [...config.email_recipients, newEmail.trim()];
    updateMutation.mutate({ email_recipients: updated });
    setNewEmail("");
  };

  const removeEmail = (email: string) => {
    if (!config) return;
    const updated = config.email_recipients.filter((e) => e !== email);
    updateMutation.mutate({ email_recipients: updated });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Not configured yet
  if (!config || !config.enabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${id}`}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6" /> 顧客ポータル設定
          </h1>
        </div>

        <div className="flex flex-col items-center justify-center bg-white border rounded-2xl p-16 shadow-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
            <Globe className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            顧客ポータルを有効化
          </h2>
          <p className="text-gray-500 text-center max-w-md mb-8">
            発注者・施主に工事の進捗状況を共有できるポータルページを作成します。
            URLを共有するだけで、認証なしで閲覧できます。
          </p>
          <button
            onClick={() => enableMutation.mutate()}
            disabled={enableMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
          >
            {enableMutation.isPending
              ? "有効化中..."
              : "ポータルを有効化する"}
          </button>
          {enableMutation.isError && (
            <p className="text-red-600 text-sm mt-4">
              {(enableMutation.error as Error).message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/projects/${id}`}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6" /> 顧客ポータル設定
        </h1>
        <button
          onClick={toggleEnabled}
          className="ml-auto flex items-center gap-2 text-sm"
        >
          {config.enabled ? (
            <>
              <ToggleRight className="w-8 h-8 text-green-500" />
              <span className="text-green-700 font-medium">有効</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-8 h-8 text-gray-400" />
              <span className="text-gray-500 font-medium">無効</span>
            </>
          )}
        </button>
      </div>

      {/* Portal URL */}
      {config.portal_url && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              ポータルURL
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white border border-blue-200 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-700 truncate">
              {config.portal_url}
            </div>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-2 bg-white border border-blue-200 text-blue-700 px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> コピー済
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> URLをコピー
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scope Settings */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-gray-500" /> 公開範囲設定
          </h2>
          <div className="space-y-3">
            {SCOPE_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <span className="text-gray-700">{opt.label}</span>
                <input
                  type="checkbox"
                  checked={!!config[opt.key]}
                  onChange={() => toggleScope(opt.key)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Email Notification Settings */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-gray-500" /> メール通知設定
          </h2>

          <div className="space-y-4">
            {/* Auto email toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <span className="text-gray-700">自動メール通知</span>
              <button
                onClick={() =>
                  updateMutation.mutate({
                    auto_email_enabled: !config.auto_email_enabled,
                  })
                }
              >
                {config.auto_email_enabled ? (
                  <ToggleRight className="w-8 h-8 text-green-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-gray-400" />
                )}
              </button>
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                送信先メールアドレス
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="example@company.co.jp"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEmail();
                    }
                  }}
                />
                <button
                  onClick={addEmail}
                  className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4" /> 追加
                </button>
              </div>
              <div className="space-y-1">
                {config.email_recipients.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-sm"
                  >
                    <span className="text-gray-700">{email}</span>
                    <button
                      onClick={() => removeEmail(email)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {config.email_recipients.length === 0 && (
                  <p className="text-gray-400 text-sm py-2">
                    送信先が未設定です
                  </p>
                )}
              </div>
            </div>

            {/* Trigger */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                送信タイミング
              </label>
              <div className="relative">
                <select
                  value={config.email_trigger}
                  onChange={(e) =>
                    updateMutation.mutate({ email_trigger: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {EMAIL_TRIGGERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-500" /> ウェルカムメッセージ
        </h2>
        <textarea
          value={config.welcome_message}
          onChange={(e) =>
            updateMutation.mutate({ welcome_message: e.target.value })
          }
          rows={4}
          placeholder="ポータルに表示するメッセージを入力してください..."
          className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Send Now + Notification Logs */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-500" /> 通知履歴
          </h2>
          <button
            onClick={() => sendNowMutation.mutate()}
            disabled={sendNowMutation.isPending}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-2.5 rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-sm transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sendNowMutation.isPending
              ? "送信中..."
              : "今すぐ進捗メールを送信"}
          </button>
        </div>

        {sendNowMutation.isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            メールを送信しました
          </div>
        )}
        {sendNowMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
            {(sendNowMutation.error as Error).message}
          </div>
        )}

        {logs.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">通知履歴がありません</p>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {formatDate(log.sent_at)}
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {log.subject}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    log.status === "sent"
                      ? "bg-green-100 text-green-700"
                      : log.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {log.status === "sent"
                    ? "送信済"
                    : log.status === "failed"
                      ? "失敗"
                      : log.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {updateMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {(updateMutation.error as Error).message}
        </div>
      )}
    </div>
  );
}
