'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatAmount } from '@/lib/utils';

interface CFRow {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
  cumulative: number;
}
interface CFResponse {
  months: number;
  rows: CFRow[];
  total_inflow: number;
  total_outflow: number;
  net: number;
}

const fmtMonth = (m: string) => {
  const [y, mm] = m.split('-');
  return `${y}年${Number(mm)}月`;
};

export default function CashflowPage() {
  const { token } = useAuth();
  const [months, setMonths] = useState(6);

  const { data, isLoading, isError, refetch } = useQuery<CFResponse>({
    queryKey: ['cashflow', months],
    queryFn: () => apiFetch(`/api/cashflow/forecast?months=${months}`, { token }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav aria-label="パンくず" className="mb-4">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
            <ChevronLeft size={16} aria-hidden="true" />
            ダッシュボードへ戻る
          </Link>
        </nav>

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-gray-900 text-white flex items-center justify-center">
              <TrendingUp size={20} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">資金繰り予測</h1>
              <p className="text-sm text-gray-500 mt-0.5">未回収請求(入金予定) − 未払の支払通知(支払予定) の月次キャッシュフロー</p>
            </div>
          </div>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            {[3, 6, 12].map((m) => <option key={m} value={m}>{m}ヶ月</option>)}
          </select>
        </header>

        {isError && (
          <div role="alert" className="bg-white border border-red-200 rounded-md p-4 mb-4 flex items-center justify-between">
            <p className="text-sm text-red-700">データの取得に失敗しました</p>
            <button type="button" onClick={() => refetch()} className="text-sm text-red-700 underline hover:text-red-900">再試行</button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-xs text-emerald-700">入金予定 合計</p>
            <p className="text-xl font-bold text-emerald-800 mt-1">{formatAmount(data?.total_inflow ?? 0)}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-xs text-red-700">支払予定 合計</p>
            <p className="text-xl font-bold text-red-800 mt-1">{formatAmount(data?.total_outflow ?? 0)}</p>
          </div>
          <div className="bg-gray-900 text-white rounded-lg p-4">
            <p className="text-xs text-gray-400">予測ネット</p>
            <p className={`text-xl font-bold mt-1 ${(data?.net ?? 0) < 0 ? 'text-red-300' : ''}`}>{formatAmount(data?.net ?? 0)}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">読み込み中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">月</th>
                    <th className="text-right font-medium px-4 py-2.5">入金予定</th>
                    <th className="text-right font-medium px-4 py-2.5">支払予定</th>
                    <th className="text-right font-medium px-4 py-2.5">収支</th>
                    <th className="text-right font-medium px-4 py-2.5">累積</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.rows.map((r) => (
                    <tr key={r.month} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{fmtMonth(r.month)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{formatAmount(r.inflow)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatAmount(r.outflow)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${r.net < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatAmount(r.net)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${r.cumulative < 0 ? 'text-red-700' : 'text-gray-900'}`}>{formatAmount(r.cumulative)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-400">※ 期首現金残は含みません。累積は予測期間内のキャッシュフロー累計です。期限超過分は当月に計上。</p>
      </div>
    </div>
  );
}
