'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatAmount, formatDate } from '@/lib/utils';

type EstimateItem = { name: string; amount: number };
type Estimate = { id: string; estimate_number: string; project_name: string; amount: number; status: string; created_at: string };

const statusColor: Record<string, string> = { draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-100 text-blue-700', accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };

export default function EstimatesPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ project_name: '', customer_name: '', notes: '' });
  const [items, setItems] = useState<EstimateItem[]>([{ name: '', amount: 0 }]);

  const { data: estimates = [] } = useQuery<Estimate[]>({
    queryKey: ['estimates'],
    queryFn: () => apiFetch('/api/estimates', { token }),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch('/api/estimates', { token, method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['estimates'] }); setOpen(false); setForm({ project_name: '', customer_name: '', notes: '' }); setItems([{ name: '', amount: 0 }]); },
  });

  const subtotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  const updateItem = (idx: number, key: keyof EstimateItem, val: string | number) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: val };
    setItems(next);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">見積書管理</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><Plus size={16} />新規作成</button>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {estimates.map((e) => (
          <div key={e.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-gray-400" />
              <div>
                <p className="font-medium">{e.estimate_number}</p>
                <p className="text-sm text-gray-500">{e.project_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-medium">{formatAmount(e.amount)}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${statusColor[e.status] || 'bg-gray-100'}`}>{e.status}</span>
              <span className="text-sm text-gray-400">{formatDate(e.created_at)}</span>
            </div>
          </div>
        ))}
        {estimates.length === 0 && <p className="p-8 text-center text-gray-400">見積書がありません</p>}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">見積書作成</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate({ ...form, items, subtotal, tax, total }); }} className="space-y-3">
              <input placeholder="工事名" value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="顧客名" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <div className="space-y-2">
                <label className="text-sm font-medium">明細</label>
                {items.map((it, i) => (
                  <div key={i} className="flex gap-2">
                    <input placeholder="項目名" value={it.name} onChange={(e) => updateItem(i, 'name', e.target.value)} className="flex-1 border rounded px-3 py-2" required />
                    <input type="number" placeholder="金額" value={it.amount || ''} onChange={(e) => updateItem(i, 'amount', Number(e.target.value))} className="w-32 border rounded px-3 py-2" required />
                    {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-500"><X size={16} /></button>}
                  </div>
                ))}
                <button type="button" onClick={() => setItems([...items, { name: '', amount: 0 }])} className="text-blue-600 text-sm">+ 明細追加</button>
              </div>
              <textarea placeholder="備考" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
              <div className="text-right space-y-1 text-sm">
                <p>小計: {formatAmount(subtotal)}</p>
                <p>消費税(10%): {formatAmount(tax)}</p>
                <p className="font-bold text-base">合計: {formatAmount(total)}</p>
              </div>
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
