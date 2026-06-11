"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  FileText,
  GitBranch,
  Calculator,
  X,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatAmount } from "@/lib/utils";

interface EstimateItem {
  id: string;
  section_id: string;
  name: string;
  spec: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  amount: number;
  cost_unit_price: number;
  cost_amount: number;
  gross_profit: number;
  gross_profit_rate: number;
  display_order: number;
}

interface EstimateSection {
  id: string;
  estimate_id: string;
  name: string;
  display_order: number;
  items: EstimateItem[];
  subtotal?: number;
  cost_subtotal?: number;
}

interface EstimateFull {
  id: string;
  estimate_number: string;
  project_id: string | null;
  project_name: string | null;
  customer_name: string | null;
  revision: number;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  cost_total: number;
  gross_profit: number;
  gross_profit_rate: number;
  notes: string | null;
  sections: EstimateSection[];
}

interface ProjectTypeTemplate {
  id: string;
  name: string;
  description?: string | null;
}

function calcRow(quantity: number, unit_price: number, cost_unit_price: number) {
  const q = Number(quantity) || 0;
  const up = Number(unit_price) || 0;
  const cup = Number(cost_unit_price) || 0;
  const amount = Math.round(q * up);
  const cost_amount = Math.round(q * cup);
  const gross_profit = amount - cost_amount;
  const gross_profit_rate = amount > 0 ? Math.round((gross_profit / amount) * 1000) / 10 : 0;
  return { amount, cost_amount, gross_profit, gross_profit_rate };
}

