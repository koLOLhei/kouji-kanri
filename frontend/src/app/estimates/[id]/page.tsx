"use client";

import { useState, use, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Pencil,
  Ruler,
  FileSignature,
  Lightbulb,
  History,
  FileSpreadsheet,
  Send,
  AlertCircle,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import { API_BASE } from "@/lib/api-base";

// ---------- 型定義 ----------

interface EstimateItem {
  id: string;
  section_id: string;
  sort_order: number | null;
  name: string;
  specification: string | null;
  quantity: number;
  unit: string | null;
  sale_unit_price: number;
  sale_amount: number;
  cost_unit_price: number;
  cost_amount: number;
  profit_amount: number;
  profit_rate: number;
  quantity_source_id: string | null;
  work_type_code: string | null;
  note: string | null;
}

interface EstimateSection {
  id: string;
  estimate_id: string;
  parent_section_id: string | null;
  code: string | null;
  name: string;
  sort_order: number | null;
  level: number | null;
  sale_subtotal: number;
  cost_subtotal: number;
  profit_subtotal: number;
  items: EstimateItem[];
}

interface EstimateHeader {
  id: string;
  tenant_id: string;
  estimate_number: string | null;
  project_name: string;
  customer_id: string | null;
  customer_name: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  cost_subtotal: number;
  gross_profit: number;
  gross_profit_rate: number;
  status: string | null;
  approval_status?: string | null;
  revision_no?: number | null;
  conditions_html: string | null;
  project_id: string | null;
  project_type_template_id: string | null;
  notes: string | null;
}

interface FullEstimateResponse {
  estimate: EstimateHeader;
  sections: EstimateSection[];
}

// ---------- ヘルパー ----------

const yen = (n: number | null | undefined) =>
  n == null ? "-" : `¥${Math.round(n).toLocaleString()}`;

const pct = (n: number | null | undefined) =>
  n == null ? "-" : `${(Math.round(n * 10) / 10).toFixed(1)}%`;

const APPROVAL_STATUSES: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  not_submitted: {
    label: "未申請",
    className: "bg-gray-100 text-gray-700 border-gray-300",
    dot: "bg-gray-400",
  },
  pending: {
    label: "承認待ち",
    className: "bg-amber-50 text-amber-700 border-amber-300",
    dot: "bg-amber-500",
  },
  approved: {
    label: "承認済み",
    className: "bg-emerald-50 text-emerald-700 border-emerald-300",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "却下",
    className: "bg-red-50 text-red-700 border-red-300",
    dot: "bg-red-500",
  },
};

function approvalBadge(status: string | null | undefined) {
  const key = status && APPROVAL_STATUSES[status] ? status : "not_submitted";
  return APPROVAL_STATUSES[key];
}

// ---------- ページ本体 ----------

