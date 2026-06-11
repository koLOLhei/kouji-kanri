'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, X, FileSpreadsheet, Pencil, Eye, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatAmount, formatDate } from '@/lib/utils';
import { API_BASE } from '@/lib/api-base';

interface EstimateItem {
  name: string;
  amount: number;
}

interface Estimate {
  id: string;
  estimate_number: string;
  project_name: string;
  customer_name?: string;
  amount: number;
  status: string;
  created_at: string;
  revision_no?: number;
  kind?: string;
  approval_status?: string;
  cost_amount?: number;
  gross_profit_rate?: number;
}

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border border-blue-200',
  accepted: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
};

const statusLabel: Record<string, string> = {
  draft: '下書き',
  sent: '進行中',
  accepted: '承認済',
  rejected: '差戻',
  pending: '承認待ち',
};

const approvalColor: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
  in_progress: 'bg-blue-50 text-blue-700 border border-blue-200',
  none: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const approvalLabel: Record<string, string> = {
  approved: '承認済',
  pending: '承認待ち',
  rejected: '差戻',
  in_progress: '進行中',
  none: '未申請',
};

const kindLabel: Record<string, string> = {
  initial: '初回',
  revision: '改訂',
  change: '変更',
  final: '最終',
};

function calcProfitRate(e: Estimate): number | null {
  if (typeof e.gross_profit_rate === 'number') return e.gross_profit_rate;
  if (typeof e.cost_amount === 'number' && e.amount > 0) {
    return ((e.amount - e.cost_amount) / e.amount) * 100;
  }
  return null;
}

function profitRateClass(rate: number | null): string {
  if (rate === null) return 'text-gray-400';
  if (rate >= 20) return 'text-emerald-600 font-semibold';
  if (rate >= 10) return 'text-gray-900';
  if (rate >= 0) return 'text-amber-600';
  return 'text-red-600 font-semibold';
}

export default function EstimatesPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ project_name: '', customer_name: '', notes: '' });
  const [items, setItems] = useState<EstimateItem[]>([{ name: '', amount: 0 }]);

  const { data: estimates = [], isLoading, isError, refetch } = useQuery<Estimate[]>({
    queryKey: ['estimates'],
    queryFn: () => apiFetch('/api/estimates', { token }),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch('/api/estimates', { token, method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estimates'] });
      setOpen(false);
      setForm({ project_name: '', customer_name: '', notes: '' });
      setItems([{ name: '', amount: 0 }]);
    },
  });

  const subtotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  const updateItem = (idx: number, key: keyof EstimateItem, val: string | number) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: val };
    setItems(next);
  };

  const exportXlsx = (id: string) => {
    const url = `${API_BASE}/api/estimates/${id}/export.xlsx${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav aria-label="パンくず" className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            ダッシュボードへ戻る
          </Link>
        </nav>

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">見積書管理</h1>
            <p className="text-sm text-gray-500 mt-1">改訂・承認・粗利を一覧で管理</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="新規見積を作成"
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            <Plus size={16} aria-hidden="true" />
            新規見積
          </button>
        </header>

        {isError && (
          <div
            role="alert"
            className="bg-white border border-red-200 rounded-md p-4 mb-4 flex items-center justify-between"
          >
            <p className="text-sm text-red-700">データの取得に失敗しました</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-sm text-red-700 underline hover:text-red-900"
            >
              再試行
            </button>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">読み込み中...</div>
          ) : estimates.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto text-gray-300 mb-3" size={40} aria-hidden="true" />
              <p className="text-gray-500 mb-4">まだ見積書がありません</p>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition"
              >
                <Plus size={16} aria-hidden="true" />
                最初の見積を作成
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">見積番号</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">改訂No</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">種別</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">工事名</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">金額</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">粗利率</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">状態</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">承認</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">作成日</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">アクション</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {estimates.map((e) => {
                    const rate = calcProfitRate(e);
                    const approval = e.approval_status || 'none';
                    return (
                      <tr key={e.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-gray-400" aria-hidden="true" />
                            <span className="font-medium text-gray-900">{e.estimate_number}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {typeof e.revision_no === 'number' ? `Rev.${e.revision_no}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {e.kind ? (kindLabel[e.kind] || e.kind) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{e.project_name}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatAmount(e.amount)}
                        </td>
                        <td className={`px-4 py-3 text-right ${profitRateClass(rate)}`}>
                          {rate === null ? '-' : `${rate.toFixed(1)}%`}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded-full ${statusColor[e.status] || 'bg-gray-100 text-gray-700 border border-gray-200'}`}
                          >
                            {statusLabel[e.status] || e.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded-full ${approvalColor[approval] || approvalColor.none}`}
                          >
                            {approvalLabel[approval] || approval}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(e.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/estimates/${e.id}`}
                              aria-label={`${e.estimate_number} の詳細を表示`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-700 border border-gray-200 rounded hover:bg-gray-100 transition"
                            >
                              <Eye size={14} aria-hidden="true" />
                              詳細
                            </Link>
                            <Link
                              href={`/estimates/${e.id}/edit`}
                              aria-label={`${e.estimate_number} を編集`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-700 border border-gray-200 rounded hover:bg-gray-100 transition"
                            >
                              <Pencil size={14} aria-hidden="true" />
                              編集
                            </Link>
                            <button
                              type="button"
                              onClick={() => exportXlsx(e.id)}
                              aria-label={`${e.estimate_number} を Excel 出力`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-50 transition"
                            >
                              <FileSpreadsheet size={14} aria-hidden="true" />
                              Excel
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
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-estimate-title"
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 id="new-estimate-title" className="text-lg font-bold text-gray-900">
                見積書作成
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="text-gray-500 hover:text-gray-900"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate({ ...form, items, subtotal, tax, total });
              }}
              className="space-y-3"
            >
              <input
                placeholder="工事名"
                value={form.project_name}
                onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
                aria-label="工事名"
              />
              <input
                placeholder="顧客名"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
                aria-label="顧客名"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">明細</label>
                {items.map((it, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      placeholder="項目名"
                      value={it.name}
                      onChange={(e) => updateItem(i, 'name', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      required
                      aria-label={`明細${i + 1} 項目名`}
                    />
                    <input
                      type="number"
                      placeholder="金額"
                      value={it.amount || ''}
                      onChange={(e) => updateItem(i, 'amount', Number(e.target.value))}
                      className="w-32 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      required
                      aria-label={`明細${i + 1} 金額`}
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, j) => j !== i))}
                        aria-label={`明細${i + 1}を削除`}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setItems([...items, { name: '', amount: 0 }])}
                  className="text-sm text-gray-700 hover:text-gray-900 underline"
                >
                  + 明細追加
                </button>
              </div>
              <textarea
                placeholder="備考"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                rows={2}
                aria-label="備考"
              />
              <div className="text-right space-y-1 text-sm text-gray-700">
                <p>小計: {formatAmount(subtotal)}</p>
                <p>消費税(10%): {formatAmount(tax)}</p>
                <p className="font-bold text-base text-gray-900">合計: {formatAmount(total)}</p>
              </div>
              {create.isError && (
                <p role="alert" className="text-sm text-red-600">
                  作成に失敗しました
                </p>
              )}
              <button
                type="submit"
                disabled={create.isPending}
                className="w-full bg-gray-900 text-white py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
              >
                {create.isPending ? '作成中...' : '作成'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
