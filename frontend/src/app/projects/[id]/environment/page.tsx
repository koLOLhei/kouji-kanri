'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatDate } from '@/lib/utils';

type EnvRecord = { id: string; record_type: string; record_date: string; record_time: string; location: string; measured_value: number; unit: string; limit_value: number };
type Alert = { id: string; record_type: string; message: string };

const typeLabel: Record<string, string> = { noise: '騒音', vibration: '振動', wbgt: 'WBGT', dust: '粉塵' };
const tabs = ['noise', 'vibration', 'wbgt', 'dust'] as const;

export default function EnvironmentPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>('noise');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ record_type: 'noise', record_date: '', record_time: '', location: '', measured_value: '', unit: 'dB', limit_value: '' });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['env-alerts', id],
    queryFn: () => apiFetch(`/api/projects/${id}/environment/alerts`, { token }),
  });

  const { data: records = [] } = useQuery<EnvRecord[]>({
    queryKey: ['env-records', id, tab],
    queryFn: () => apiFetch(`/api/projects/${id}/environment?type=${tab}`, { token }),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch(`/api/projects/${id}/environment`, { token, method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['env-records', id] }); qc.invalidateQueries({ queryKey: ['env-alerts', id] }); setOpen(false); setForm({ record_type: 'noise', record_date: '', record_time: '', location: '', measured_value: '', unit: 'dB', limit_value: '' }); },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">環境測定</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><Plus size={16} />記録追加</button>
      </div>

      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">基準値超過あり</p>
            {alerts.map((a) => <p key={a.id} className="text-sm text-red-600">{a.message}</p>)}
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-sm rounded-md ${tab === t ? 'bg-white shadow font-medium' : 'text-gray-500'}`}>{typeLabel[t]}</button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {records.map((r) => {
          const over = r.measured_value > r.limit_value;
          return (
            <div key={r.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{r.location}</p>
                <p className="text-sm text-gray-500">{formatDate(r.record_date)} {r.record_time}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium">{r.measured_value} {r.unit}</span>
                <span className="text-sm text-gray-400">/ {r.limit_value} {r.unit}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${over ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{over ? '超過' : '基準内'}</span>
              </div>
            </div>
          );
        })}
        {records.length === 0 && <p className="p-8 text-center text-gray-400">記録がありません</p>}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">測定記録追加</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate({ ...form, measured_value: Number(form.measured_value), limit_value: Number(form.limit_value) }); }} className="space-y-3">
              <select value={form.record_type} onChange={(e) => setForm({ ...form, record_type: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="noise">騒音</option>
                <option value="vibration">振動</option>
                <option value="wbgt">WBGT</option>
                <option value="dust">粉塵</option>
              </select>
              <div className="flex gap-2">
                <input type="date" value={form.record_date} onChange={(e) => setForm({ ...form, record_date: e.target.value })} className="flex-1 border rounded px-3 py-2" required />
                <input type="time" value={form.record_time} onChange={(e) => setForm({ ...form, record_time: e.target.value })} className="flex-1 border rounded px-3 py-2" required />
              </div>
              <input placeholder="測定場所" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border rounded px-3 py-2" required />
              <div className="flex gap-2">
                <input type="number" step="0.1" placeholder="測定値" value={form.measured_value} onChange={(e) => setForm({ ...form, measured_value: e.target.value })} className="flex-1 border rounded px-3 py-2" required />
                <input placeholder="単位" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-20 border rounded px-3 py-2" required />
              </div>
              <input type="number" step="0.1" placeholder="基準値" value={form.limit_value} onChange={(e) => setForm({ ...form, limit_value: e.target.value })} className="w-full border rounded px-3 py-2" required />
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
