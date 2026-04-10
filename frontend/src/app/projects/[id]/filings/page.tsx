'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckSquare, Square, FileCheck, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatDate } from '@/lib/utils';

type ChecklistItem = { id: string; label: string; filed: boolean };
type Filing = { id: string; filing_type: string; title: string; authority: string; due_date: string; status: string };

const statusColor: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', submitted: 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };

export default function FilingsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ filing_type: '', title: '', authority: '', due_date: '' });

  const { data: checklist = [] } = useQuery<ChecklistItem[]>({
    queryKey: ['filings-checklist', id],
    queryFn: () => apiFetch(`/api/projects/${id}/filings/checklist`, { token }),
  });

  const { data: filings = [] } = useQuery<Filing[]>({
    queryKey: ['filings', id],
    queryFn: () => apiFetch(`/api/projects/${id}/filings`, { token }),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch(`/api/projects/${id}/filings`, { token, method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['filings', id] }); setOpen(false); setForm({ filing_type: '', title: '', authority: '', due_date: '' }); },
  });

  const filedCount = checklist.filter((c) => c.filed).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">官公庁届出</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><Plus size={16} />新規作成</button>
      </div>

      {checklist.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-medium mb-3">届出チェックリスト ({filedCount}/{checklist.length})</h2>
          <div className="grid grid-cols-2 gap-2">
            {checklist.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                {c.filed ? <CheckSquare size={16} className="text-green-500" /> : <Square size={16} className="text-gray-300" />}
                <span className={c.filed ? 'text-gray-500 line-through' : ''}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow divide-y">
        {filings.map((f) => (
          <div key={f.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <FileCheck size={18} className="text-gray-400" />
              <div>
                <p className="font-medium">{f.title}</p>
                <p className="text-sm text-gray-500">{f.authority} / {f.filing_type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{formatDate(f.due_date)}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${statusColor[f.status] || 'bg-gray-100'}`}>{f.status}</span>
            </div>
          </div>
        ))}
        {filings.length === 0 && <p className="p-8 text-center text-gray-400">届出書類がありません</p>}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">届出作成</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-3">
              <select value={form.filing_type} onChange={(e) => setForm({ ...form, filing_type: e.target.value })} className="w-full border rounded px-3 py-2" required>
                <option value="">届出種類を選択</option>
                <option value="建築確認申請">建築確認申請</option>
                <option value="道路使用許可">道路使用許可</option>
                <option value="労働安全届">労働安全届</option>
                <option value="騒音規制届">騒音規制届</option>
                <option value="振動規制届">振動規制届</option>
                <option value="特定建設作業届">特定建設作業届</option>
                <option value="その他">その他</option>
              </select>
              <input placeholder="届出件名" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="届出先（官公庁名）" value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full border rounded px-3 py-2" required />
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
