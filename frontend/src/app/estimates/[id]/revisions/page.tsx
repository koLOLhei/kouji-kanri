"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatAmount, formatDate } from "@/lib/utils";

interface Revision {
  id: string;
  revision_no: number;
  amount: number | null;
  created_at: string;
  parent_estimate_id: string | null;
  estimate_number?: string | null;
  status?: string | null;
  note?: string | null;
}

interface DiffItem {
  name?: string;
  field?: string;
  before?: string | number | null;
  after?: string | number | null;
  amount?: number | null;
  [key: string]: unknown;
}

interface DiffResponse {
  added: DiffItem[];
  removed: DiffItem[];
  changed: DiffItem[];
}

function describeItem(it: DiffItem): string {
  if (it.name) return String(it.name);
  if (it.field) return String(it.field);
  // fallback: pick first key
  const keys = Object.keys(it);
  if (keys.length > 0) return `${keys[0]}: ${String(it[keys[0]])}`;
  return "(項目)";
}

function changeDescription(it: DiffItem): string {
  const parts: string[] = [];
  if (it.field) parts.push(String(it.field));
  if (it.before !== undefined || it.after !== undefined) {
    parts.push(`${it.before ?? "(空)"} → ${it.after ?? "(空)"}`);
  }
  if (parts.length === 0) {
    return JSON.stringify(it);
  }
  return parts.join(" : ");
}

