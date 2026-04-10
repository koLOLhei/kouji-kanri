'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, UserCircle, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/utils';

type Member = { id: string; user_id: string; name: string; email: string; role: string };
type TenantUser = { id: string; name: string; email: string };

const roleBadge: Record<string, string> = { admin: 'bg-red-100 text-red-700', member: 'bg-blue-100 text-blue-700', viewer: 'bg-gray-100 text-gray-600' };
const roleLabel: Record<string, string> = { admin: '管理者', member: 'メンバー', viewer: '閲覧者' };

export default function MembersPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ user_id: '', role: 'member' });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['members', id],
    queryFn: () => apiFetch(`/api/projects/${id}/members`, { token }),
  });

  const { data: users = [] } = useQuery<TenantUser[]>({
    queryKey: ['tenant-users'],
    queryFn: () => apiFetch('/api/users', { token }),
    enabled: open,
  });

  const addMember = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch(`/api/projects/${id}/members`, { token, method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', id] }); setOpen(false); setForm({ user_id: '', role: 'member' }); },
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => apiFetch(`/api/projects/${id}/members/${memberId}`, { token, method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', id] }),
  });

  const existingUserIds = new Set(members.map((m) => m.user_id));
  const availableUsers = users.filter((u) => !existingUserIds.has(u.id));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">プロジェクトメンバー</h1>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><Plus size={16} />メンバー追加</button>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <UserCircle size={32} className="text-gray-300" />
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-sm text-gray-500">{m.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full ${roleBadge[m.role] || 'bg-gray-100'}`}>{roleLabel[m.role] || m.role}</span>
              <button onClick={() => { if (confirm(`${m.name}を削除しますか？`)) removeMember.mutate(m.id); }} className="text-gray-400 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {members.length === 0 && <p className="p-8 text-center text-gray-400">メンバーがいません</p>}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">メンバー追加</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addMember.mutate(form); }} className="space-y-3">
              <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="w-full border rounded px-3 py-2" required>
                <option value="">ユーザーを選択</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="admin">管理者</option>
                <option value="member">メンバー</option>
                <option value="viewer">閲覧者</option>
              </select>
              <button type="submit" disabled={addMember.isPending} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                {addMember.isPending ? '追加中...' : '追加'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
