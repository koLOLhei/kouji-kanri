'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, X, Info } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/utils';

interface SpecialSpec {
  id: string;
  title: string;
  chapter_ref: string;
  content_summary: string;
  priority: number;
  created_at: string;
}

interface PriorityItem {
  rank: number;
  name: string;
}

const PRIORITY_ORDER = [
  { rank: 1, name: '質問回答書', color: 'bg-red-500' },
  { rank: 2, name: '現場説明書', color: 'bg-orange-500' },
  { rank: 3, name: '特記仕様書', color: 'bg-yellow-500' },
  { rank: 4, name: '図面', color: 'bg-blue-500' },
  { rank: 5, name: '標準仕様書', color: 'bg-gray-500' },
];

export default function SpecialSpecsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    chapter_ref: '',
    content_summary: '',
    priority: 3,
  });

  const { data: specs = [] } = useQuery<SpecialSpec[]>({
    queryKey: ['special-specs', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/special-specs`),
  });

  const { data: priorityList } = useQuery<PriorityItem[]>({
    queryKey: ['special-specs-priority', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/special-specs/priority-list`),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch(`/api/projects/${projectId}/special-specs`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-specs', projectId] });
      setShowForm(false);
      setForm({ title: '', chapter_ref: '', content_summary: '', priority: 3 });
    },
  });

  const sortedSpecs = [...specs].sort((a, b) => a.priority - b.priority);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">特記仕様書管理</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? '閉じる' : '新規追加'}
          </button>
        </div>

        {/* Priority Explanation */}
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-gray-900">設計図書の優先順位</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {PRIORITY_ORDER.map((item, idx) => (
              <div key={item.rank} className="flex items-center gap-1">
                <span className={`w-6 h-6 rounded-full ${item.color} text-white text-xs flex items-center justify-center font-bold`}>
                  {item.rank}
                </span>
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
                {idx < PRIORITY_ORDER.length - 1 && (
                  <span className="text-gray-400 mx-1">&gt;</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">特記仕様書追加</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="例: 外壁仕上げに関する特記事項"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">章節参照</label>
                  <input
                    type="text"
                    value={form.chapter_ref}
                    onChange={(e) => setForm({ ...form, chapter_ref: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="例: 第3章 第2節"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容概要</label>
                <textarea
                  value={form.content_summary}
                  onChange={(e) => setForm({ ...form, content_summary: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 h-24 resize-y"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {PRIORITY_ORDER.map((item) => (
                    <option key={item.rank} value={item.rank}>
                      {item.rank}. {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {createMutation.isPending ? '保存中...' : '保存'}
              </button>
            </form>
          </div>
        )}

        {/* Specs List */}
        <div className="space-y-3">
          {sortedSpecs.map((spec) => {
            const priorityInfo = PRIORITY_ORDER.find((p) => p.rank === spec.priority);
            return (
              <div key={spec.id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <span
                    className={`w-8 h-8 rounded-full ${priorityInfo?.color ?? 'bg-gray-400'} text-white text-sm flex items-center justify-center font-bold shrink-0`}
                  >
                    {spec.priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{spec.title}</h3>
                      {spec.chapter_ref && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {spec.chapter_ref}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{spec.content_summary}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {sortedSpecs.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
              特記仕様書がありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
