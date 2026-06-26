'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, HardHat, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatAmount } from '@/lib/utils';

interface LaborRow {
  worker_id: string;
  worker_name: string;
  daily_wage: number;
  man_days: number;
  cost: number;
}
interface LaborResponse {
  workers: LaborRow[];
  total_cost: number;
  total_man_days: number;
}

export default function LaborCostPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, isError, refetch } = useQuery<LaborResponse>({
    queryKey: ['labor-cost', id],
    queryFn: () => apiFetch(`/api/projects/${id}/labor-cost`, { token }),
    enabled: !!id && !!token,
  });

  const post = useMutation({
    mutationFn: () =>
      apiFetch(`/api/projects/${id}/labor-cost/post-to-cost`, { token, method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['costs', id] }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav aria-label="パンくず" className="mb-4">
          <Link href={`/projects/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
            <ChevronLeft size={16} aria-hidden="true" />
            案件詳細へ戻る
          </Link>
        </nav>

        <header className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-md bg-gray-900 text-white flex items-center justify-center">
            <HardHat size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">労務原価（出面集計）</h1>
            <p className="text-sm text-gray-500 mt-0.5">出面 × 作業員の日当で労務費を算出し、実績原価に計上します。</p>
          </div>
        </header>

        {isError && (
          <div role="alert" className="bg-white border border-red-200 rounded-md p-4 mb-4 flex items-center justify-between">
            <p className="text-sm text-red-700">データの取得に失敗しました</p>
            <button type="button" onClick={() => refetch()} className="text-sm text-red-700 underline hover:text-red-900">再試行</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">延べ人工</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{data?.total_man_days ?? 0} 人工</p>
          </div>
          <div className="bg-gray-900 text-white rounded-lg p-4">
            <p className="text-xs text-gray-400">労務費 合計</p>
            <p className="text-xl font-bold mt-1">{formatAmount(data?.total_cost ?? 0)}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">読み込み中...</div>
          ) : !data || data.workers.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              出面記録がありません（作業員の日当が未登録の場合は0円になります）。
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">作業員</th>
                  <th className="text-right font-medium px-4 py-2.5">日当</th>
                  <th className="text-right font-medium px-4 py-2.5">人工</th>
                  <th className="text-right font-medium px-4 py-2.5">労務費</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.workers.map((w) => (
                  <tr key={w.worker_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{w.worker_name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatAmount(w.daily_wage)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{w.man_days}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAmount(w.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => post.mutate()}
            disabled={post.isPending || !data || data.total_cost <= 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700 transition disabled:opacity-50"
          >
            <Check size={16} aria-hidden="true" />
            {post.isPending ? '計上中…' : '実績原価(労務費)に計上'}
          </button>
          {post.isSuccess && <span className="text-sm text-emerald-700">計上しました</span>}
          {post.isError && <span className="text-sm text-red-600">計上に失敗しました</span>}
        </div>
      </div>
    </div>
  );
}
