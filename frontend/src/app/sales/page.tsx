'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Plus, X, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatAmount } from '@/lib/utils';

interface SalesPipeline {
  id: string;
  project_name: string;
  client: string;
  estimated_amount: number;
  probability: 'A' | 'B' | 'C';
  stage: '見込み' | '入札中' | '交渉中' | '受注' | '失注';
  bid_deadline: string;
  created_at: string;
}

interface PipelineSummary {
  a_total: number;
  b_total: number;
  c_total: number;
  pipeline_total: number;
}

const STAGES = ['見込み', '入札中', '交渉中', '受注', '失注'] as const;

const STAGE_COLORS: Record<string, { bg: string; border: string; header: string }> = {
  見込み: { bg: 'bg-gray-50', border: 'border-gray-300', header: 'bg-gray-200 text-gray-700' },
  入札中: { bg: 'bg-blue-50', border: 'border-blue-300', header: 'bg-blue-200 text-blue-800' },
  交渉中: { bg: 'bg-yellow-50', border: 'border-yellow-300', header: 'bg-yellow-200 text-yellow-800' },
  受注: { bg: 'bg-green-50', border: 'border-green-300', header: 'bg-green-200 text-green-800' },
  失注: { bg: 'bg-red-50', border: 'border-red-300', header: 'bg-red-200 text-red-800' },
};

const PROB_COLORS: Record<string, string> = {
  A: 'bg-green-500 text-white',
  B: 'bg-yellow-500 text-white',
  C: 'bg-gray-400 text-white',
};

export default function SalesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    project_name: '',
    client: '',
    estimated_amount: 0,
    probability: 'B' as string,
    stage: '見込み' as string,
    bid_deadline: '',
  });

  const { data: pipelines = [] } = useQuery<SalesPipeline[]>({
    queryKey: ['sales-pipeline'],
    queryFn: () => apiFetch('/api/sales-pipeline'),
  });

  const { data: summary } = useQuery<PipelineSummary>({
    queryKey: ['sales-pipeline-summary'],
    queryFn: () => apiFetch('/api/sales-pipeline/summary'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch('/api/sales-pipeline', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline-summary'] });
      setShowForm(false);
      setForm({ project_name: '', client: '', estimated_amount: 0, probability: 'B', stage: '見込み', bid_deadline: '' });
    },
  });

  const groupedByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = pipelines.filter((p) => p.stage === stage);
      return acc;
    },
    {} as Record<string, SalesPipeline[]>,
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-sky-600" />
            <h1 className="text-2xl font-bold text-gray-900">受注パイプライン</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? '閉じる' : '案件追加'}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-sky-500" />
              <div>
                <p className="text-sm text-gray-500">パイプライン合計</p>
                <p className="text-xl font-bold">{formatAmount(summary?.pipeline_total ?? 0)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">A</span>
              <div>
                <p className="text-sm text-gray-500">確度A</p>
                <p className="text-xl font-bold text-green-600">{formatAmount(summary?.a_total ?? 0)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center font-bold">B</span>
              <div>
                <p className="text-sm text-gray-500">確度B</p>
                <p className="text-xl font-bold text-yellow-600">{formatAmount(summary?.b_total ?? 0)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center font-bold">C</span>
              <div>
                <p className="text-sm text-gray-500">確度C</p>
                <p className="text-xl font-bold text-gray-600">{formatAmount(summary?.c_total ?? 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">案件追加</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">案件名</label>
                <input
                  type="text"
                  value={form.project_name}
                  onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">発注者</label>
                <input
                  type="text"
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">見積金額 (円)</label>
                <input
                  type="number"
                  min={0}
                  value={form.estimated_amount}
                  onChange={(e) => setForm({ ...form, estimated_amount: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">確度</label>
                <select
                  value={form.probability}
                  onChange={(e) => setForm({ ...form, probability: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="A">A (高)</option>
                  <option value="B">B (中)</option>
                  <option value="C">C (低)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ステージ</label>
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">入札期限</label>
                <input
                  type="date"
                  value={form.bid_deadline}
                  onChange={(e) => setForm({ ...form, bid_deadline: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {STAGES.map((stage) => {
            const stageStyle = STAGE_COLORS[stage];
            const items = groupedByStage[stage] || [];
            return (
              <div key={stage} className={`rounded-xl border ${stageStyle.border} ${stageStyle.bg} min-h-[200px]`}>
                <div className={`px-3 py-2 rounded-t-xl font-semibold text-sm ${stageStyle.header} flex items-center justify-between`}>
                  <span>{stage}</span>
                  <span className="text-xs opacity-75">{items.length}件</span>
                </div>
                <div className="p-2 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg border shadow-sm p-3">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 leading-tight">{item.project_name}</h4>
                        <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 ${PROB_COLORS[item.probability]}`}>
                          {item.probability}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{item.client}</p>
                      <p className="text-sm font-bold text-gray-800">{formatAmount(item.estimated_amount)}</p>
                      {item.bid_deadline && (
                        <p className="text-xs text-gray-400 mt-1">期限: {item.bid_deadline}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