export default function EstimateEditPage() {
  const params = useParams<{ id: string }>();
  const estimateId = params?.id;
  const router = useRouter();
  const { token } = useAuth();
  const qc = useQueryClient();

  const [sections, setSections] = useState<EstimateSection[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    data: estimate,
    isLoading,
    isError,
    refetch,
  } = useQuery<EstimateFull>({
    queryKey: ["estimate-full", estimateId],
    queryFn: () => apiFetch(`/api/estimates/${estimateId}/full`, { token }),
    enabled: !!estimateId && !!token,
  });

  const { data: templates = [] } = useQuery<ProjectTypeTemplate[]>({
    queryKey: ["project-type-templates"],
    queryFn: () => apiFetch("/api/project-type-templates", { token }),
    enabled: !!token && showTemplateDialog,
  });

  useEffect(() => {
    if (estimate?.sections) {
      setSections(JSON.parse(JSON.stringify(estimate.sections)) as EstimateSection[]);
    }
  }, [estimate]);

  // ---- Section operations ----
  const addSection = useMutation({
    mutationFn: (name: string) =>
      apiFetch<EstimateSection>(`/api/estimates/${estimateId}/sections`, {
        token,
        method: "POST",
        body: JSON.stringify({ name, display_order: sections.length }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate-full", estimateId] }),
  });

  const updateSection = useMutation({
    mutationFn: (s: EstimateSection) =>
      apiFetch(`/api/estimate-sections/${s.id}`, {
        token,
        method: "PUT",
        body: JSON.stringify({ name: s.name, display_order: s.display_order }),
      }),
  });

  const deleteSection = useMutation({
    mutationFn: (sid: string) =>
      apiFetch(`/api/estimate-sections/${sid}`, { token, method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate-full", estimateId] }),
  });

  // ---- Item operations ----
  const addItem = useMutation({
    mutationFn: ({ sid, displayOrder }: { sid: string; displayOrder: number }) =>
      apiFetch<EstimateItem>(`/api/estimate-sections/${sid}/items`, {
        token,
        method: "POST",
        body: JSON.stringify({
          name: "",
          spec: "",
          quantity: 1,
          unit: "式",
          unit_price: 0,
          cost_unit_price: 0,
          display_order: displayOrder,
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate-full", estimateId] }),
  });

  const updateItem = useMutation({
    mutationFn: (item: EstimateItem) =>
      apiFetch(`/api/estimate-items/${item.id}`, {
        token,
        method: "PUT",
        body: JSON.stringify({
          name: item.name,
          spec: item.spec,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          cost_unit_price: item.cost_unit_price,
          display_order: item.display_order,
        }),
      }),
  });

  const deleteItem = useMutation({
    mutationFn: (iid: string) =>
      apiFetch(`/api/estimate-items/${iid}`, { token, method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate-full", estimateId] }),
  });

  const recalculate = useMutation({
    mutationFn: () =>
      apiFetch(`/api/estimates/${estimateId}/recalculate`, { token, method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate-full", estimateId] }),
  });

  const applyTemplate = useMutation({
    mutationFn: (templateId: string) =>
      apiFetch(`/api/estimates/${estimateId}/apply-template`, {
        token,
        method: "POST",
        body: JSON.stringify({ project_type_template_id: templateId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimate-full", estimateId] });
      setShowTemplateDialog(false);
      setSelectedTemplate("");
    },
  });

  const revise = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>(`/api/estimates/${estimateId}/revise`, {
        token,
        method: "POST",
      }),
    onSuccess: (data) => {
      if (data?.id) {
        router.push(`/estimates/${data.id}/edit`);
      }
    },
  });

  // ---- Local state helpers ----
  const handleSectionNameChange = (sid: string, name: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sid ? { ...s, name } : s))
    );
  };

  const handleItemChange = (
    sid: string,
    iid: string,
    field: keyof EstimateItem,
    value: string | number
  ) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sid) return s;
        return {
          ...s,
          items: s.items.map((it) => {
            if (it.id !== iid) return it;
            const next = { ...it, [field]: value } as EstimateItem;
            if (
              field === "quantity" ||
              field === "unit_price" ||
              field === "cost_unit_price"
            ) {
              const r = calcRow(next.quantity, next.unit_price, next.cost_unit_price);
              next.amount = r.amount;
              next.cost_amount = r.cost_amount;
              next.gross_profit = r.gross_profit;
              next.gross_profit_rate = r.gross_profit_rate;
            }
            return next;
          }),
        };
      })
    );
  };

  const moveSection = (sid: string, dir: -1 | 1) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sid);
      const ni = idx + dir;
      if (idx < 0 || ni < 0 || ni >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[ni]] = [copy[ni], copy[idx]];
      return copy.map((s, i) => ({ ...s, display_order: i }));
    });
  };

  // ---- Save all ----
  const saveAll = async () => {
    if (!sections.length) return;
    setSaving(true);
    setSaveError(null);
    try {
      for (const s of sections) {
        await updateSection.mutateAsync(s);
        for (const it of s.items) {
          await updateItem.mutateAsync(it);
        }
      }
      await recalculate.mutateAsync();
      await refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // ---- Totals ----
  const totals = useMemo(() => {
    let subtotal = 0;
    let cost_total = 0;
    sections.forEach((s) =>
      s.items.forEach((it) => {
        subtotal += Number(it.amount) || 0;
        cost_total += Number(it.cost_amount) || 0;
      })
    );
    const tax = Math.floor(subtotal * 0.1);
    const total = subtotal + tax;
    const gross_profit = subtotal - cost_total;
    const gross_profit_rate =
      subtotal > 0 ? Math.round((gross_profit / subtotal) * 1000) / 10 : 0;
    return { subtotal, tax, total, cost_total, gross_profit, gross_profit_rate };
  }, [sections]);

  // ---- Render ----
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div
            role="alert"
            className="bg-white border border-red-200 rounded-lg p-6 flex items-center gap-3"
          >
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-gray-700">データの取得に失敗しました</span>
            <button
              onClick={() => refetch()}
              className="ml-auto px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-700"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !estimate) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link
                href={
                  estimate.project_id
                    ? `/projects/${estimate.project_id}`
                    : "/estimates"
                }
                className="text-sm text-gray-500 hover:text-gray-900"
                aria-label="戻る"
              >
                ← {estimate.project_id ? "案件詳細へ戻る" : "見積一覧へ戻る"}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTemplateDialog(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                aria-label="テンプレ適用"
              >
                <FileText size={16} />
                テンプレ適用
              </button>
              <button
                onClick={() => revise.mutate()}
                disabled={revise.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                aria-label="改訂作成"
              >
                <GitBranch size={16} />
                改訂作成
              </button>
              <button
                onClick={() => recalculate.mutate()}
                disabled={recalculate.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                aria-label="再計算"
              >
                <Calculator size={16} />
                再計算
              </button>
              <button
                onClick={saveAll}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                aria-label="保存"
              >
                <Save size={16} />
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
          <div className="mt-3">
            <h1 className="text-xl font-bold text-gray-900">
              見積書編集: {estimate.estimate_number}
              <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                Rev.{estimate.revision}
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {estimate.project_name || "-"} / {estimate.customer_name || "-"}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {saveError && (
          <div
            role="alert"
            className="mb-4 bg-white border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-center gap-2"
          >
            <AlertCircle size={16} />
            {saveError}
          </div>
        )}

        {/* Totals card */}
        <section
          aria-label="見積合計"
          className="mb-6 bg-white border border-gray-200 rounded-lg p-4"
        >
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <div>
              <div className="text-gray-500">小計</div>
              <div className="font-semibold text-gray-900">
                {formatAmount(totals.subtotal)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">消費税</div>
              <div className="font-semibold text-gray-900">
                {formatAmount(totals.tax)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">合計</div>
              <div className="font-bold text-gray-900">
                {formatAmount(totals.total)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">原価合計</div>
              <div className="font-semibold text-gray-900">
                {formatAmount(totals.cost_total)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">粗利</div>
              <div className="font-semibold text-emerald-600">
                {formatAmount(totals.gross_profit)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">粗利率</div>
              <div className="font-semibold text-emerald-600">
                {totals.gross_profit_rate}%
              </div>
            </div>
          </div>
        </section>

        {/* Sections */}
        <div className="space-y-6">
          {sections.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-500 mb-4">まだ大項目がありません</p>
              <button
                onClick={() => addSection.mutate("新規大項目")}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-gray-700"
              >
                <Plus size={16} />
                大項目を追加
              </button>
            </div>
          ) : (
            sections.map((section, sIdx) => (
              <section
                key={section.id}
                aria-label={`大項目: ${section.name}`}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <span className="text-sm text-gray-500 w-6 text-center">
                    {sIdx + 1}
                  </span>
                  <input
                    aria-label="大項目名"
                    value={section.name}
                    onChange={(e) =>
                      handleSectionNameChange(section.id, e.target.value)
                    }
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm font-medium"
                    placeholder="大項目名"
                  />
                  <button
                    onClick={() => moveSection(section.id, -1)}
                    disabled={sIdx === 0}
                    className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30"
                    aria-label="上へ移動"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveSection(section.id, 1)}
                    disabled={sIdx === sections.length - 1}
                    className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30"
                    aria-label="下へ移動"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`大項目「${section.name}」を削除しますか？`)) {
                        deleteSection.mutate(section.id);
                      }
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    aria-label="大項目を削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Items table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="px-2 py-2 text-left font-medium w-48">
                          名称
                        </th>
                        <th className="px-2 py-2 text-left font-medium w-40">
                          仕様
                        </th>
                        <th className="px-2 py-2 text-right font-medium w-20">
                          数量
                        </th>
                        <th className="px-2 py-2 text-left font-medium w-16">
                          単位
                        </th>
                        <th className="px-2 py-2 text-right font-medium w-24">
                          売上単価
                        </th>
                        <th className="px-2 py-2 text-right font-medium w-28">
                          売上金額
                        </th>
                        <th className="px-2 py-2 text-right font-medium w-24">
                          原価単価
                        </th>
                        <th className="px-2 py-2 text-right font-medium w-28">
                          原価金額
                        </th>
                        <th className="px-2 py-2 text-right font-medium w-24">
                          粗利
                        </th>
                        <th className="px-2 py-2 text-right font-medium w-16">
                          粗利率
                        </th>
                        <th className="px-2 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {section.items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-4 py-6 text-center text-gray-500"
                          >
                            まだ明細がありません
                          </td>
                        </tr>
                      ) : (
                        section.items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5">
                              <input
                                aria-label="名称"
                                value={item.name}
                                onChange={(e) =>
                                  handleItemChange(
                                    section.id,
                                    item.id,
                                    "name",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                aria-label="仕様"
                                value={item.spec || ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    section.id,
                                    item.id,
                                    "spec",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                aria-label="数量"
                                type="number"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(
                                    section.id,
                                    item.id,
                                    "quantity",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                aria-label="単位"
                                value={item.unit || ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    section.id,
                                    item.id,
                                    "unit",
                                    e.target.value
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                aria-label="売上単価"
                                type="number"
                                value={item.unit_price}
                                onChange={(e) =>
                                  handleItemChange(
                                    section.id,
                                    item.id,
                                    "unit_price",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right text-gray-900">
                              {formatAmount(item.amount)}
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                aria-label="原価単価"
                                type="number"
                                value={item.cost_unit_price}
                                onChange={(e) =>
                                  handleItemChange(
                                    section.id,
                                    item.id,
                                    "cost_unit_price",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right text-gray-900">
                              {formatAmount(item.cost_amount)}
                            </td>
                            <td
                              className={`px-2 py-1.5 text-right ${
                                item.gross_profit >= 0
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatAmount(item.gross_profit)}
                            </td>
                            <td
                              className={`px-2 py-1.5 text-right ${
                                item.gross_profit_rate >= 0
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {item.gross_profit_rate}%
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                onClick={() => {
                                  if (confirm("この明細を削除しますか？")) {
                                    deleteItem.mutate(item.id);
                                  }
                                }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                aria-label="明細を削除"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() =>
                      addItem.mutate({
                        sid: section.id,
                        displayOrder: section.items.length,
                      })
                    }
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-gray-900"
                  >
                    <Plus size={14} />
                    明細を追加
                  </button>
                </div>
              </section>
            ))
          )}

          {sections.length > 0 && (
            <button
              onClick={() => addSection.mutate("新規大項目")}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-500 hover:text-gray-900 inline-flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              大項目を追加
            </button>
          )}
        </div>
      </div>

      {/* Template dialog */}
      {showTemplateDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="テンプレ適用"
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">テンプレ適用</h2>
              <button
                onClick={() => {
                  setShowTemplateDialog(false);
                  setSelectedTemplate("");
                }}
                aria-label="閉じる"
                className="p-1 text-gray-500 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4">
              <label
                htmlFor="template-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                工事種別テンプレート
              </label>
              {templates.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  まだテンプレートがありません
                </p>
              ) : (
                <select
                  id="template-select"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">選択してください</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-amber-600 mt-2">
                ※ 適用すると既存の内訳に上書き/追記されます。
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTemplateDialog(false);
                  setSelectedTemplate("");
                }}
                className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={() => selectedTemplate && applyTemplate.mutate(selectedTemplate)}
                disabled={!selectedTemplate || applyTemplate.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                {applyTemplate.isPending ? "適用中..." : "適用"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