export default function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuth();
  const qc = useQueryClient();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<FullEstimateResponse>({
    queryKey: ["estimate-full", id],
    queryFn: () =>
      apiFetch<FullEstimateResponse>(`/api/estimates/${id}/full`, { token }),
    enabled: !!token,
  });

  const submitApproval = useMutation({
    mutationFn: () =>
      apiFetch(`/api/estimates/${id}/submit-approval`, {
        token,
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      setSubmitError(null);
      qc.invalidateQueries({ queryKey: ["estimate-full", id] });
    },
    onError: (e: Error) => setSubmitError(e.message),
  });

  const exportExcel = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/estimates/${id}/export.xlsx`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Excel 出力に失敗しました (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estimate_${id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Excel 出力に失敗しました"
      );
    }
  };

  const toggle = (sid: string) =>
    setCollapsed((c) => ({ ...c, [sid]: !c[sid] }));

  const totals = useMemo(() => {
    if (!data) {
      return { sale: 0, cost: 0, profit: 0, rate: 0 };
    }
    const sale = data.estimate.subtotal || 0;
    const cost = data.estimate.cost_subtotal || 0;
    const profit =
      data.estimate.gross_profit ?? Math.max(0, sale - cost);
    const rate =
      data.estimate.gross_profit_rate ?? (sale > 0 ? (profit / sale) * 100 : 0);
    return { sale, cost, profit, rate };
  }, [data]);

  // ---------- レンダリング: ローディング/エラー ----------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div
            className="animate-pulse space-y-4"
            aria-label="読み込み中"
            role="status"
          >
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-32 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/estimates"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            見積書一覧へ戻る
          </Link>
          <div
            className="bg-white border border-gray-200 rounded-lg p-8 text-center"
            role="alert"
          >
            <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-3" />
            <p className="text-gray-900 font-medium mb-1">
              データの取得に失敗しました
            </p>
            <p className="text-sm text-gray-500 mb-4">
              ネットワーク接続を確認するか、しばらく待ってから再試行してください。
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { estimate, sections } = data;
  const badge = approvalBadge(estimate.approval_status);
  const projectBackHref = estimate.project_id
    ? `/projects/${estimate.project_id}`
    : "/estimates";
  const projectBackLabel = estimate.project_id
    ? "案件詳細へ戻る"
    : "見積書一覧へ戻る";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* パンくず */}
        <div className="mb-4">
          <Link
            href={projectBackHref}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {projectBackLabel}
          </Link>
        </div>

        {/* ヘッダー */}
        <header
          className="bg-gray-900 text-white rounded-lg p-6 mb-6"
          aria-label="見積書ヘッダー"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-gray-400">
                  {estimate.estimate_number || "番号未採番"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                  aria-label={`承認状態: ${badge.label}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}
                    aria-hidden
                  />
                  {badge.label}
                </span>
                {estimate.revision_no != null && estimate.revision_no > 0 && (
                  <span className="text-xs text-gray-300">
                    Rev. {estimate.revision_no}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold truncate">
                {estimate.project_name || "（工事件名未設定）"}
              </h1>
              <p className="text-sm text-gray-300 mt-1">
                {estimate.customer_name || "顧客未設定"}
              </p>
            </div>
            <div className="lg:text-right">
              <div className="text-xs text-gray-400">合計金額（税込）</div>
              <div className="text-3xl font-bold tabular-nums">
                {yen(estimate.total)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                税抜 {yen(estimate.subtotal)} / 税 {yen(estimate.tax_amount)}
              </div>
            </div>
          </div>
        </header>

        {/* メイン + 右ペイン */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メイン: セクションツリー */}
          <section
            className="lg:col-span-2 space-y-4"
            aria-label="見積書 階層ツリー"
          >
            {sections.length === 0 ? (
              <EmptyState estimateId={id} />
            ) : (
              sections.map((sec) => (
                <SectionCard
                  key={sec.id}
                  section={sec}
                  collapsed={!!collapsed[sec.id]}
                  onToggle={() => toggle(sec.id)}
                />
              ))
            )}
          </section>

          {/* 右ペイン: サマリー */}
          <aside
            className="space-y-4"
            aria-label="金額サマリーと操作"
          >
            <div className="bg-white border border-gray-200 rounded-lg p-5 sticky top-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                金額サマリー
              </h2>
              <dl className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <dt className="text-sm text-gray-500">売上合計</dt>
                  <dd className="text-base font-semibold text-gray-900 tabular-nums">
                    {yen(totals.sale)}
                  </dd>
                </div>
                <div className="flex justify-between items-baseline">
                  <dt className="text-sm text-gray-500">原価合計</dt>
                  <dd className="text-base font-semibold text-gray-900 tabular-nums">
                    {yen(totals.cost)}
                  </dd>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between items-baseline">
                  <dt className="text-sm text-gray-700">粗利</dt>
                  <dd className="text-base font-semibold text-emerald-600 tabular-nums">
                    {yen(totals.profit)}
                  </dd>
                </div>
                <div className="flex justify-between items-baseline">
                  <dt className="text-sm text-gray-700">粗利率</dt>
                  <dd className="text-base font-semibold text-emerald-600 tabular-nums">
                    {pct(totals.rate)}
                  </dd>
                </div>
              </dl>

              <Link
                href={`/estimates/${id}/revisions`}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
              >
                <History className="h-4 w-4" />
                改訂履歴を見る
              </Link>
            </div>
          </aside>
        </div>

        {/* 下部アクション */}
        <div
          className="mt-6 bg-white border border-gray-200 rounded-lg p-4"
          aria-label="操作"
        >
          {submitError && (
            <div
              className="mb-3 p-3 border border-red-300 bg-red-50 text-red-700 text-sm rounded flex items-start gap-2"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <ActionLink href={`/estimates/${id}/edit`} icon={<Pencil className="h-4 w-4" />}>
              編集
            </ActionLink>
            <ActionLink
              href={`/estimates/${id}/quantities`}
              icon={<Ruler className="h-4 w-4" />}
            >
              数量
            </ActionLink>
            <ActionLink
              href={`/estimates/${id}/conditions`}
              icon={<FileSignature className="h-4 w-4" />}
            >
              条件
            </ActionLink>
            <ActionLink
              href={`/estimates/${id}/proposals`}
              icon={<Lightbulb className="h-4 w-4" />}
            >
              提案項目
            </ActionLink>
            <ActionLink
              href={`/estimates/${id}/revisions`}
              icon={<History className="h-4 w-4" />}
            >
              改訂履歴
            </ActionLink>
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
              aria-label="Excel 出力"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel出力
            </button>
            <button
              onClick={() => submitApproval.mutate()}
              disabled={
                submitApproval.isPending ||
                estimate.approval_status === "pending" ||
                estimate.approval_status === "approved" ||
                isFetching
              }
              className="ml-auto inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              aria-label="承認申請"
            >
              <Send className="h-4 w-4" />
              {submitApproval.isPending ? "送信中..." : "承認申請"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- サブコンポーネント ----------

function ActionLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
    >
      {icon}
      {children}
    </Link>
  );
}

function SectionCard({
  section,
  collapsed,
  onToggle,
}: {
  section: EstimateSection;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const items = section.items || [];
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left border-b border-gray-200"
        aria-expanded={!collapsed}
        aria-controls={`section-${section.id}`}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
        )}
        {section.code && (
          <span className="text-xs font-mono text-gray-500 shrink-0">
            {section.code}
          </span>
        )}
        <span className="font-semibold text-gray-900 truncate flex-1">
          {section.name}
        </span>
        <span className="text-sm text-gray-500 tabular-nums shrink-0">
          売上 {yen(section.sale_subtotal)} / 原価 {yen(section.cost_subtotal)}
        </span>
      </button>

      {!collapsed && (
        <div id={`section-${section.id}`} className="overflow-x-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              まだ明細項目がありません
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-4 py-2 font-medium">項目</th>
                  <th className="px-4 py-2 font-medium text-right">数量</th>
                  <th className="px-4 py-2 font-medium">単位</th>
                  <th className="px-4 py-2 font-medium text-right">売上単価</th>
                  <th className="px-4 py-2 font-medium text-right">売上金額</th>
                  <th className="px-4 py-2 font-medium text-right">原価金額</th>
                  <th className="px-4 py-2 font-medium text-right">粗利率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="text-gray-900 font-medium">{it.name}</div>
                      {it.specification && (
                        <div className="text-xs text-gray-500">
                          {it.specification}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-900">
                      {it.quantity?.toLocaleString() ?? "-"}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {it.unit || "-"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                      {yen(it.sale_unit_price)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-900 font-medium">
                      {yen(it.sale_amount)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                      {yen(it.cost_amount)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-emerald-600">
                      {pct(it.profit_rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ estimateId }: { estimateId: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
      <Inbox className="h-10 w-10 text-gray-400 mx-auto mb-3" />
      <p className="text-gray-900 font-medium mb-1">
        まだセクションがありません
      </p>
      <p className="text-sm text-gray-500 mb-4">
        編集画面からセクションと明細を追加してください。
      </p>
      <Link
        href={`/estimates/${estimateId}/edit`}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700"
      >
        <Pencil className="h-4 w-4" />
        編集画面を開く
      </Link>
    </div>
  );
}
