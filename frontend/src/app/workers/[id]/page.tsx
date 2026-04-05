"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, HardHat, Plus, Award, AlertTriangle } from "lucide-react";

interface Worker {
  id: string;
  name: string;
  blood_type: string | null;
  company_name: string | null;
  phone: string | null;
  emergency_contact: string | null;
  is_active: boolean;
}

interface Qualification {
  id: string;
  name: string;
  qualification_type: string | null;
  certificate_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
}

function isExpiringSoon(date: string | null): boolean {
  if (!date) return false;
  const expiry = new Date(date);
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return expiry.getTime() - now.getTime() < thirtyDays;
}

function isExpired(date: string | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    qualification_type: "",
    certificate_number: "",
    expiry_date: "",
  });

  const { data: worker } = useQuery<Worker>({
    queryKey: ["worker", id],
    queryFn: () => apiFetch(`/api/workers/${id}`, { token: token! }),
    enabled: !!token,
  });

  const { data: qualifications = [] } = useQuery<Qualification[]>({
    queryKey: ["qualifications", id],
    queryFn: () => apiFetch(`/api/workers/${id}/qualifications`, { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/workers/${id}/qualifications`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qualifications", id] });
      setShowForm(false);
      setForm({ name: "", qualification_type: "", certificate_number: "", expiry_date: "" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      qualification_type: form.qualification_type || null,
      certificate_number: form.certificate_number || null,
      expiry_date: form.expiry_date || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/workers" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HardHat className="w-6 h-6" /> 作業員詳細
        </h1>
      </div>

      {worker && (
        <div className="bg-white border rounded-lg p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">氏名</p>
              <p className="font-semibold text-lg">{worker.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">血液型</p>
              <p className="font-medium">{worker.blood_type ? `${worker.blood_type}型` : "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">所属会社</p>
              <p className="font-medium">{worker.company_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ステータス</p>
              <span className={`text-xs px-2 py-0.5 rounded ${
                worker.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                {worker.is_active ? "稼働中" : "非稼働"}
              </span>
            </div>
            {worker.phone && (
              <div>
                <p className="text-sm text-gray-500">電話番号</p>
                <p className="font-medium">{worker.phone}</p>
              </div>
            )}
            {worker.emergency_contact && (
              <div>
                <p className="text-sm text-gray-500">緊急連絡先</p>
                <p className="font-medium">{worker.emergency_contact}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Qualifications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5" /> 保有資格
          </h2>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> 資格追加
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">資格名</label>
                <input type="text" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">種別</label>
                <input type="text" value={form.qualification_type}
                  onChange={e => setForm({ ...form, qualification_type: e.target.value })}
                  className="w-full border rounded px-3 py-2" placeholder="国家資格/技能講習 等" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">証明書番号</label>
                <input type="text" value={form.certificate_number}
                  onChange={e => setForm({ ...form, certificate_number: e.target.value })}
                  className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">有効期限</label>
                <input type="date" value={form.expiry_date}
                  onChange={e => setForm({ ...form, expiry_date: e.target.value })}
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

        {qualifications.length === 0 ? (
          <p className="text-gray-500">資格が登録されていません</p>
        ) : (
          <div className="space-y-2">
            {qualifications.map(q => {
              const expired = isExpired(q.expiry_date);
              const expiring = !expired && isExpiringSoon(q.expiry_date);
              return (
                <div key={q.id} className={`bg-white border rounded-lg p-4 flex items-center justify-between ${
                  expired ? "border-red-300 bg-red-50" : expiring ? "border-yellow-300 bg-yellow-50" : ""
                }`}>
                  <div className="flex items-center gap-3">
                    <Award className={`w-4 h-4 ${expired ? "text-red-500" : "text-gray-400"}`} />
                    <span className="font-medium">{q.name}</span>
                    {q.qualification_type && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{q.qualification_type}</span>
                    )}
                    {q.certificate_number && (
                      <span className="text-xs text-gray-500">No. {q.certificate_number}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {q.expiry_date && (
                      <span className={`text-sm ${expired ? "text-red-600 font-medium" : expiring ? "text-yellow-600 font-medium" : "text-gray-500"}`}>
                        {expired && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                        期限: {formatDate(q.expiry_date)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
