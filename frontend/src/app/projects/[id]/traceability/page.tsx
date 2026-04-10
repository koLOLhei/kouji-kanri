'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Package, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatDate } from '@/lib/utils';

type TraceRecord = { id: string; material_name: string; manufacturer: string; lot_number: string; delivery_date: string; used_location: string; quantity: number; unit: string };

export default function TraceabilityPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ material_name: '', manufacturer: '', lot_number: '', delivery_date: '', used_location: '', quantity: '', unit: '' });

  const { data: records = [] } = useQuery<TraceRecord[]>({
    queryKey: ['traceability', id, search],
    queryFn: () => apiFetch(`/api/projects/${id}/traceability${search ? `?q=${encodeURIComponent(search)}` : ''}`, { token }),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch(`/api/projects/${id}/traceability`, { token, method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['traceability', id] }); setOpen(false); setForm({ material_name: '', manufacturer: '', lot_number: '', delivery_date: '', used_location: '', quantity: '', unit: '' }); },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">材料トレーサビリティ</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><Plus size={16} />記録追加</button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="材料名または使用箇所で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">材料名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">メーカー</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ロット番号</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">使用箇所</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">数量</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{r.material_name}</p>
                    <p className="text-xs text-gray-400">{formatDate(r.delivery_date)}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{r.manufacturer}</td>
                <td className="px-4 py-3 font-mono text-gray-600">{r.lot_number}</td>
                <td className="px-4 py-3 text-gray-600">{r.used_location}</td>
                <td className="px-4 py-3 text-right">{r.quantity} {r.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <Package size={32} className="mb-2" />
            <p>記録がありません</p>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">トレーサビリティ記録追加</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate({ ...form, quantity: Number(form.quantity) }); }} className="space-y-3">
              <input placeholder="材料名" value={form.material_name} onChange={(e) => setForm({ ...form, material_name: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="メーカー" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="ロット番号" value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="使用箇所" value={form.used_location} onChange={(e) => setForm({ ...form, used_location: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <div className="flex gap-2">
                <input type="number" placeholder="数量" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="flex-1 border rounded px-3 py-2" required />
                <input placeholder="単位" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-24 border rounded px-3 py-2" required />
              </div>
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
