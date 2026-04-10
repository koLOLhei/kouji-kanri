'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, X, CheckCircle, XCircle, Activity } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch, formatDate } from '@/lib/utils';

interface SteelInspection {
  id: string;
  date: string;
  location: string;
  joint_type: string;
  method: string;
  total_joints: number;
  inspected: number;
  passed: number;
  failed: number;
  created_at: string;
}

interface Stats {
  total_inspected: number;
  pass_rate: number;
  total_failed: number;
}

export default function SteelInspectionsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: '',
    location: '',
    joint_type: '完全溶込',
    method: 'UT',
    total_joints: 0,
    inspected: 0,
    passed: 0,
    failed: 0,
  });

  const { data: inspections = [] } = useQuery<SteelInspection[]>({
    queryKey: ['steel-inspections', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/steel-inspections`),
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['steel-inspections-stats', projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/steel-inspections/stats`),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch(`/api/projects/${projectId}/steel-inspections`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['steel-inspections', projectId] });
      queryClient.invalidateQueries({ queryKey: ['steel-inspections-stats', projectId] });
      setShowForm(false);
      setForm({ date: '', location: '', joint_type: '完全溶込', method: 'UT', total_joints: 0, inspected: 0, passed: 0, failed: 0 });
    },
  });

  const calcInspectionRate = (inspected: number, total: number) =>
    total > 0 ? ((inspected / total) * 100).toFixed(1) : '0.0';

  const calcPassRate = (passed: number, inspected: number) =>
    inspected > 0 ? ((passed / inspected) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">鉄骨溶接検査</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? '閉じる' : '検査記録追加'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">総検査箇所</p>
                <p className="text-2xl font-bold">{stats?.total_inspected ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">合格率</p>
                <p className="text-2xl font-bold">{stats?.pass_rate?.toFixed(1) ?? '0.0'}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-500">不合格数</p>
                <p className="text-2xl font-bold text-red-600">{stats?.total_failed ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">検査記録追加</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">検査日</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">検査箇所</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="例: 3F柱-梁仕口"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">継手種別</label>
                <select
                  value={form.joint_type}
                  onChange={(e) => setForm({ ...form, joint_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="完全溶込">完全溶込</option>
                  <option value="部分溶込">部分溶込</option>
                  <option value="すみ肉">すみ肉</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">検査方法</label>
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="UT">UT (超音波探傷)</option>
                  <option value="VT">VT (目視)</option>
                  <option value="RT">RT (放射線透過)</option>
                  <option value="MT">MT (磁粉探傷)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">総継手数</label>
                <input
                  type="number"
                  min={0}
                  value={form.total_joints}
                  onChange={(e) => setForm({ ...form, total_joints: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">検査数</label>
                <input
                  type="number"
                  min={0}
                  value={form.inspected}
                  onChange={(e) => setForm({ ...form, inspected: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">合格数</label>
                <input
                  type="number"
                  min={0}
                  value={form.passed}
                  onChange={(e) => setForm({ ...form, passed: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">不合格数</label>
                <input
                  type="number"
                  min={0}
                  value={form.failed}
                  onChange={(e) => setForm({ ...form, failed: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Inspection List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">日付</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">箇所</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">種別</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">方法</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">検査率</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">合格率</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">不合格</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inspections.map((item) => {
                const passRate = Number(calcPassRate(item.passed, item.inspected));
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{formatDate(item.date)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{item.location}</td>
                    <td className="px-4 py-3 text-sm">{item.joint_type}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {item.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {calcInspectionRate(item.inspected, item.total_joints)}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${passRate >= 95 ? 'bg-green-500' : passRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${passRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{passRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {item.failed > 0 ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">
                          {item.failed}
                        </span>
                      ) : (
                        <span className="text-green-600">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {inspections.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    検査記録がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
