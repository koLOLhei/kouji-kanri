"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import Link from "next/link";
import { Building2, Plus, Phone, User, Star } from "lucide-react";

interface Subcontractor {
  id: string;
  company_name: string;
  representative: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  registration_number: string | null;
  is_active: boolean;
}

export default function SubcontractorsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    representative: "",
    phone: "",
    email: "",
    address: "",
    registration_number: "",
  });

  const { data: subs = [], isLoading } = useQuery<Subcontractor[]>({
    queryKey: ["subcontractors"],
    queryFn: () => apiFetch("/api/subcontractors", { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/subcontractors", {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
      setShowForm(false);
      setForm({ company_name: "", representative: "", phone: "", email: "", address: "", registration_number: "" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      company_name: form.company_name,
      representative: form.representative || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      registration_number: form.registration_number || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" /> 協力会社管理
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 協力会社登録
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-lg">協力会社登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">会社名</label>
              <input type="text" value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })}
                className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">代表者</label>
              <input type="text" value={form.representative}
                onChange={e => setForm({ ...form, representative: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">電話番号</label>
              <input type="tel" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">メールアドレス</label>
              <input type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">住所</label>
              <input type="text" value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">登録番号</label>
              <input type="text" value={form.registration_number}
                onChange={e => setForm({ ...form, registration_number: e.target.value })}
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
      ) : subs.length === 0 ? (
        <p className="text-gray-500">協力会社がありません</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subs.map(s => (
            <div key={s.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{s.company_name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {s.is_active ? "有効" : "無効"}
                </span>
              </div>
              {s.representative && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <User className="w-3 h-3" /> {s.representative}
                </p>
              )}
              {s.phone && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {s.phone}
                </p>
              )}
              {s.registration_number && (
                <p className="text-xs text-gray-400 mt-2">登録番号: {s.registration_number}</p>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <Link
                  href={`/subcontractors/${s.id}/evaluations`}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <Star className="w-3 h-3" /> 評価を見る
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
