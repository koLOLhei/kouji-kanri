"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Star,
  StarOff,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";

// ---------- Types ----------

interface EstimateConditionTemplate {
  id: string;
  tenant_id: string;
  name: string;
  project_type: string | null;
  body_html: string | null;
  sort_order: number;
  is_default: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface TemplatePayload {
  name: string;
  project_type: string | null;
  body_html: string | null;
  sort_order: number;
  is_default: boolean;
}

const PROJECT_TYPE_OPTIONS: string[] = [
  "新築",
  "改修",
  "塗装",
  "内装",
  "外構",
  "設備",
  "解体",
  "その他",
];

// ---------- Page ----------

export default function EstimateConditionsSettingsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [filterType, setFilterType] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<TemplatePayload>({
    name: "",
    project_type: "",
    body_html: "",
    sort_order: 0,
    is_default: false,
  });

  const queryKey = useMemo(
    () => ["estimate-condition-templates", filterType] as const,
    [filterType],
  );

  const { data: templates = [], isLoading, isError, refetch, isFetching } =
    useQuery<EstimateConditionTemplate[]>({
      queryKey,
      queryFn: () =>
        apiFetch<EstimateConditionTemplate[]>(
          `/api/estimate-condition-templates${
            filterType ? `?project_type=${encodeURIComponent(filterType)}` : ""
          }`,
          { token: token! },
        ),
      enabled: !!token,
    });

  const resetForm = () => {
    setForm({
      name: "",
      project_type: "",
      body_html: "",
      sort_order: 0,
      is_default: false,
    });
    setEditingId(null);
    setShowCreate(false);
  };

