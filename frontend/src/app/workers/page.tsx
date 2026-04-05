"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import Link from "next/link";
import { HardHat, Plus, ChevronRight } from "lucide-react";

interface Worker {
  id: string;
  name: string;
  blood_type: string | null;
  company_name: string | null;
  phone: string | null;
  is_active: boolean;
}

export default function WorkersPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    blood_type: "",
    company_name: "",
    phone: "",
  });

  const { data: workers = [], isLoading } = useQuery<Worker[]>({
    queryKey: ["workers"],
    queryFn: () => apiFetch("/api/workers", { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/workers", {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      setShowForm(false);
      setForm({ name: "", blood_type: "", company_name: "", phone: "" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      blood_type: form.blood_type || null,
      company_name: form.company_name || null,
      phone: form.phone || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HardHat className="w-6 h-6" /> 作業員管理
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 作業員登録
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-lg">作業員登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">氏名</label>
              <input type="text" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">血液型</label>
              <select value={form.blood_type}
                onChange={e => setForm({ ...form, blood_type: e.target.value })}
                className="w-full border rounded px-3 py-2">
                <option value="">未設定</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="O">O</option>
                <option value="AB">AB</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">所属会社</label>
              <input type="text" value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">電話番号</label>
              <input type="tel" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createMutation.isPending}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {createMutation.isPending ? "保存中..." : "保存"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="border px-6 py-2 rounded-lg hover:bg-gray-50">キャンセル</button>
          </div>
          {createMutation.isError && (
            <p className="text-red-600 text-sm">{(createMutation.error as Error).message}</p>
          )}
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : workers.length === 0 ? (
        <p className="text-gray-500">作業員がいません</p>
      ) : (
        <div className="space-y-2">
          {workers.map(w => (
            <Link key={w.id} href={`/workers/${w.id}`}
              className="bg-white border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 block">
              <div className="flex items-center gap-4">
                <span className="font-semibold">{w.name}</span>
                {w.blood_type && (
                  <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">{w.blood_type}型</span>
                )}
                {w.company_name && (
                  <span className="text-sm text-gray-500">{w.company_name}</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded ${
                  w.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {w.is_active ? "稼働中" : "非稼働"}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
