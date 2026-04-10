'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Key, BookOpen, Shield, Package, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/utils';

type HandoverItem = { id: string; item_type: string; name: string; quantity: number; manufacturer: string; warranty_until: string; handed_over: boolean };
type Summary = { keys: number; manuals: number; warranties: number; spares: number };

const typeIcon: Record<string, typeof Key> = { key: Key, manual: BookOpen, warranty: Shield, spare: Package };
const typeLabel: Record<string, string> = { key: '鍵', manual: '取説', warranty: '保証書', spare: '予備品' };

export default function HandoverPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ item_type: 'key', name: '', quantity: '1', manufacturer: '', warranty_until: '' });

  const { data: summary } = useQuery<Summary>({
    queryKey: ['handover-summary', id],
    queryFn: () => apiFetch(`/api/projects/${id}/handover-items/summary`, { token }),
  });

  const { data: items = [] } = useQuery<HandoverItem[]>({
    queryKey: ['handover-items', id],
    queryFn: () => apiFetch(`/api/projects/${id}/handover-items`, { token }),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch(`/api/projects/${id}/handover-items`, { token, method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['handover-items', id] }); qc.invalidateQueries({ queryKey: ['handover-summary', id] }); setOpen(false); setForm({ item_type: 'key', name: '', quantity: '1', manufacturer: '', warranty_until: '' }); },
  });

  const toggleHandover = useMutation({
    mutationFn: (item: HandoverItem) => apiFetch(`/api/projects/${id}/handover-items/${item.id}`, { token, method: 'PUT', body: JSON.stringify({ handed_over: !item.handed_over }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['handover-items', id] }),
  });

  const summaryCards = [
    { key: 'keys', label: '鍵', icon: Key },
    { key: 'manuals', label: '取説', icon: BookOpen },
    { key: 'warranties', label: '保証書', icon: Shield },
    { key: 'spares', label: '予備品', icon: Package },
  ] as const;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">引渡品目管理</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><Plus size={16} />追加</button>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {summaryCards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.key} className="bg-white rounded-lg shadow p-4 text-center">
                <Icon size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-2xl font-bold">{summary[c.key]}</p>
                <p className="text-sm text-gray-500">{c.label}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-lg shadow divide-y">
        {items.map((item) => {
          const Icon = typeIcon[item.item_type] || Package;
          return (
            <div key={item.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-gray-400" />
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">{typeLabel[item.item_type] || item.item_type} / 数量: {item.quantity}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.manufacturer && <span className="text-sm text-gray-400">{item.manufacturer}</span>}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={item.handed_over} onChange={() => toggleHandover.mutate(item)} className="w-4 h-4 rounded" />
                  <span className="text-sm">{item.handed_over ? '引渡済' : '未引渡'}</span>
                </label>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="p-8 text-center text-gray-400">引渡品目がありません</p>}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">引渡品目追加</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate({ ...form, quantity: Number(form.quantity) }); }} className="space-y-3">
              <select value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="key">鍵</option>
                <option value="manual">取説</option>
                <option value="warranty">保証書</option>
                <option value="spare">予備品</option>
              </select>
              <input placeholder="品目名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input type="number" min="1" placeholder="数量" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="メーカー" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="w-full border rounded px-3 py-2" />
              <input type="date" placeholder="保証期限" value={form.warranty_until} onChange={(e) => setForm({ ...form, warranty_until: e.target.value })} className="w-full border rounded px-3 py-2" />
              <button type="submit" disabled={create.isPending} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                {create.isPending ? '追加中...' : '追加'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