  const createMutation = useMutation({
    mutationFn: (body: TemplatePayload) =>
      apiFetch<EstimateConditionTemplate>(
        "/api/estimate-condition-templates",
        {
          token: token!,
          method: "POST",
          body: JSON.stringify({
            ...body,
            project_type: body.project_type || null,
            body_html: body.body_html || null,
          }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["estimate-condition-templates"],
      });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: TemplatePayload }) =>
      apiFetch<EstimateConditionTemplate>(
        `/api/estimate-condition-templates/${id}`,
        {
          token: token!,
          method: "PUT",
          body: JSON.stringify({
            ...body,
            project_type: body.project_type || null,
            body_html: body.body_html || null,
          }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["estimate-condition-templates"],
      });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/estimate-condition-templates/${id}`, {
        token: token!,
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["estimate-condition-templates"],
      });
    },
  });

  const startEdit = (t: EstimateConditionTemplate) => {
    setEditingId(t.id);
    setShowCreate(false);
    setForm({
      name: t.name,
      project_type: t.project_type || "",
      body_html: t.body_html || "",
      sort_order: t.sort_order,
      is_default: t.is_default,
    });
    setExpanded((prev) => ({ ...prev, [t.id]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, body: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`「${name}」を削除します。よろしいですか？`)) return;
    deleteMutation.mutate(id);
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const submitting =
    createMutation.isPending || updateMutation.isPending;
  const mutationError =
    createMutation.error || updateMutation.error || deleteMutation.error;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb / Back */}
        <nav aria-label="パンくず" className="mb-4">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            設定へ戻る
          </Link>
        </nav>

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center"
              aria-hidden="true"
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                見積条件テンプレ管理
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                見積に挿入する条件・約款テンプレートを工種別に管理
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="再読み込み"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              再読み込み
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              新規テンプレート
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="filter-type"
              className="text-sm font-medium text-gray-700 mr-2"
            >
              工種で絞り込み:
            </label>
            <button
              type="button"
              onClick={() => setFilterType("")}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                filterType === ""
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
              aria-pressed={filterType === ""}
            >
              すべて
            </button>
            {PROJECT_TYPE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  filterType === t
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
                aria-pressed={filterType === t}
              >
                {t}
              </button>
            ))}
            <select
              id="filter-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="sr-only"
              aria-label="工種フィルタ"
            >
              <option value="">すべて</option>
              {PROJECT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Form (create / edit) */}
        {(showCreate || editingId) && (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4"
            aria-label={editingId ? "テンプレート編集" : "テンプレート新規作成"}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {editingId ? "テンプレートを編集" : "新しいテンプレートを作成"}
              </h2>
              {editingId && (
                <span className="text-xs text-gray-500">
                  ID: {editingId.slice(0, 8)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="tpl-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  テンプレート名 <span className="text-red-600">*</span>
                </label>
                <input
                  id="tpl-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="例: 新築工事 標準条件"
                />
              </div>
              <div>
                <label
                  htmlFor="tpl-type"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  工種 (project_type)
                </label>
                <select
                  id="tpl-type"
                  value={form.project_type || ""}
                  onChange={(e) =>
                    setForm({ ...form, project_type: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                >
                  <option value="">未指定</option>
                  {PROJECT_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="tpl-sort"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  並び順 (sort_order)
                </label>
                <input
                  id="tpl-sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sort_order: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.is_default}
                    onChange={(e) =>
                      setForm({ ...form, is_default: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  デフォルトテンプレートとして登録
                </label>
              </div>
            </div>

            <div>
              <label
                htmlFor="tpl-body"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                本文 (body_html — HTML 直書き)
              </label>
              <textarea
                id="tpl-body"
                value={form.body_html || ""}
                onChange={(e) =>
                  setForm({ ...form, body_html: e.target.value })
                }
                rows={10}
                spellCheck={false}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                placeholder="<h3>工事条件</h3>\n<ul>\n  <li>工期: ...</li>\n  <li>支払条件: ...</li>\n</ul>"
              />
              <p className="text-xs text-gray-500 mt-1">
                HTML タグをそのまま記述できます (例: &lt;p&gt;, &lt;ul&gt;,
                &lt;strong&gt;)。
              </p>
            </div>

            {mutationError && (
              <div
                role="alert"
                className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700"
              >
                <AlertCircle
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
                <span>{(mutationError as Error).message}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting || !form.name.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting
                  ? "保存中..."
                  : editingId
                  ? "更新する"
                  : "作成する"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}

        {/* List */}
        {isError ? (
          <div
            role="alert"
            className="bg-white border border-red-200 rounded-xl p-8 text-center"
          >
            <AlertCircle
              className="w-8 h-8 text-red-600 mx-auto mb-2"
              aria-hidden="true"
            />
            <p className="text-sm text-gray-700 mb-3">
              データの取得に失敗しました
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              再試行
            </button>
          </div>
        ) : isLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
            読み込み中...
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <FileText
              className="w-10 h-10 text-gray-300 mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-sm text-gray-700 mb-1">
              まだ見積条件テンプレートがありません
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {filterType
                ? `「${filterType}」に該当するテンプレートがありません。`
                : "工種ごとの標準条件を登録して、見積作成を効率化しましょう。"}
            </p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              新規テンプレートを作成
            </button>
          </div>
        ) : (
          <ul className="space-y-3" role="list">
            {templates.map((t) => {
              const isOpen = !!expanded[t.id];
              return (
                <li
                  key={t.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                >
                  <div className="px-4 py-3 sm:px-5 sm:py-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(t.id)}
                      aria-expanded={isOpen}
                      aria-label={
                        isOpen ? "プレビューを閉じる" : "プレビューを開く"
                      }
                      className="text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="w-5 h-5" aria-hidden="true" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {t.name}
                        </h3>
                        {t.is_default && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">
                            <Star
                              className="w-3 h-3"
                              aria-hidden="true"
                              fill="currentColor"
                            />
                            デフォルト
                          </span>
                        )}
                        {t.project_type ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                            {t.project_type}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-500 border border-gray-200">
                            工種未指定
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          並び順: {t.sort_order}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(t)}
                        aria-label={`${t.name} を編集`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id, t.name)}
                        disabled={deleteMutation.isPending}
                        aria-label={`${t.name} を削除`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        削除
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-5">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                            {t.is_default ? (
                              <Star className="w-3 h-3" aria-hidden="true" />
                            ) : (
                              <StarOff
                                className="w-3 h-3"
                                aria-hidden="true"
                              />
                            )}
                            HTML ソース
                          </p>
                          <pre className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap break-words max-h-72 overflow-auto font-mono">
                            {t.body_html || "(本文が登録されていません)"}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">
                            プレビュー
                          </p>
                          <div
                            className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800 max-h-72 overflow-auto prose prose-sm max-w-none"
                            // body_html はテナント内の管理者が編集する管理画面プレビュー用途
                            dangerouslySetInnerHTML={{
                              __html:
                                t.body_html ||
                                '<p class="text-gray-400">(本文が登録されていません)</p>',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
