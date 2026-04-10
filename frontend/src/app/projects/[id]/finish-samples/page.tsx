'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Palette, Plus, X, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/utils';

interface FinishSample {
  id: string;
  type: 'color' | 'texture' | 'material';
  name: string;
  location: string;
  manufacturer: string;
  color_code: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const TYPE_TABS = [
  { key: 'all', label: '全て' },
  { key: 'color', label: '色見本' },
  { key: 'texture', label: '仕上見本' },
  { key: 'material', label: '材料見本' },
] as const;

const TYPE_LABELS: Record<string, string> = {
  color: '色見本',
  texture: '仕上見本',
  material: '材料見本',
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
  pending: { label: '確認中', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  approved: { label: '承認済', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  rejected: { label: '差戻し', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

export default function FinishSamplesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'color' as string,
    name: '',
    location: '',
    manufacturer: '',
    color_code: '',
  });

  const { data: samples = [] } = useQuery<FinishSample[]>({
    queryKey: ['finish-samples', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/finish-samples`),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch(`/api/projects/${projectId}/finish-samples`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finish-samples', projectId] });
      setShowForm(false);
      setForm({ type: 'color', name: '', location: '', manufacturer: '', color_code: '' });
    },
  });

  const filtered = activeTab === 'all' ? samples : samples.filter((s) => s.type === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Palette className="w-7 h-7 text-pink-500" />
            <h1 className="text-2xl font-bold text-gray-900">色見本・仕上見本</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? '閉じる' : '見本追加'}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg shadow-sm border p-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'bg-pink-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">見本追加</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">種類</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="color">色見本</option>
                  <option value="texture">仕上見本</option>
                  <option value="material">材料見本</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="例: 外壁塗装色"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">使用箇所</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="例: 外壁全面"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メーカー</label>
                <input
                  type="text"
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="例: 日本ペイント"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">色番号・型番</label>
                <input
                  type="text"
                  value={form.color_code}
                  onChange={(e) => setForm({ ...form, color_code: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="例: N-70, 22-85B"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50"
                >
                  {createMutation.isPending ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sample Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sample) => {
            const statusInfo = STATUS_CONFIG[sample.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusInfo.icon;
            return (
              <div
                key={sample.id}
                className={`rounded-xl border p-4 transition-shadow hover:shadow-md ${statusInfo.bg}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2 py-0.5 bg-white/80 rounded text-xs font-medium text-gray-700">
                    {TYPE_LABELS[sample.type]}
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-bold ${statusInfo.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusInfo.label}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{sample.name}</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>使用箇所: {sample.location}</p>
                  {sample.manufacturer && <p>メーカー: {sample.manufacturer}</p>}
                  {sample.color_code && (
                    <p className="font-mono text-xs bg-white/60 px-2 py-1 rounded inline-block">
                      {sample.color_code}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
            見本がありません
          </div>
        )}
      </div>
    </div>
  );
}
