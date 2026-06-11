"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wallet, FileEdit, Receipt, Coins, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatAmount } from "@/lib/utils";

interface BillingSummary {
  contract_amount: number;
  change_orders_total: number;
  billed_to_date: number;
  paid_to_date: number;
  remaining: number;
  progress_percent_amount: number;
}

interface BillingTimeseriesPoint {
  month: string; // e.g. "2026-01"
  billed: number;
  paid: number;
}

interface KpiDef {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
  aria: string;
}

export default function BillingSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const summaryQuery = useQuery<BillingSummary>({
    queryKey: ["billing-summary", id],
    queryFn: () => apiFetch<BillingSummary>(`/api/projects/${id}/billing-summary`, { token }),
  });

  const timeseriesQuery = useQuery<BillingTimeseriesPoint[]>({
    queryKey: ["billing-summary-timeseries", id],
    queryFn: () =>
      apiFetch<BillingTimeseriesPoint[]>(`/api/projects/${id}/billing-summary/timeseries`, { token }),
  });

  const summary = summaryQuery.data;
  const series = timeseriesQuery.data ?? [];

  const progressPercent = Math.max(0, Math.min(100, Math.round(summary?.progress_percent_amount ?? 0)));

  const kpis: KpiDef[] = summary
    ? [
        {
          label: "契約金額",
          value: summary.contract_amount,
          icon: Wallet,
          accent: "text-gray-900",
          aria: "契約金額",
        },
        {
          label: "変更累計",
          value: summary.change_orders_total,
          icon: FileEdit,
          accent: summary.change_orders_total >= 0 ? "text-emerald-600" : "text-red-600",
          aria: "変更契約の累計金額",
        },
        {
          label: "請求済",
          value: summary.billed_to_date,
          icon: Receipt,
          accent: "text-blue-600",
          aria: "これまでの請求済金額",
        },
        {
          label: "残額",
          value: summary.remaining,
          icon: Coins,
          accent: summary.remaining > 0 ? "text-amber-600" : "text-gray-700",
          aria: "未請求の残額",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href={`/projects/${id}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
            aria-label="案件詳細へ戻る"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            案件詳細へ戻る
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">請求サマリーダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">契約・変更・請求・入金の最新サマリーを一覧します</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {summaryQuery.isError ? (
          <ErrorState onRetry={() => summaryQuery.refetch()} />
        ) : summaryQuery.isLoading || !summary ? (
          <LoadingSkeleton />
        ) : (
          <>
            <section aria-label="主要指標" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((k) => {
                const Icon = k.icon;
                return (
                  <div
                    key={k.label}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                    role="group"
                    aria-label={k.aria}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">{k.label}</span>
                      <Icon size={16} className="text-gray-300" aria-hidden="true" />
                    </div>
                    <p className={`mt-2 text-2xl font-bold tabular-nums ${k.accent}`}>
                      {formatAmount(k.value)}
                    </p>
                  </div>
                );
              })}
            </section>

            <section
              aria-label="請求進捗"
              className="mt-6 bg-white border border-gray-200 rounded-lg p-5"
            >
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">請求進捗（金額ベース）</h2>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{progressPercent}%</span>
              </div>
              <div
                className="w-full h-3 rounded-full bg-gray-100 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                aria-label="請求進捗率"
              >
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4 text-xs text-gray-500">
                <div>
                  <span className="block text-gray-500">請求済</span>
                  <span className="text-gray-900 font-medium tabular-nums">
                    {formatAmount(summary.billed_to_date)}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-500">入金済</span>
                  <span className="text-emerald-600 font-medium tabular-nums">
                    {formatAmount(summary.paid_to_date)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-gray-500">契約 + 変更</span>
                  <span className="text-gray-900 font-medium tabular-nums">
                    {formatAmount(summary.contract_amount + summary.change_orders_total)}
                  </span>
                </div>
              </div>
            </section>

            <section
              aria-label="月別推移"
              className="mt-6 bg-white border border-gray-200 rounded-lg p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">月別推移</h2>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <LegendDot className="bg-blue-600" label="請求" />
                  <LegendDot className="bg-emerald-600" label="入金" />
                </div>
              </div>
              {timeseriesQuery.isError ? (
                <ErrorState onRetry={() => timeseriesQuery.refetch()} compact />
              ) : timeseriesQuery.isLoading ? (
                <div className="h-56 animate-pulse bg-gray-100 rounded" />
              ) : series.length === 0 ? (
                <EmptyState />
              ) : (
                <TimeseriesChart data={series} />
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${className}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-gray-500">まだ月別の請求・入金データがありません</p>
      <p className="mt-1 text-xs text-gray-400">請求書を作成すると、ここに集計が表示されます</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white border border-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-32 bg-white border border-gray-200 rounded-lg animate-pulse" />
      <div className="h-72 bg-white border border-gray-200 rounded-lg animate-pulse" />
    </div>
  );
}

function ErrorState({ onRetry, compact }: { onRetry: () => void; compact?: boolean }) {
  return (
    <div
      className={`${compact ? "py-8" : "py-16"} bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center text-center`}
      role="alert"
    >
      <p className="text-sm text-red-600">データの取得に失敗しました</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
        aria-label="再試行"
      >
        <RefreshCw size={14} aria-hidden="true" />
        再試行
      </button>
    </div>
  );
}

function TimeseriesChart({ data }: { data: BillingTimeseriesPoint[] }) {
  const width = 800;
  const height = 260;
  const padding = { top: 16, right: 16, bottom: 36, left: 56 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const max = Math.max(1, ...data.flatMap((d) => [d.billed, d.paid]));
  const niceMax = niceCeil(max);

  const groupWidth = innerW / data.length;
  const barWidth = Math.max(4, Math.min(18, (groupWidth - 8) / 2));

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (niceMax / yTicks) * i);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-64"
        role="img"
        aria-label="月別の請求と入金の推移を示す棒グラフ"
      >
        {ticks.map((t, i) => {
          const y = padding.top + innerH - (t / niceMax) * innerH;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={padding.left + innerW}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                textAnchor="end"
                fontSize={10}
                fill="#6b7280"
              >
                {abbrevAmount(t)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const groupX = padding.left + groupWidth * i + (groupWidth - barWidth * 2 - 4) / 2;
          const billedH = (d.billed / niceMax) * innerH;
          const paidH = (d.paid / niceMax) * innerH;
          return (
            <g key={d.month}>
              <rect
                x={groupX}
                y={padding.top + innerH - billedH}
                width={barWidth}
                height={billedH}
                fill="#2563eb"
                rx={1}
              >
                <title>{`${d.month} 請求: ${formatAmount(d.billed)}`}</title>
              </rect>
              <rect
                x={groupX + barWidth + 4}
                y={padding.top + innerH - paidH}
                width={barWidth}
                height={paidH}
                fill="#059669"
                rx={1}
              >
                <title>{`${d.month} 入金: ${formatAmount(d.paid)}`}</title>
              </rect>
              <text
                x={groupX + barWidth + 2}
                y={padding.top + innerH + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {shortMonth(d.month)}
              </text>
            </g>
          );
        })}

        <line
          x1={padding.left}
          x2={padding.left + innerW}
          y1={padding.top + innerH}
          y2={padding.top + innerH}
          stroke="#9ca3af"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}

function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(n)));
  const m = n / exp;
  let nice: number;
  if (m <= 1) nice = 1;
  else if (m <= 2) nice = 2;
  else if (m <= 5) nice = 5;
  else nice = 10;
  return nice * exp;
}

function abbrevAmount(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}億`;
  if (n >= 1e4) return `${Math.round(n / 1e4)}万`;
  return `${n}`;
}

function shortMonth(month: string): string {
  // "2026-01" -> "1月"  /  fallback raw
  const m = /^\d{4}-(\d{2})$/.exec(month);
  if (!m) return month;
  return `${parseInt(m[1], 10)}月`;
}
