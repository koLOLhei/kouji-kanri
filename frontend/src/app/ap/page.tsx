'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatAmount, formatDate } from '@/lib/utils';

interface AgingNotice {
  notice_id: string;
  notice_number: string | null;
  project_id: string | null;
  subcontractor_id: string | null;
  total: number;
  payment_date: string | null;
  days_overdue: number;
  bucket: string;
}
interface ApResponse {
  total_ap: number;
  buckets: Record<string, number>;
  count: number;
  notices: AgingNotice[];
}

const BUCKETS: { key: string; label: string; cls: string }[] = [
  { key: 'current', label: '期限内', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { key: 'd1_30', label: '1〜30日', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  { key: 'd31_60', label: '31〜60日', cls: 'text-orange-700 bg-orange-50 border-orange-200' },
  { key: 'd61_90', label: '61〜90日', cls: 'text-red-700 bg-red-50 border-red-200' },
  { key: 'over90', label: '90日超', cls: 'text-red-800 bg-red-100 border-red-300' },
];
const bucketLabel = (k: string) => BUCKETS.find((b) => b.key === k)?.label ?? k;
const bucketCls = (k: string) => BUCKETS.find((b) => b.key === k)?.cls ?? 'text-gray-600 bg-gray-50 border-gray-200';

export default function AccountsPayablePage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<ApResponse>({
    queryKey: ['ap-aging'],
    queryFn: () => apiFetch('/api/ap/aging', { token }),
  });

  const settle = useMutation({
    mutationFn: (n: AgingNotice) =>
      apiFetch(`/api/projects/${n.project_id}/payment-notices/${n.notice_id}/settle`, {
        token,
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ap-aging'] }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav aria-label="パンくず" className="mb-4">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
            <ChevronLeft size={16} aria-hidden="true" />
            ダッシュボードへ戻る
          </Link>
        </nav>

        <header className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-md bg-gray-900 text-white flex items-center justify-center">
            <CreditCard size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">買掛金・支払予定</h1>
            <p className="text-sm text-gray-500 mt-0.5">未払の支払通知（下請）と滞留。支払が済んだら消込します。</p>
          </div>
        </header>

        {isError && (
          <div role="alert" className="bg-white border border-red-200 rounded-md p-4 mb-4 flex items-center justify-between">
            <p className="text-sm text-red-700">データの取得に失敗しました</p>
            <button type="button" onClick={() => refetch()} className="text-sm text-red-700 underline hover:text-red-900">再試行</button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-gray-900 text-white rounded-lg p-4">
            <p className="text-xs text-gray-400">買掛金合計</p>
            <p className="text-xl font-bold mt-1">{formatAmount(data?.total_ap ?? 0)}</p>
          </div>
          {BUCKETS.map((b) => (
            <div key={b.key} className={`rounded-lg p-4 border ${b.cls}`}>
              <p className="text-xs opacity-80">{b.label}</p>
              <p className="text-lg font-bold mt-1">{formatAmount(data?.buckets?.[b.key] ?? 0)}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">読み込み中...</div>
          ) : !data || data.notices.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="mx-auto text-gray-300 mb-3" size={40} aria-hidden="true" />
              <p className="text-gray-500">未払の支払通知はありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">支払通知番号</th>
                    <th className="text-right font-medium px-4 py-2.5">支払額</th>
                    <th className="text-center font-medium px-4 py-2.5">支払期日 / 滞留</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.notices.map((n) => (
                    <tr key={n.notice_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{n.notice_number ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAmount(n.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-xs text-gray-500">{formatDate(n.payment_date)}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-[11px] rounded border ${bucketCls(n.bucket)}`}>
                          {n.days_overdue > 0 ? `${n.days_overdue}日滞留` : bucketLabel(n.bucket)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => settle.mutate(n)}
                          disabled={settle.isPending}
                          className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-700 transition disabled:opacity-50"
                        >
                          支払消込
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
