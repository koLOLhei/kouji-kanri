'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileImage, Plus, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/utils';

interface CompletionDrawing {
  id: string;
  title: string;
  category: string;
  drawing_number: string;
  status: 'draft' | 'review' | 'approved';
  created_at: string;
}

interface Progress {
  draft: number;
  review: number;
  approved: number;
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: '作成中', bg: 'bg-gray-100', text: 'text-gray-700' },
  review: { label: 'レビュー中', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  approved: { label: '承認済', bg: 'bg-green-100', text: 'text-green-700' },
};

const CATEGORIES = ['建築', '構造', '機械', '電気'];

export default function CompletionDrawingsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: '建築',
    drawing_number: '',
  });

  const { data: drawings = [] } = useQuery<CompletionDrawing[]>({
    queryKey: ['completion-drawings', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/completion-drawings`),
  });

  const { data: progress } = useQuery<Progress>({
    queryKey: ['completion-drawings-progress', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/completion-drawings/progress`),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch(`/api/projects/${projectId}/completion-drawings`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completion-drawings', projectId] });
      queryClient.invalidateQueries({ queryKey: ['completion-drawings-progress', projectId] });
      setShowForm(false);
      setForm({ title: '', category: '建築', drawing_number: '' });
    },
  });

  const total = progress?.total || 1;
  const draftPct = ((progress?.draft || 0) / total) * 100;
  const reviewPct = ((progress?.review || 0) / total) * 100;
  const approvedPct = ((progress?.approved || 0) / total) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileImage className="w-7 h-7 text-violet-600" />
            <h1 className="text-2xl font-bold text-gray-900">竣工図管理</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? '閉じる' : '図面追加'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">進捗状況</h2>
          <div className="flex rounded-full h-4 overflow-hidden bg-gray-200 mb-3">
            <div className="bg-green-500 transition-all" style={{ width: `${approvedPct}%` }} />
            <div className="bg-yellow-400 transition-all" style={{ width: `${reviewPct}%` }} />
            <div className="bg-gray-400 transition-all" style={{ width: `${draftPct}%` }} />
          </div>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">承認済 {progress?.approved ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="text-gray-600">レビュー中 {progress?.review ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-gray-600">作成中 {progress?.draft ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">図面追加</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">図面名称</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="例: 1階平面図"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">図面番号</label>
                <input
                  type="text"
                  value={form.drawing_number}
                  onChange={(e) => setForm({ ...form, drawing_number: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="例: A-101"
                  required
                />
              </div>
              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Drawings List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">図面番号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">図面名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">分類</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {drawings.map((drawing) => {
                const statusInfo = STATUS_CONFIG[drawing.status] || STATUS_CONFIG.draft;
                return (
                  <tr key={drawing.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{drawing.drawing_number}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{drawing.title}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">
                        {drawing.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {drawings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                    竣工図がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
