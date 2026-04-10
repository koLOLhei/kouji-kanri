'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Circle, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatDate } from '@/lib/utils';

type Task = { id: string; title: string; priority: string; due_date: string; completed: boolean; project_id?: string };

const priorityBadge: Record<string, string> = { high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-gray-100 text-gray-600' };
const priorityLabel: Record<string, string> = { high: '高', medium: '中', low: '低' };
const tabs = [
  { key: 'all', label: '全て', endpoint: '/api/tasks' },
  { key: 'today', label: '今日', endpoint: '/api/tasks/today' },
  { key: 'overdue', label: '期限超過', endpoint: '/api/tasks/overdue' },
  { key: 'done', label: '完了', endpoint: '/api/tasks?completed=true' },
] as const;

export default function TasksPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'medium', due_date: '', project_id: '' });

  const currentTab = tabs.find((t) => t.key === tab) || tabs[0];
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', tab],
    queryFn: () => apiFetch(currentTab.endpoint, { token }),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch('/api/tasks', { token, method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setOpen(false); setForm({ title: '', priority: 'medium', due_date: '', project_id: '' }); },
  });

  const complete = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/tasks/${id}/complete`, { token, method: 'PUT' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">個人タスク管理</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><Plus size={16} />新規作成</button>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-2 text-sm rounded-md ${tab === t.key ? 'bg-white shadow font-medium' : 'text-gray-500'}`}>{t.label}</button>
        ))}
      </div>

      <div className="space-y-2">
        {tasks.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 bg-white rounded-lg shadow p-4 ${t.completed ? 'opacity-50' : ''}`}>
            <button onClick={() => !t.completed && complete.mutate(t.id)} className="shrink-0">
              {t.completed ? <CheckCircle2 size={20} className="text-green-500" /> : <Circle size={20} className="text-gray-300" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${t.completed ? 'line-through' : ''}`}>{t.title}</p>
              <p className="text-sm text-gray-400">{t.due_date ? formatDate(t.due_date) : '期限なし'}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${priorityBadge[t.priority] || 'bg-gray-100'}`}>{priorityLabel[t.priority] || t.priority}</span>
          </div>
        ))}
        {tasks.length === 0 && <p className="p-8 text-center text-gray-400">タスクがありません</p>}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">タスク作成</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-3">
              <input placeholder="タスク名" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full border rounded px-3 py-2" />
              <input placeholder="プロジェクトID（任意）" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className="w-full border rounded px-3 py-2" />
              <button type="submit" disabled={create.isPending} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                {create.isPending ? '作成中...' : '作成'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
