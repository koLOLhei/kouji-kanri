'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ClipboardList, ChevronLeft, Camera, Cloud } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatDate } from '@/lib/utils';
import { GRADES, type DegradationSurvey } from '@/lib/degradation-schema';

export default function DegradationSurveysPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();

  const { data: surveys = [], isLoading, isError, refetch } = useQuery<DegradationSurvey[]>({
    queryKey: ['degradation-surveys'],
    queryFn: () => apiFetch('/api/degradation-surveys', { token }),
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch<DegradationSurvey>('/api/degradation-surveys', {
        token,
        method: 'POST',
        body: JSON.stringify({ property_name: '', status: 'draft', data: {}, photos: [] }),
      }),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['degradation-surveys'] });
      router.push(`/degradation-surveys/${s.id}`);
    },
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

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">劣化診断（現地調査）</h1>
            <p className="text-sm text-gray-500 mt-1">マンション大規模修繕の劣化診断。タイル・外壁・シーリング・防水・鉄部を記録</p>
          </div>
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50"
          >
            <Plus size={16} aria-hidden="true" />
            新規調査
          </button>
        </header>

        {isError && (
          <div role="alert" className="bg-white border border-red-200 rounded-md p-4 mb-4 flex items-center justify-between">
            <p className="text-sm text-red-700">データの取得に失敗しました</p>
            <button type="button" onClick={() => refetch()} className="text-sm text-red-700 underline hover:text-red-900">
              再試行
            </button>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">読み込み中...</div>
          ) : surveys.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="mx-auto text-gray-300 mb-3" size={40} aria-hidden="true" />
              <p className="text-gray-500 mb-4">まだ劣化診断がありません</p>
              <button
                type="button"
                onClick={() => create.mutate()}
                disabled={create.isPending}
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition disabled:opacity-50"
              >
                <Plus size={16} aria-hidden="true" />
                最初の調査を作成
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {surveys.map((s) => {
                const g = s.overall_grade ? GRADES.find((x) => x.key === s.overall_grade) : null;
                return (
                  <li key={s.id}>
                    <Link href={`/degradation-surveys/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition">
                      {g ? (
                        <span className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded ${g.bg} ${g.text}`}>{g.label}</span>
                      ) : (
                        <span className="w-8 h-8 flex items-center justify-center text-sm text-gray-300 rounded bg-gray-50">—</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.property_name || '(無題の調査)'}</p>
                        {g && <p className="text-xs text-gray-400 mt-0.5">{g.desc}</p>}
                      </div>
                      {(s.photo_count ?? 0) > 0 && (
                        <span className="text-xs text-gray-400 inline-flex items-center gap-0.5">
                          <Camera size={13} aria-hidden="true" />
                          {s.photo_count}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                        <Cloud size={13} className="text-emerald-500" aria-hidden="true" />
                        {formatDate(s.updated_at)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
