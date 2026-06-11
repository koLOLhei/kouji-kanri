"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";

interface EstimateDetail {
  id: string;
  estimate_number?: string | null;
  project_name?: string | null;
  project_type?: string | null;
  conditions_html?: string | null;
}

interface EstimateConditionTemplate {
  id: string;
  name: string;
  project_type?: string | null;
  description?: string | null;
  content_html: string;
  updated_at?: string | null;
}

const PROJECT_TYPES: { value: string; label: string }[] = [
  { value: "", label: "すべて" },
  { value: "general", label: "一般建築" },
  { value: "renovation", label: "改修" },
  { value: "civil", label: "土木" },
  { value: "interior", label: "内装" },
  { value: "other", label: "その他" },
];

export default function EstimateConditionsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const estimateId = params?.id;
  const { token } = useAuth();
  const qc = useQueryClient();

  const [conditionsHtml, setConditionsHtml] = useState<string>("");
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyMode, setApplyMode] = useState<"overwrite" | "append">("append");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const estimateQuery = useQuery<EstimateDetail>({
    queryKey: ["estimate", estimateId],
    queryFn: () =>
      apiFetch<EstimateDetail>(`/api/estimates/${estimateId}`, { token }),
    enabled: !!estimateId && !!token,
  });

  useEffect(() => {
    if (estimateQuery.data && !initialLoaded) {
      setConditionsHtml(estimateQuery.data.conditions_html ?? "");
      if (estimateQuery.data.project_type) {
        setProjectTypeFilter(estimateQuery.data.project_type);
      }
      setInitialLoaded(true);
    }
  }, [estimateQuery.data, initialLoaded]);

  const templatesQuery = useQuery<EstimateConditionTemplate[]>({
    queryKey: ["estimate-condition-templates", projectTypeFilter],
    queryFn: () => {
      const qs = projectTypeFilter
        ? `?project_type=${encodeURIComponent(projectTypeFilter)}`
        : "";
      return apiFetch<EstimateConditionTemplate[]>(
        `/api/estimate-condition-templates${qs}`,
        { token }
      );
    },
    enabled: !!token,
  });

  const selectedTemplate = useMemo(
    () =>
      (templatesQuery.data || []).find((t) => t.id === selectedTemplateId) ||
      null,
    [templatesQuery.data, selectedTemplateId]
  );

  const saveMutation = useMutation({
    mutationFn: (payload: { conditions_html: string }) =>
      apiFetch(`/api/estimates/${estimateId}/conditions`, {
        token,
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimate", estimateId] });
      qc.invalidateQueries({ queryKey: ["estimates"] });
      setSaveMessage("保存しました");
      setTimeout(() => setSaveMessage(null), 2500);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "保存に失敗しました";
      setSaveMessage(`エラー: ${msg}`);
    },
  });

  const handleOpenApplyDialog = () => {
    if (!selectedTemplate) return;
    setApplyMode(conditionsHtml.trim() ? "append" : "overwrite");
    setApplyDialogOpen(true);
  };

  const handleConfirmApply = () => {
    if (!selectedTemplate) {
      setApplyDialogOpen(false);
      return;
    }
    if (applyMode === "overwrite") {
      setConditionsHtml(selectedTemplate.content_html);
    } else {
      setConditionsHtml((prev) => {
        const sep = prev.trim() ? "\n\n" : "";
        return `${prev}${sep}${selectedTemplate.content_html}`;
      });
    }
    setApplyDialogOpen(false);
  };

  const handleSave = () => {
    if (!estimateId) return;
    saveMutation.mutate({ conditions_html: conditionsHtml });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                estimateId ? router.push(`/estimates`) : router.back()
              }
              className="text-sm text-gray-700 hover:text-gray-900"
              aria-label="見積一覧へ戻る"
            >
              ← 見積一覧
            </button>
            <span className="text-gray-300" aria-hidden="true">
              /
            </span>
            <button
              type="button"
              onClick={() => router.push(`/estimates`)}
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              見積詳細
            </button>
            <span className="text-gray-300" aria-hidden="true">
              /
            </span>
            <span
              className="text-sm font-medium text-gray-900"
              aria-current="page"
            >
              見積条件 (約款)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {saveMessage && (
              <span
                role="status"
                className={`text-sm ${
                  saveMessage.startsWith("エラー")
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {saveMessage}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || !estimateId}
              className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              aria-label="見積条件を保存"
            >
              {saveMutation.isPending ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            見積条件 (約款) 編集
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            テンプレートから挿入したり、自由に記述して見積書に添付する条項を編集できます。
          </p>
          {estimateQuery.data && (
            <div className="mt-3 text-sm text-gray-700">
              <span className="font-medium">
                {estimateQuery.data.estimate_number || "(番号未設定)"}
              </span>
              {estimateQuery.data.project_name && (
                <span className="text-gray-500"> / {estimateQuery.data.project_name}</span>
              )}
            </div>
          )}
        </div>

        {estimateQuery.isError && (
          <div
            className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between"
            role="alert"
          >
            <span>データの取得に失敗しました</span>
            <button
              type="button"
              onClick={() => estimateQuery.refetch()}
              className="px-3 py-1 rounded-md bg-white border border-red-300 text-red-700 hover:bg-red-100"
            >
              再試行
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section
            className="lg:col-span-1 bg-white border border-gray-200 rounded-lg p-4"
            aria-labelledby="template-section-title"
          >
            <h2
              id="template-section-title"
              className="text-base font-semibold text-gray-900 mb-3"
            >
              テンプレートから挿入
            </h2>

            <label
              htmlFor="project-type"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              工事種別で絞り込み
            </label>
            <select
              id="project-type"
              value={projectTypeFilter}
              onChange={(e) => {
                setProjectTypeFilter(e.target.value);
                setSelectedTemplateId("");
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <div className="mt-4">
              {templatesQuery.isError ? (
                <div
                  className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between"
                  role="alert"
                >
                  <span>データの取得に失敗しました</span>
                  <button
                    type="button"
                    onClick={() => templatesQuery.refetch()}
                    className="px-2 py-1 rounded-md bg-white border border-red-300 text-red-700 hover:bg-red-100 text-xs"
                  >
                    再試行
                  </button>
                </div>
              ) : templatesQuery.isLoading ? (
                <p className="text-sm text-gray-500">読み込み中…</p>
              ) : (templatesQuery.data || []).length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-300 p-4 text-center">
                  <p className="text-sm text-gray-500 mb-3">
                    まだテンプレートがありません
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      router.push("/settings/estimate-condition-templates")
                    }
                    className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs hover:bg-gray-800"
                  >
                    新規テンプレートを作成
                  </button>
                </div>
              ) : (
                <ul
                  className="divide-y divide-gray-200 border border-gray-200 rounded-md max-h-72 overflow-y-auto"
                  role="listbox"
                  aria-label="テンプレート一覧"
                >
                  {(templatesQuery.data || []).map((t) => {
                    const active = t.id === selectedTemplateId;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => setSelectedTemplateId(t.id)}
                          className={`w-full text-left px-3 py-2 text-sm ${
                            active
                              ? "bg-gray-900 text-white"
                              : "bg-white text-gray-900 hover:bg-gray-100"
                          }`}
                        >
                          <div className="font-medium">{t.name}</div>
                          {t.description && (
                            <div
                              className={`text-xs ${
                                active ? "text-gray-200" : "text-gray-500"
                              }`}
                            >
                              {t.description}
                            </div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={handleOpenApplyDialog}
              disabled={!selectedTemplate}
              className="mt-4 w-full px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              aria-label="選択したテンプレートを適用"
            >
              テンプレを適用
            </button>

            {selectedTemplate && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-gray-700 mb-1">
                  プレビュー
                </h3>
                <pre className="bg-gray-100 border border-gray-200 rounded-md p-3 text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedTemplate.content_html}
                </pre>
              </div>
            )}
          </section>

          <section
            className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4"
            aria-labelledby="editor-section-title"
          >
            <div className="flex items-center justify-between mb-3">
              <h2
                id="editor-section-title"
                className="text-base font-semibold text-gray-900"
              >
                条件 (約款) 本文
              </h2>
              <span className="text-xs text-gray-500">
                Markdown 風 / プレーン HTML
              </span>
            </div>
            <label htmlFor="conditions-html" className="sr-only">
              見積条件本文
            </label>
            <textarea
              id="conditions-html"
              value={conditionsHtml}
              onChange={(e) => setConditionsHtml(e.target.value)}
              placeholder="例) 1. 本見積の有効期限は発行日より30日とします。&#10;2. 支払条件は ..."
              className="w-full h-[480px] border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-gray-900"
              aria-label="見積条件 HTML 本文"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {conditionsHtml.length.toLocaleString()} 文字
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConditionsHtml("")}
                  className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50"
                  aria-label="本文をクリア"
                >
                  クリア
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="px-4 py-1.5 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {saveMutation.isPending ? "保存中…" : "保存"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {applyDialogOpen && selectedTemplate && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-dialog-title"
        >
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-5">
            <h3
              id="apply-dialog-title"
              className="text-base font-semibold text-gray-900 mb-2"
            >
              テンプレートを適用
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              「{selectedTemplate.name}」を適用します。既存の本文に対する処理を選択してください。
            </p>
            <div className="space-y-2 mb-5">
              <label className="flex items-start gap-2 cursor-pointer border border-gray-200 rounded-md p-3 hover:bg-gray-50">
                <input
                  type="radio"
                  name="apply-mode"
                  value="append"
                  checked={applyMode === "append"}
                  onChange={() => setApplyMode("append")}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    既存本文に追記
                  </div>
                  <div className="text-xs text-gray-500">
                    現在の本文の末尾にテンプレートを追加します
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer border border-gray-200 rounded-md p-3 hover:bg-gray-50">
                <input
                  type="radio"
                  name="apply-mode"
                  value="overwrite"
                  checked={applyMode === "overwrite"}
                  onChange={() => setApplyMode("overwrite")}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    上書き
                  </div>
                  <div className="text-xs text-amber-600">
                    現在の本文をすべて置き換えます
                  </div>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApplyDialogOpen(false)}
                className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                className="px-4 py-1.5 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
              >
                適用する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
