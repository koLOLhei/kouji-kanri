'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Bell, Clock, Plus, Megaphone, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatDate } from '@/lib/utils';

type Announcement = { id: string; title: string; body: string; created_at: string };

export default function AdminExportsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [checkResult, setCheckResult] = useState<{ count: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: () => apiFetch('/api/announcements', { token }),
  });

  const createAnnouncement = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch('/api/announcements', { token, method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); setOpen(false); setForm({ title: '', body: '' }); },
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await apiFetch('/api/admin/data-export', { token });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleCheckDeadlines = async () => {
    setCheckResult(null);
    const result = await apiFetch<{ count: number }>('/api/cron/check-deadlines', { token, method: 'POST' });
    setCheckResult(result);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">管理者ツール</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-3">
            <Download size={24} className="text-blue-500" />
            <h2 className="text-lg font-bold">データエクスポート</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">全データをJSON形式でダウンロード</p>
          <button onClick={handleExport} disabled={exporting} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {exporting ? 'エクスポート中...' : '全データエクスポート'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-3">
            <Clock size={24} className="text-orange-500" />
            <h2 className="text-lg font-bold">期限チェック</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">期限間近・超過の項目を一括チェック</p>
          <button onClick={handleCheckDeadlines} className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600">
            期限チェック実行
          </button>
          {checkResult && (
            <p className="mt-3 text-sm text-center">
              <Bell size={14} className="inline mr-1" />
              {checkResult.count}件の通知を送信しました
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <Megaphone size={20} className="text-gray-400" />
            <h2 className="text-lg font-bold">お知らせ管理</h2>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"><Plus size={14} />新規作成</button>
        </div>
        <div className="divide-y">
          {announcements.map((a) => (
            <div key={a.id} className="p-4">
              <div className="flex justify-between items-start">
                <p className="font-medium">{a.title}</p>
                <span className="text-xs text-gray-400">{formatDate(a.created_at)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{a.body}</p>
            </div>
          ))}
          {announcements.length === 0 && <p className="p-8 text-center text-gray-400">お知らせがありません</p>}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">お知らせ作成</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createAnnouncement.mutate(form); }} className="space-y-3">
              <input placeholder="タイトル" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <textarea placeholder="本文" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full border rounded px-3 py-2" rows={4} required />
              <button type="submit" disabled={createAnnouncement.isPending} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                {createAnnouncement.isPending ? '作成中...' : '作成'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
