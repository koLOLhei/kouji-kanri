'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileSignature, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatAmount, formatDate } from '@/lib/utils';

type Contract = { id: string; contract_type: string; title: string; counterparty: string; contract_amount: number; signed_date: string; status: string };

const typeBadge: Record<string, string> = { prime: 'bg-blue-100 text-blue-700', sub: 'bg-orange-100 text-orange-700', consulting: 'bg-purple-100 text-purple-700' };
const typeLabel: Record<string, string> = { prime: '元請', sub: '下請', consulting: 'コンサル' };

export default function ContractsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contract_type: 'prime', title: '', counterparty: '', contract_amount: '', signed_date: '' });

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: () => apiFetch('/api/contracts', { token }),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch('/api/contracts', { token, method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); setOpen(false); setForm({ contract_type: 'prime', title: '', counterparty: '', contract_amount: '', signed_date: '' }); },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">契約書管理</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><Plus size={16} />新規作成</button>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {contracts.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <FileSignature size={18} className="text-gray-400" />
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-gray-500">{c.counterparty}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-xs px-2 py-1 rounded-full ${typeBadge[c.contract_type] || 'bg-gray-100'}`}>{typeLabel[c.contract_type] || c.contract_type}</span>
              <span className="font-medium">{formatAmount(c.contract_amount)}</span>
              <span className="text-sm text-gray-400">{formatDate(c.signed_date)}</span>
            </div>
          </div>
        ))}
        {contracts.length === 0 && <p className="p-8 text-center text-gray-400">契約書がありません</p>}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">契約書作成</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate({ ...form, contract_amount: Number(form.contract_amount) }); }} className="space-y-3">
              <select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="prime">元請</option>
                <option value="sub">下請</option>
                <option value="consulting">コンサル</option>
              </select>
              <input placeholder="契約件名" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="契約相手方" value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input type="number" placeholder="契約金額" value={form.contract_amount} onChange={(e) => setForm({ ...form, contract_amount: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input type="date" value={form.signed_date} onChange={(e) => setForm({ ...form, signed_date: e.target.value })} className="w-full border rounded px-3 py-2" required />
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