export default function EstimateRevisionsPage() {
  const params = useParams<{ id: string }>();
  const estimateId = params?.id;
  const { token } = useAuth();
  const [baseId, setBaseId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);

  const revisionsQuery = useQuery<Revision[]>({
    queryKey: ["estimate-revisions", estimateId],
    queryFn: () =>
      apiFetch<Revision[]>(`/api/estimates/${estimateId}/revisions`, { token }),
    enabled: Boolean(estimateId && token),
  });

  const sorted = useMemo(() => {
    const list = revisionsQuery.data ?? [];
    return [...list].sort((a, b) => a.revision_no - b.revision_no);
  }, [revisionsQuery.data]);

  const diffQuery = useQuery<DiffResponse>({
    queryKey: ["estimate-diff", baseId, compareId],
    queryFn: () =>
      apiFetch<DiffResponse>(
        `/api/estimates/${baseId}/diff?compare_to=${compareId}`,
        { token }
      ),
    enabled: Boolean(baseId && compareId && baseId !== compareId && token),
  });

  const toggleSelect = (id: string) => {
    if (baseId === id) {
      setBaseId(null);
      return;
    }
    if (compareId === id) {
      setCompareId(null);
      return;
    }
    if (!baseId) {
      setBaseId(id);
      return;
    }
    if (!compareId) {
      setCompareId(id);
      return;
    }
    // both selected: replace compare
    setCompareId(id);
  };

  const clearSelection = () => {
    setBaseId(null);
    setCompareId(null);
  };

  const baseRev = sorted.find((r) => r.id === baseId);
  const compareRev = sorted.find((r) => r.id === compareId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* パンくず */}
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Link
            href={`/estimates/${estimateId}`}
            className="hover:text-gray-900 hover:underline"
            aria-label="見積詳細へ戻る"
          >
            ← 見積詳細へ戻る
          </Link>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">改訂履歴</h1>
            <p className="mt-1 text-sm text-gray-500">
              改訂を 2 件選択すると差分を表示できます。
            </p>
          </div>
          {(baseId || compareId) && (
            <button
              type="button"
              onClick={clearSelection}
              className="self-start sm:self-auto rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              aria-label="選択をクリア"
            >
              選択をクリア
            </button>
          )}
        </div>

        {/* 状態: ロード / エラー / 空 / 一覧 */}
        {revisionsQuery.isLoading && (
          <div
            className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500"
            role="status"
            aria-live="polite"
          >
            読み込み中...
          </div>
        )}

        {revisionsQuery.isError && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
            role="alert"
          >
            <p className="text-sm text-red-700">
              データの取得に失敗しました
            </p>
            <button
              type="button"
              onClick={() => revisionsQuery.refetch()}
              className="mt-3 rounded border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
            >
              再試行
            </button>
          </div>
        )}

        {!revisionsQuery.isLoading &&
          !revisionsQuery.isError &&
          sorted.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
              <p className="text-sm text-gray-500">まだ改訂がありません</p>
              <Link
                href={`/estimates/${estimateId}`}
                className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                見積詳細で新規改訂を作成
              </Link>
            </div>
          )}

        {sorted.length > 0 && (
          <ul
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            aria-label="改訂一覧"
          >
            {sorted.map((rev) => {
              const isBase = rev.id === baseId;
              const isCompare = rev.id === compareId;
              const selected = isBase || isCompare;
              return (
                <li key={rev.id}>
                  <button
                    type="button"
                    onClick={() => toggleSelect(rev.id)}
                    aria-pressed={selected}
                    aria-label={`改訂 ${rev.revision_no} を選択`}
                    className={`w-full text-left rounded-lg border bg-white p-4 transition-colors ${
                      selected
                        ? "border-gray-900 ring-2 ring-gray-900"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center rounded bg-gray-900 px-2 py-0.5 text-xs font-medium text-white">
                        Rev. {rev.revision_no}
                      </span>
                      {selected && (
                        <span className="text-xs font-medium text-gray-700">
                          {isBase ? "基準" : "比較対象"}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatAmount(rev.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        作成日: {formatDate(rev.created_at)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        親見積: {rev.parent_estimate_id ?? "—"}
                      </p>
                      {rev.note && (
                        <p className="mt-2 text-xs text-gray-700 line-clamp-2">
                          {rev.note}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* 差分セクション */}
        {baseId && compareId && (
          <section
            className="mt-8 rounded-lg border border-gray-200 bg-white"
            aria-label="差分結果"
          >
            <header className="border-b border-gray-200 px-4 py-3 sm:px-6">
              <h2 className="text-lg font-semibold text-gray-900">
                差分:
                <span className="ml-2 text-sm font-normal text-gray-500">
                  Rev. {baseRev?.revision_no} ↔ Rev. {compareRev?.revision_no}
                </span>
              </h2>
            </header>

            <div className="p-4 sm:p-6">
              {diffQuery.isLoading && (
                <p
                  className="text-sm text-gray-500"
                  role="status"
                  aria-live="polite"
                >
                  差分を計算中...
                </p>
              )}

              {diffQuery.isError && (
                <div
                  className="rounded border border-red-200 bg-red-50 p-4"
                  role="alert"
                >
                  <p className="text-sm text-red-700">
                    データの取得に失敗しました
                  </p>
                  <button
                    type="button"
                    onClick={() => diffQuery.refetch()}
                    className="mt-2 rounded border border-red-300 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-100"
                  >
                    再試行
                  </button>
                </div>
              )}

              {diffQuery.data && (
                <div className="space-y-6">
                  {/* Added */}
                  <DiffSection
                    title="追加された項目"
                    count={diffQuery.data.added.length}
                    accent="emerald"
                    items={diffQuery.data.added}
                    emptyLabel="追加された項目はありません"
                    render={(it) => (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-gray-900">
                          {describeItem(it)}
                        </span>
                        {typeof it.amount === "number" && (
                          <span className="text-sm font-medium text-emerald-700">
                            {formatAmount(it.amount)}
                          </span>
                        )}
                      </div>
                    )}
                  />

                  {/* Removed */}
                  <DiffSection
                    title="削除された項目"
                    count={diffQuery.data.removed.length}
                    accent="red"
                    items={diffQuery.data.removed}
                    emptyLabel="削除された項目はありません"
                    render={(it) => (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-gray-900 line-through">
                          {describeItem(it)}
                        </span>
                        {typeof it.amount === "number" && (
                          <span className="text-sm font-medium text-red-700 line-through">
                            {formatAmount(it.amount)}
                          </span>
                        )}
                      </div>
                    )}
                  />

                  {/* Changed */}
                  <DiffSection
                    title="変更された項目"
                    count={diffQuery.data.changed.length}
                    accent="amber"
                    items={diffQuery.data.changed}
                    emptyLabel="変更された項目はありません"
                    render={(it) => (
                      <div className="text-sm text-gray-900">
                        {it.name && (
                          <p className="font-medium text-gray-900">
                            {it.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-700">
                          {changeDescription(it)}
                        </p>
                      </div>
                    )}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* 選択ガイド */}
        {sorted.length > 0 && (!baseId || !compareId) && (
          <p className="mt-6 text-center text-sm text-gray-500">
            {!baseId
              ? "差分を表示するには 2 件の改訂を選択してください"
              : "もう 1 件選択して差分を表示してください"}
          </p>
        )}
      </div>
    </div>
  );
}

function DiffSection({
  title,
  count,
  accent,
  items,
  emptyLabel,
  render,
}: {
  title: string;
  count: number;
  accent: "emerald" | "red" | "amber";
  items: DiffItem[];
  emptyLabel: string;
  render: (it: DiffItem) => React.ReactNode;
}) {
  const styles = {
    emerald: {
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      badge: "bg-emerald-600 text-white",
      dot: "bg-emerald-600",
    },
    red: {
      border: "border-red-200",
      bg: "bg-red-50",
      badge: "bg-red-600 text-white",
      dot: "bg-red-600",
    },
    amber: {
      border: "border-amber-200",
      bg: "bg-amber-50",
      badge: "bg-amber-600 text-white",
      dot: "bg-amber-600",
    },
  }[accent];

  return (
    <section aria-label={title}>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${styles.dot}`}
          aria-hidden="true"
        />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span
          className={`ml-auto inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${styles.badge}`}
        >
          {count}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          {emptyLabel}
        </p>
      ) : (
        <ul
          className={`divide-y divide-gray-200 rounded border ${styles.border} ${styles.bg}`}
        >
          {items.map((it, idx) => (
            <li key={idx} className="px-3 py-2">
              {render(it)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
