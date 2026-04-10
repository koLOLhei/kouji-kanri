'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Receipt, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatAmount, formatDate } from '@/lib/utils';

type Invoice = { id: string; invoice_number: string; invoice_date: string; amount: number; status: string };
type PaymentNotice = { id: string; subcontractor: string; amount: number; status: string; created_at: string };
type InvoiceItem = { name: string; amount: number };

const statusColor: Record<string, string> = { draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-100 text-blue-700', paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700' };

export default function InvoicesPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'invoices' | 'notices'>('invoices');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ invoice_date: '', customer_name: '' });
  const [items, setItems] = useState<InvoiceItem[]>([{ name: '', amount: 0 }]);

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['invoices', id],
    queryFn: () => apiFetch(`/api/projects/${id}/invoices`, { token }),
    enabled: tab === 'invoices',
  });

  const { data: notices = [] } = useQuery<PaymentNotice[]>({
    queryKey: ['payment-notices', id],
    queryFn: () => apiFetch(`/api/projects/${id}/payment-notices`, { token }),
    enabled: tab === 'notices',
  });

  const createInvoice = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch(`/api/projects/${id}/invoices`, { token, method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices', id] }); setOpen(false); },
  });

  const subtotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const updateItem = (idx: number, key: keyof InvoiceItem, val: string | number) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: val };
    setItems(next);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">請求書・支払通知</h1>
        {tab === 'invoices' && <button onClick={() => setOpen(true)} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><Plus size={16} />新規作成</button>}
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        <button onClick={() => setTab('invoices')} className={`flex-1 py-2 text-sm rounded-md ${tab === 'invoices' ? 'bg-white shadow font-medium' : 'text-gray-500'}`}>請求書</button>
        <button onClick={() => setTab('notices')} className={`flex-1 py-2 text-sm rounded-md ${tab === 'notices' ? 'bg-white shadow font-medium' : 'text-gray-500'}`}>支払通知書</button>
      </div>

      {tab === 'invoices' && (
        <div className="bg-white rounded-lg shadow divide-y">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Receipt size={18} className="text-gray-400" />
                <div>
                  <p className="font-medium">{inv.invoice_number}</p>
                  <p className="text-sm text-gray-500">{formatDate(inv.invoice_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatAmount(inv.amount)}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColor[inv.status] || 'bg-gray-100'}`}>{inv.status}</span>
              </div>
            </div>
          ))}
          {invoices.length === 0 && <p className="p-8 text-center text-gray-400">請求書がありません</p>}
        </div>
      )}

      {tab === 'notices' && (
        <div className="bg-white rounded-lg shadow divide-y">
          {notices.map((n) => (
            <div key={n.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{n.subcontractor}</p>
                <p className="text-sm text-gray-500">{formatDate(n.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatAmount(n.amount)}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColor[n.status] || 'bg-gray-100'}`}>{n.status}</span>
              </div>
            </div>
          ))}
          {notices.length === 0 && <p className="p-8 text-center text-gray-400">支払通知書がありません</p>}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">請求書作成</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createInvoice.mutate({ ...form, items, subtotal }); }} className="space-y-3">
              <input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <input placeholder="顧客名" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <div className="space-y-2">
                <label className="text-sm font-medium">明細</label>
                {items.map((it, i) => (
                  <div key={i} className="flex gap-2">
                    <input placeholder="項目" value={it.name} onChange={(e) => updateItem(i, 'name', e.target.value)} className="flex-1 border rounded px-3 py-2" required />
                    <input type="number" placeholder="金額" value={it.amount || ''} onChange={(e) => updateItem(i, 'amount', Number(e.target.value))} className="w-32 border rounded px-3 py-2" required />
                    {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-500"><X size={16} /></button>}
                  </div>
                ))}
                <button type="button" onClick={() => setItems([...items, { name: '', amount: 0 }])} className="text-blue-600 text-sm">+ 明細追加</button>
              </div>
              <p className="text-right font-bold">小計: {formatAmount(subtotal)}</p>
              <button type="submit" disabled={createInvoice.isPending} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                {createInvoice.isPending ? '作成中...' : '作成'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
