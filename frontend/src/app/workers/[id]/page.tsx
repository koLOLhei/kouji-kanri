"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, HardHat, Plus, Award, AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";

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
  qualification_name: string;
  qualification_type: string | null;
  certificate_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
}

interface QualStatusItem {
  id: string;
  qualification_name: string;
  qualification_type: string | null;
  certificate_number: string | null;
  expiry_date: string | null;
  days_left: number | null;
  status: "expired" | "expiring_soon" | "valid" | "no_expiry";
  alert: "critical" | "high" | "medium" | "none";
}

interface QualStatus {
  worker_name: string;
  total_qualifications: number;
  expired_count: number;
  expiring_soon_count: number;
  valid_count: number;
  overall_alert: "critical" | "high" | "none";
  qualifications: QualStatusItem[];
}

const ALERT_BG: Record<string, string> = {
  critical: "border-red-300 bg-red-50",
  high: "border-orange-300 bg-orange-50",
  medium: "border-yellow-300 bg-yellow-50",
  none: "",
};

const ALERT_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  none: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
  expired: "期限切れ",
  expiring_soon: "期限間近",
  valid: "有効",
  no_expiry: "無期限",
};

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [activeView, setActiveView] = useState<"list" | "timeline">("list");
  const [form, setForm] = useState({
    qualification_name: "",
    qualification_type: "",
    certificate_number: "",
    expiry_date: "",
    issued_date: "",
  });

  const { data: worker } = useQuery<Worker>({
    queryKey: ["worker", id],
    queryFn: () => apiFetch(`/api/workers/${id}`, { token: token! }),
    enabled: !!token,
  });

  const { data: qualStatus } = useQuery<QualStatus>({
    queryKey: ["qual-status", id],
    queryFn: () => apiFetch(`/api/workers/${id}/qualification-status`, { token: token! }),
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
      queryClient.invalidateQueries({ queryKey: ["qual-status", id] });
      setShowForm(false);
      setForm({ qualification_name: "", qualification_type: "", certificate_number: "", expiry_date: "", issued_date: "" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      qualification_name: form.qualification_name,
      qualification_type: form.qualification_type || null,
      certificate_number: form.certificate_number || null,
      expiry_date: form.expiry_date || null,
      issued_date: form.issued_date || null,
    });
  };

  // Sort qualifications for timeline: by expiry date ascending
  const sortedQuals = [...(qualStatus?.qualifications || [])].sort((a, b) => {
    if (!a.expiry_date) return 1;
    if (!b.expiry_date) return -1;
    return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
  });

  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/workers" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HardHat className="w-6 h-6" /> 作業員詳細
        </h1>
        {qualStatus?.overall_alert && qualStatus.overall_alert !== "none" && (
          <span className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full font-medium ${
            qualStatus.overall_alert === "critical"
              ? "bg-red-100 text-red-700"
              : "bg-orange-100 text-orange-700"
          }`}>
            <ShieldAlert className="w-4 h-4" />
            資格要注意
          </span>
        )}
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

      {/* Qualification status summary */}
      {qualStatus && qualStatus.total_qualifications > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className={`rounded-xl p-4 text-center border ${qualStatus.expired_count > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
            <div className={`text-2xl font-bold ${qualStatus.expired_count > 0 ? "text-red-600" : "text-gray-400"}`}>
              {qualStatus.expired_count}
            </div>
            <div className="text-xs text-gray-500 mt-1">期限切れ</div>
          </div>
          <div className={`rounded-xl p-4 text-center border ${qualStatus.expiring_soon_count > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-200"}`}>
            <div className={`text-2xl font-bold ${qualStatus.expiring_soon_count > 0 ? "text-orange-600" : "text-gray-400"}`}>
              {qualStatus.expiring_soon_count}
            </div>
            <div className="text-xs text-gray-500 mt-1">期限間近</div>
          </div>
          <div className="rounded-xl p-4 text-center border bg-white border-gray-200">
            <div className="text-2xl font-bold text-green-600">{qualStatus.valid_count}</div>
            <div className="text-xs text-gray-500 mt-1">有効</div>
          </div>
        </div>
      )}

      {/* Qualifications section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5" /> 保有資格
          </h2>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border rounded-lg overflow-hidden text-sm">
              <button
                onClick={() => setActiveView("list")}
                className={`px-3 py-1.5 ${activeView === "list" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                一覧
              </button>
              <button
                onClick={() => setActiveView("timeline")}
                className={`px-3 py-1.5 ${activeView === "timeline" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                タイムライン
              </button>
            </div>
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> 資格追加
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">資格名 <span className="text-red-500">*</span></label>
                <input type="text" value={form.qualification_name}
                  onChange={e => setForm({ ...form, qualification_name: e.target.value })}
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
                <label className="block text-sm font-medium mb-1">取得日</label>
                <input type="date" value={form.issued_date}
                  onChange={e => setForm({ ...form, issued_date: e.target.value })}
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

        {activeView === "timeline" ? (
          // Timeline view
          <div className="relative">
            {sortedQuals.length === 0 ? (
              <p className="text-gray-500">資格が登録されていません</p>
            ) : (
              <div className="space-y-0">
                {sortedQuals.map((q, idx) => {
                  const isLast = idx === sortedQuals.length - 1;
                  const isPast = q.expiry_date ? new Date(q.expiry_date) < today : false;
                  return (
                    <div key={q.id} className="flex gap-4">
                      {/* Timeline line & dot */}
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full border-2 mt-5 shrink-0 ${
                          q.status === "expired" ? "bg-red-500 border-red-500" :
                          q.status === "expiring_soon" ? "bg-orange-400 border-orange-400" :
                          "bg-green-500 border-green-500"
                        }`} />
                        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
                      </div>
                      {/* Card */}
                      <div className={`flex-1 mb-3 bg-white border rounded-lg p-3 ${ALERT_BG[q.alert] || ""}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-medium">{q.qualification_name}</span>
                            {q.qualification_type && (
                              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{q.qualification_type}</span>
                            )}
                            {q.certificate_number && (
                              <div className="text-xs text-gray-500 mt-0.5">No. {q.certificate_number}</div>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${ALERT_BADGE[q.alert]}`}>
                            {STATUS_LABEL[q.status]}
                          </span>
                        </div>
                        {q.expiry_date && (
                          <div className={`flex items-center gap-1 mt-1.5 text-sm ${
                            q.status === "expired" ? "text-red-600" :
                            q.status === "expiring_soon" ? "text-orange-600" : "text-gray-500"
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            期限: {formatDate(q.expiry_date)}
                            {q.days_left !== null && !isPast && (
                              <span className="ml-1 font-medium">（あと{q.days_left}日）</span>
                            )}
                            {isPast && <span className="ml-1 font-medium">（期限切れ）</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // List view
          <>
            {qualifications.length === 0 ? (
              <p className="text-gray-500">資格が登録されていません</p>
            ) : (
              <div className="space-y-2">
                {(qualStatus?.qualifications || []).map(q => {
                  return (
                    <div key={q.id} className={`bg-white border rounded-lg p-4 flex items-center justify-between ${ALERT_BG[q.alert] || ""}`}>
                      <div className="flex items-center gap-3 flex-wrap">
                        {q.status === "expired" ? (
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        ) : q.status === "expiring_soon" ? (
                          <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        )}
                        <span className="font-medium">{q.qualification_name}</span>
                        {q.qualification_type && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{q.qualification_type}</span>
                        )}
                        {q.certificate_number && (
                          <span className="text-xs text-gray-500">No. {q.certificate_number}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {q.expiry_date ? (
                          <>
                            <span className={`text-sm font-medium ${
                              q.status === "expired" ? "text-red-600" :
                              q.status === "expiring_soon" ? "text-orange-600" : "text-gray-500"
                            }`}>
                              期限: {formatDate(q.expiry_date)}
                            </span>
                            {q.days_left !== null && q.days_left >= 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${ALERT_BADGE[q.alert]}`}>
                                {q.days_left}日
                              </span>
                            )}
                            {q.status === "expired" && (
                              <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-100 text-red-700">
                                期限切れ
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">無期限</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
