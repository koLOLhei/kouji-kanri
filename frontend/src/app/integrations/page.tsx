"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  Copy,
  Check,
  Globe,
  Key,
  Link2,
  Loader2,
  Plus,
  Shield,
  Trash2,
  Webhook,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
}

interface ApiKeyCreateResult {
  id: string;
  name: string;
  key: string;
  prefix: string;
  scopes: string[];
}

const WEBHOOK_EVENTS = [
  { value: "daily_report.created", label: "日報作成" },
  { value: "inspection.completed", label: "検査完了" },
  { value: "phase.completed", label: "工程完了" },
  { value: "photo.uploaded", label: "写真アップロード" },
  { value: "document.generated", label: "書類生成" },
  { value: "cost.created", label: "原価登録" },
];

const API_SCOPES = [
  { value: "projects:read", label: "案件閲覧" },
  { value: "projects:write", label: "案件編集" },
  { value: "photos:read", label: "写真閲覧" },
  { value: "photos:write", label: "写真登録" },
  { value: "reports:read", label: "日報閲覧" },
  { value: "reports:write", label: "日報登録" },
  { value: "inspections:read", label: "検査閲覧" },
  { value: "documents:read", label: "書類閲覧" },
];

export default function IntegrationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Webhook state
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: [] as string[],
  });

  // API Key state
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [apiKeyForm, setApiKeyForm] = useState({
    name: "",
    scopes: [] as string[],
  });
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [icalCopied, setIcalCopied] = useState(false);

  // Queries
  const { data: webhooks = [], isLoading: webhooksLoading } = useQuery<
    WebhookConfig[]
  >({
    queryKey: ["webhooks"],
    queryFn: () => apiFetch("/api/integrations/webhooks", { token: token! }),
    enabled: !!token,
  });

  const { data: apiKeys = [], isLoading: apiKeysLoading } = useQuery<ApiKey[]>({
    queryKey: ["api-keys"],
    queryFn: () => apiFetch("/api/integrations/api-keys", { token: token! }),
    enabled: !!token,
  });

  // Webhook mutations
  const createWebhookMutation = useMutation({
    mutationFn: (body: typeof webhookForm) =>
      apiFetch("/api/integrations/webhooks", {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setShowWebhookForm(false);
      setWebhookForm({ name: "", url: "", events: [] });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (webhookId: string) =>
      apiFetch(`/api/integrations/webhooks/${webhookId}`, {
        token: token!,
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  // API Key mutations
  const createApiKeyMutation = useMutation<ApiKeyCreateResult>({
    mutationFn: () =>
      apiFetch("/api/integrations/api-keys", {
        token: token!,
        method: "POST",
        body: JSON.stringify(apiKeyForm),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setNewApiKey(data.key);
      setShowApiKeyForm(false);
      setApiKeyForm({ name: "", scopes: [] });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: (keyId: string) =>
      apiFetch(`/api/integrations/api-keys/${keyId}`, {
        token: token!,
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const toggleWebhookEvent = (event: string) => {
    setWebhookForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const toggleApiScope = (scope: string) => {
    setApiKeyForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const handleCopyApiKey = () => {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  };

  const handleCopyIcal = () => {
    const icalUrl = `${window.location.origin}/api/integrations/ical/{project_id}`;
    navigator.clipboard.writeText(icalUrl);
    setIcalCopied(true);
    setTimeout(() => setIcalCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6" /> 外部システム連携
        </h1>
      </div>

      {/* New API Key Alert */}
      {newApiKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 mb-1">
                APIキーが作成されました
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                このキーは一度しか表示されません。安全な場所に保管してください。
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-yellow-300 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-800 break-all">
                  {newApiKey}
                </code>
                <button
                  onClick={handleCopyApiKey}
                  className="flex items-center gap-1 bg-yellow-600 text-white px-4 py-2.5 rounded-lg hover:bg-yellow-700 text-sm whitespace-nowrap"
                >
                  {keyCopied ? (
                    <>
                      <Check className="w-4 h-4" /> コピー済
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> コピー
                    </>
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewApiKey(null)}
              className="text-yellow-500 hover:text-yellow-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Webhook Section */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Webhook className="w-5 h-5 text-purple-500" />
            Webhook設定
          </h2>
          <button
            onClick={() => setShowWebhookForm(!showWebhookForm)}
            className="flex items-center gap-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
          >
            <Plus className="w-4 h-4" /> 追加
          </button>
        </div>

        {/* Webhook Create Form */}
        {showWebhookForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createWebhookMutation.mutate(webhookForm);
            }}
            className="border border-purple-100 bg-purple-50/50 rounded-xl p-5 mb-6 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前
                </label>
                <input
                  type="text"
                  value={webhookForm.name}
                  onChange={(e) =>
                    setWebhookForm({ ...webhookForm, name: e.target.value })
                  }
                  placeholder="日報通知"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={webhookForm.url}
                  onChange={(e) =>
                    setWebhookForm({ ...webhookForm, url: e.target.value })
                  }
                  placeholder="https://example.com/webhook"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                イベント
              </label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((evt) => (
                  <button
                    key={evt.value}
                    type="button"
                    onClick={() => toggleWebhookEvent(evt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      webhookForm.events.includes(evt.value)
                        ? "bg-purple-100 border-purple-300 text-purple-700"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {evt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createWebhookMutation.isPending}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                {createWebhookMutation.isPending ? "保存中..." : "保存"}
              </button>
              <button
                type="button"
                onClick={() => setShowWebhookForm(false)}
                className="border px-6 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                キャンセル
              </button>
            </div>
            {createWebhookMutation.isError && (
              <p className="text-red-600 text-sm">
                {(createWebhookMutation.error as Error).message}
              </p>
            )}
          </form>
        )}

        {/* Webhook List */}
        {webhooksLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : webhooks.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            Webhookが設定されていません
          </p>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-100 hover:bg-purple-50/30 transition-all"
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${webhook.active ? "bg-green-400" : "bg-gray-300"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800">
                      {webhook.name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 font-mono truncate">
                    {webhook.url}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {webhook.events.map((evt) => {
                      const evtLabel =
                        WEBHOOK_EVENTS.find((e) => e.value === evt)?.label ||
                        evt;
                      return (
                        <span
                          key={evt}
                          className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs"
                        >
                          {evtLabel}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Keys Section */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" />
            APIキー管理
          </h2>
          <button
            onClick={() => setShowApiKeyForm(!showApiKeyForm)}
            className="flex items-center gap-1 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm"
          >
            <Plus className="w-4 h-4" /> 新規作成
          </button>
        </div>

        {/* API Key Create Form */}
        {showApiKeyForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createApiKeyMutation.mutate();
            }}
            className="border border-amber-100 bg-amber-50/50 rounded-xl p-5 mb-6 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                キー名
              </label>
              <input
                type="text"
                value={apiKeyForm.name}
                onChange={(e) =>
                  setApiKeyForm({ ...apiKeyForm, name: e.target.value })
                }
                placeholder="外部システム連携用"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                スコープ (権限)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {API_SCOPES.map((scope) => (
                  <label
                    key={scope.value}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                      apiKeyForm.scopes.includes(scope.value)
                        ? "bg-amber-50 border-amber-300 text-amber-800"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={apiKeyForm.scopes.includes(scope.value)}
                      onChange={() => toggleApiScope(scope.value)}
                      className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    {scope.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createApiKeyMutation.isPending}
                className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm"
              >
                {createApiKeyMutation.isPending ? "作成中..." : "作成"}
              </button>
              <button
                type="button"
                onClick={() => setShowApiKeyForm(false)}
                className="border px-6 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                キャンセル
              </button>
            </div>
            {createApiKeyMutation.isError && (
              <p className="text-red-600 text-sm">
                {(createApiKeyMutation.error as Error).message}
              </p>
            )}
          </form>
        )}

        {/* API Key List */}
        {apiKeysLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : apiKeys.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            APIキーが作成されていません
          </p>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-amber-100 hover:bg-amber-50/30 transition-all"
              >
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Key className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800">{key.name}</span>
                    <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {key.prefix}...
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>作成: {formatDate(key.created_at)}</span>
                    {key.last_used_at && (
                      <span>最終使用: {formatDate(key.last_used_at)}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {key.scopes.map((scope) => {
                      const scopeLabel =
                        API_SCOPES.find((s) => s.value === scope)?.label ||
                        scope;
                      return (
                        <span
                          key={scope}
                          className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-xs"
                        >
                          {scopeLabel}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => deleteApiKeyMutation.mutate(key.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* iCal Section */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-500" />
          カレンダー連携 (iCal)
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          検査予定をGoogleカレンダーやOutlookに同期できます。以下のURLをカレンダーアプリに登録してください。
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-50 border rounded-lg px-4 py-2.5 font-mono text-sm text-gray-600 truncate">
            {typeof window !== "undefined"
              ? `${window.location.origin}/api/integrations/ical/{project_id}`
              : "/api/integrations/ical/{project_id}"}
          </div>
          <button
            onClick={handleCopyIcal}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
          >
            {icalCopied ? (
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
    </div>
  );
}
