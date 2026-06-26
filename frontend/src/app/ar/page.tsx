'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Wallet, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatAmount, formatDate } from '@/lib/utils';

interface AgingInvoice {
  invoice_id: string;
  invoice_number: string | null;
  project_id: string | null;
  customer_name: string | null;
  total: number;
  paid: number;
  balance: number;
  due_date: string | null;
  days_overdue: number;
  bucket: string;
}

interface AgingResponse {
  total_ar: number;
  unallocated: number;
  net_ar: number;
  buckets: Record<string, number>;
  count: number;
  invoices: AgingInvoice[];
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

export default function AccountsReceivablePage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [payFor, setPayFor] = useState<AgingInvoice | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<AgingResponse>({
    queryKey: ['ar-aging'],
    queryFn: () => apiFetch('/api/ar/aging', { token }),
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
            <Wallet size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">売掛金・入金管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">未回収の請求書と滞留状況。入金を記録して消し込みます。</p>
          </div>
        </header>

        {isError && (
          <div role="alert" className="bg-white border border-red-200 rounded-md p-4 mb-4 flex items-center justify-between">
            <p className="text-sm text-red-700">データの取得に失敗しました</p>
            <button type="button" onClick={() => refetch()} className="text-sm text-red-700 underline hover:text-red-900">再試行</button>
          </div>
        )}

        {/* エイジング サマリー */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-gray-900 text-white rounded-lg p-4">
            <p className="text-xs text-gray-400">純売掛{(data?.unallocated ?? 0) > 0 ? '（前受控除後）' : ''}</p>
            <p className="text-xl font-bold mt-1">{formatAmount(data?.net_ar ?? data?.total_ar ?? 0)}</p>
            {(data?.unallocated ?? 0) > 0 && (
              <p className="text-[11px] text-gray-400 mt-1">
                売掛 {formatAmount(data?.total_ar ?? 0)} − 前受 {formatAmount(data?.unallocated ?? 0)}
              </p>
            )}
          </div>
          {BUCKETS.map((b) => (
            <div key={b.key} className={`rounded-lg p-4 border ${b.cls}`}>
              <p className="text-xs opacity-80">{b.label}</p>
              <p className="text-lg font-bold mt-1">{formatAmount(data?.buckets?.[b.key] ?? 0)}</p>
            </div>
          ))}
        </div>

        {/* 未回収請求書 一覧 */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">読み込み中...</div>
          ) : !data || data.invoices.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="mx-auto text-gray-300 mb-3" size={40} aria-hidden="true" />
              <p className="text-gray-500">未回収の請求書はありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">請求番号 / 宛先</th>
                    <th className="text-right font-medium px-4 py-2.5">請求額</th>
                    <th className="text-right font-medium px-4 py-2.5">入金済</th>
                    <th className="text-right font-medium px-4 py-2.5">残高</th>
                    <th className="text-center font-medium px-4 py-2.5">支払期限 / 滞留</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.invoices.map((inv) => (
                    <tr key={inv.invoice_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{inv.invoice_number ?? '—'}</p>
                        <p className="text-xs text-gray-400">{inv.customer_name ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatAmount(inv.total)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{formatAmount(inv.paid)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAmount(inv.balance)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-xs text-gray-500">{formatDate(inv.due_date)}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-[11px] rounded border ${bucketCls(inv.bucket)}`}>
                          {inv.days_overdue > 0 ? `${inv.days_overdue}日滞留` : bucketLabel(inv.bucket)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setPayFor(inv)}
                          className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-700 transition"
                        >
                          入金記録
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

      {payFor && (
        <PaymentModal
          invoice={payFor}
          token={token}
          onClose={() => setPayFor(null)}
          onDone={() => {
            setPayFor(null);
            qc.invalidateQueries({ queryKey: ['ar-aging'] });
          }}
        />
      )}
    </div>
  );
}

function PaymentModal({
  invoice,
  token,
  onClose,
  onDone,
}: {
  invoice: AgingInvoice;
  token: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState<number>(invoice.balance);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<string>('振込');

  const record = useMutation({
    mutationFn: () =>
      apiFetch(`/api/projects/${invoice.project_id}/payments`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          invoice_id: invoice.invoice_id,
          amount,
          payment_date: paymentDate,
          method,
        }),
      }),
    onSuccess: onDone,
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">入金記録</h2>
          <button type="button" onClick={onClose} aria-label="閉じる" className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {invoice.invoice_number} / 残高 <span className="font-semibold text-gray-900">{formatAmount(invoice.balance)}</span>
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">入金額</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">入金日</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">入金方法</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {['振込', '現金', '手形', '相殺', 'その他'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        {record.isError && <p className="mt-3 text-xs text-red-600">記録に失敗しました。入力を確認してください。</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => record.mutate()}
            disabled={record.isPending || amount <= 0}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            {record.isPending ? '記録中…' : '記録する'}
          </button>
        </div>
      </div>
    </div>
  );
}
