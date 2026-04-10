'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, X, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatDate } from '@/lib/utils';

interface Instruction {
  id: string;
  type: '指示' | '連絡' | '依頼' | '注意';
  to_company_name: string;
  subject: string;
  content: string;
  deadline: string;
  response_required: boolean;
  response_status: 'pending' | 'responded' | 'overdue' | null;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  指示: 'bg-red-100 text-red-700',
  連絡: 'bg-blue-100 text-blue-700',
  依頼: 'bg-yellow-100 text-yellow-700',
  注意: 'bg-orange-100 text-orange-700',
};

const TABS = ['全て', '指示', '連絡', '依頼', '注意'] as const;

export default function InstructionsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('全て');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: '指示' as string,
    to_company_name: '',
    subject: '',
    content: '',
    deadline: '',
    response_required: false,
  });

  const { data: instructions = [] } = useQuery<Instruction[]>({
    queryKey: ['instructions', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/instructions`),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch(`/api/projects/${projectId}/instructions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructions', projectId] });
      setShowForm(false);
      setForm({ type: '指示', to_company_name: '', subject: '', content: '', deadline: '', response_required: false });
    },
  });

  const filtered = activeTab === '全て' ? instructions : instructions.filter((i) => i.type === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">下請指示書・連絡書</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? '閉じる' : '新規作成'}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg shadow-sm border p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">新規作成</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="指示">指示</option>
                    <option value="連絡">連絡</option>
                    <option value="依頼">依頼</option>
                    <option value="注意">注意</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">宛先会社名</label>
                  <input
                    type="text"
                    value={form.to_company_name}
                    onChange={(e) => setForm({ ...form, to_company_name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="例: 山田建設株式会社"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">件名</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 h-32 resize-y"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">期限</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.response_required}
                      onChange={(e) => setForm({ ...form, response_required: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm font-medium text-gray-700">回答必要</span>
                  </label>
                </div>
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMutation.isPending ? '保存中...' : '保存'}
              </button>
            </form>
          </div>
        )}

        {/* Instruction List */}
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${TYPE_COLORS[item.type]}`}>
                    {item.type}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.subject}</h3>
                    <p className="text-sm text-gray-500 mt-1">{item.to_company_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {item.deadline && (
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(item.deadline)}
                    </span>
                  )}
                  {item.response_required && (
                    <>
                      {item.response_status === 'responded' ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          回答済
                        </span>
                      ) : item.response_status === 'overdue' ? (
                        <span className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          期限超過
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Clock className="w-4 h-4" />
                          回答待ち
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
              指示書・連絡書がありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
