'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, Plus, X, TrendingDown, Hash } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatAmount } from '@/lib/utils';

interface VEProposal {
  id: string;
  title: string;
  type: 'VE' | '技術' | '改善';
  description: string;
  expected_benefit: string;
  cost_reduction: number;
  netis_number: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_at: string;
}

interface Summary {
  count: number;
  total_cost_reduction: number;
}

const TYPE_COLORS: Record<string, string> = {
  VE: 'bg-blue-100 text-blue-700',
  技術: 'bg-purple-100 text-purple-700',
  改善: 'bg-teal-100 text-teal-700',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: '下書き', bg: 'bg-gray-100', text: 'text-gray-700' },
  submitted: { label: '提出済', bg: 'bg-blue-100', text: 'text-blue-700' },
  approved: { label: '承認', bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { label: '却下', bg: 'bg-red-100', text: 'text-red-700' },
};

export default function VEProposalsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'VE' as string,
    description: '',
    expected_benefit: '',
    cost_reduction: 0,
    netis_number: '',
  });

  const { data: proposals = [] } = useQuery<VEProposal[]>({
    queryKey: ['ve-proposals', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/ve-proposals`),
  });

  const { data: summary } = useQuery<Summary>({
    queryKey: ['ve-proposals-summary', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/ve-proposals/summary`),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch(`/api/projects/${projectId}/ve-proposals`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ve-proposals', projectId] });
      queryClient.invalidateQueries({ queryKey: ['ve-proposals-summary', projectId] });
      setShowForm(false);
      setForm({ title: '', type: 'VE', description: '', expected_benefit: '', cost_reduction: 0, netis_number: '' });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-7 h-7 text-amber-500" />
            <h1 className="text-2xl font-bold text-gray-900">VE提案・技術提案</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? '閉じる' : '提案追加'}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm text-gray-500">提案数</p>
                <p className="text-2xl font-bold">{summary?.count ?? 0}件</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">総コスト削減額</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatAmount(summary?.total_cost_reduction ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">提案追加</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="VE">VE提案</option>
                    <option value="技術">技術提案</option>
                    <option value="改善">改善提案</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 h-24 resize-y"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">期待効果</label>
                <input
                  type="text"
                  value={form.expected_benefit}
                  onChange={(e) => setForm({ ...form, expected_benefit: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="例: 工期10日短縮、品質向上"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">コスト削減額 (円)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.cost_reduction}
                    onChange={(e) => setForm({ ...form, cost_reduction: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NETIS番号</label>
                  <input
                    type="text"
                    value={form.netis_number}
                    onChange={(e) => setForm({ ...form, netis_number: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="例: KT-200001-A"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {createMutation.isPending ? '保存中...' : '保存'}
              </button>
            </form>
          </div>
        )}

        {/* Proposals List */}
        <div className="space-y-3">
          {proposals.map((proposal) => {
            const statusInfo = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;
            return (
              <div key={proposal.id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${TYPE_COLORS[proposal.type]}`}>
                      {proposal.type}
                    </span>
                    <h3 className="font-semibold text-gray-900">{proposal.title}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{proposal.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  {proposal.cost_reduction > 0 && (
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {formatAmount(proposal.cost_reduction)}
                    </span>
                  )}
                  {proposal.netis_number && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Hash className="w-3.5 h-3.5" />
                      {proposal.netis_number}
                    </span>
                  )}
                  {proposal.expected_benefit && (
                    <span className="text-gray-500">{proposal.expected_benefit}</span>
                  )}
                </div>
              </div>
            );
          })}
          {proposals.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
              VE提案がありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
