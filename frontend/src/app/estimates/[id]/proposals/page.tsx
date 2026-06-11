"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";

interface Proposal {
  id: string;
  estimate_id: string;
  name: string;
  spec: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  amount: number;
  status: string; // 'proposed' | 'adopted' | 'rejected' など
  note: string | null;
  created_at?: string;
  updated_at?: string;
}

interface FormState {
  name: string;
  spec: string;
  quantity: string;
  unit: string;
  unit_price: string;
  note: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  spec: "",
  quantity: "1",
  unit: "式",
  unit_price: "0",
  note: "",
};

function formatYen(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "¥0";
  return `¥${Math.floor(n).toLocaleString()}`;
}

export default function EstimateProposalsPage() {
  const params = useParams<{ id: string }>();
  const estimateId = params?.id ?? "";
  const { token } = useAuth();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const listKey = ["estimate-proposals", estimateId] as const;

  const {
    data: proposals = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<Proposal[]>({
    queryKey: listKey,
    queryFn: () =>
      apiFetch<Proposal[]>(`/api/estimates/${estimateId}/proposals`, { token }),
    enabled: !!token && !!estimateId,
  });

  const totalsByStatus = useMemo(() => {
    const totals: Record<string, number> = { proposed: 0, adopted: 0, rejected: 0 };
    for (const p of proposals) {
      const k = p.status || "proposed";
      totals[k] = (totals[k] || 0) + (Number(p.amount) || 0);
    }
    return totals;
  }, [proposals]);

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/estimates/${estimateId}/proposals`, {
        token,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey });
      resetForm();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/api/estimate-proposals/${id}`, {
        token,
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey });
      resetForm();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/estimate-proposals/${id}`, {
        token,
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey });
    },
  });

  const adopt = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/estimate-proposals/${id}/adopt`, {
        token,
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey });
      qc.invalidateQueries({ queryKey: ["estimate", estimateId] });
      qc.invalidateQueries({ queryKey: ["estimate-items", estimateId] });
    },
  });

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(p: Proposal) {
    setEditingId(p.id);
    setForm({
      name: p.name ?? "",
      spec: p.spec ?? "",
      quantity: String(p.quantity ?? 1),
      unit: p.unit ?? "",
      unit_price: String(p.unit_price ?? 0),
      note: p.note ?? "",
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(form.quantity) || 0;
    const price = Number(form.unit_price) || 0;
    const body = {
      name: form.name.trim(),
      spec: form.spec.trim() || null,
      quantity: qty,
      unit: form.unit.trim() || null,
      unit_price: price,
      amount: Math.floor(qty * price),
      note: form.note.trim() || null,
    };
    if (!body.name) return;
    if (editingId) {
      update.mutate({ id: editingId, body });
    } else {
      create.mutate(body);
    }
  }

  const formQty = Number(form.quantity) || 0;
  const formPrice = Number(form.unit_price) || 0;
  const formAmount = Math.floor(formQty * formPrice);

  const mutating =
    create.isPending || update.isPending || remove.isPending || adopt.isPending;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* パンくず + ヘッダー */}
        <div className="mb-6">
          <Link
            href={`/estimates/${estimateId}`}
            className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
            aria-label="見積詳細へ戻る"
          >
            <span aria-hidden="true">←</span> 見積詳細へ戻る
          </Link>
          <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                提案項目 (オプション)
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                施主に提示する追加提案。「採用」すると本見積に行が追加されます。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (showForm && !editingId) {
                  resetForm();
                } else {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                  setShowForm(true);
                }
              }}
              className="inline-flex items-center gap-1 bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              aria-label="新規提案項目を追加"
            >
              <span aria-hidden="true">+</span>
              <span>新規追加</span>
            </button>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SummaryCard label="件数" value={`${proposals.length} 件`} />
          <SummaryCard
            label="採用済 合計"
            value={formatYen(totalsByStatus.adopted)}
            accent="emerald"
          />
          <SummaryCard
            label="提案中 合計"
            value={formatYen(totalsByStatus.proposed)}
          />
        </div>

        {/* フォーム */}
        {showForm && (
          <div
            className="bg-white border border-gray-200 rounded-lg p-5 mb-6"
            role="region"
            aria-label={editingId ? "提案項目編集" : "提案項目追加"}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                {editingId ? "提案項目を編集" : "提案項目を追加"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-gray-500 hover:text-gray-900"
                aria-label="フォームを閉じる"
              >
                閉じる
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名称 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="例: 外壁シーリング打ち替え"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    仕様
                  </label>
                  <input
                    type="text"
                    value={form.spec}
                    onChange={(e) => setForm({ ...form, spec: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="例: 変成シリコーン系 / 撤去新設"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    数量
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    単位
                  </label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="式 / m / m²"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    単価 (円)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={form.unit_price}
                    onChange={(e) =>
                      setForm({ ...form, unit_price: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    金額
                  </label>
                  <div
                    className="w-full border border-gray-200 bg-gray-100 rounded-md px-3 py-2 text-sm text-gray-700"
                    aria-live="polite"
                  >
                    {formatYen(formAmount)}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  備考
                </label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="任意"
                />
              </div>
              {(create.isError || update.isError) && (
                <p className="text-sm text-red-600" role="alert">
                  保存に失敗しました:{" "}
                  {(create.error as Error)?.message ||
                    (update.error as Error)?.message}
                </p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={mutating}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50"
                >
                  {editingId ? "更新" : "追加"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* リスト */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-gray-500">
              読み込み中...
            </div>
          ) : isError ? (
            <div className="p-10 text-center" role="alert">
              <p className="text-sm text-gray-700 mb-3">
                データの取得に失敗しました
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                再試行
              </button>
            </div>
          ) : proposals.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-gray-500 mb-4">
                まだ提案項目がありません
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-1 bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <span aria-hidden="true">+</span>
                新規追加
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                    <th scope="col" className="px-4 py-3">
                      名称 / 仕様
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      数量
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      単価
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      金額
                    </th>
                    <th scope="col" className="px-4 py-3 text-center">
                      状態
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {proposals.map((p) => {
                    const isAdopted = p.status === "adopted";
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-gray-900">
                            {p.name}
                          </div>
                          {p.spec && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {p.spec}
                            </div>
                          )}
                          {p.note && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              備考: {p.note}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap align-top">
                          {Number(p.quantity).toLocaleString()}{" "}
                          <span className="text-gray-500 text-xs">
                            {p.unit ?? ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap align-top">
                          {formatYen(p.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap align-top">
                          {formatYen(p.amount)}
                        </td>
                        <td className="px-4 py-3 text-center align-top">
                          {isAdopted ? (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              採用済
                            </span>
                          ) : p.status === "rejected" ? (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                              却下
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                              提案中
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap align-top">
                          <div className="inline-flex items-center gap-2">
                            {!isAdopted && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    confirm(
                                      "この提案を採用しますか?本見積に行が追加されます。"
                                    )
                                  ) {
                                    adopt.mutate(p.id);
                                  }
                                }}
                                disabled={mutating}
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1 disabled:opacity-50"
                                aria-label={`${p.name} を採用`}
                              >
                                採用
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEdit(p)}
                              disabled={mutating}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                              aria-label={`${p.name} を編集`}
                            >
                              編集
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("この提案項目を削除しますか?")) {
                                  remove.mutate(p.id);
                                }
                              }}
                              disabled={mutating}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-gray-300 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
                              aria-label={`${p.name} を削除`}
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {(adopt.isError || remove.isError) && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            操作に失敗しました:{" "}
            {(adopt.error as Error)?.message ||
              (remove.error as Error)?.message}
          </p>
        )}

        {isFetching && !isLoading && (
          <p className="mt-3 text-xs text-gray-500" aria-live="polite">
            更新中...
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald";
}) {
  const valueClass =
    accent === "emerald" ? "text-emerald-700" : "text-gray-900";
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
