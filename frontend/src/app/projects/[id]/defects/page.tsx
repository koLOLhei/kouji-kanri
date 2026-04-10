"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import {
  Plus,
  X,
  AlertTriangle,
  MapPin,
  Calendar,
  User,
  ChevronRight,
  Clock,
  CheckCircle2,
  Search,
  Wrench,
  XCircle,
  FileWarning,
  ChevronDown,
} from "lucide-react";

type DefectStatus = "reported" | "investigating" | "repairing" | "completed" | "closed";
type ResponsibleParty = "施工者" | "下請" | "発注者";

interface Defect {
  id: string;
  defect_number: string;
  title: string;
  location: string;
  reported_date: string;
  reported_by: string;
  description: string;
  responsible_party: ResponsibleParty;
  repair_method: string;
  due_date: string;
  status: DefectStatus;
}

const STATUS_FLOW: DefectStatus[] = [
  "reported",
  "investigating",
  "repairing",
  "completed",
  "closed",
];

const STATUS_CONFIG: Record<
  DefectStatus,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  reported: {
    label: "報告",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  investigating: {
    label: "調査",
    icon: <Search className="w-3.5 h-3.5" />,
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
  },
  repairing: {
    label: "修理",
    icon: <Wrench className="w-3.5 h-3.5" />,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  completed: {
    label: "完了",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
  closed: {
    label: "クローズ",
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: "text-gray-700",
    bg: "bg-gray-50 border-gray-200",
  },
};

const RESPONSIBLE_PARTY_CONFIG: Record<ResponsibleParty, { color: string }> = {
  施工者: { color: "bg-blue-50 text-blue-700 border-blue-200" },
  下請: { color: "bg-orange-50 text-orange-700 border-orange-200" },
  発注者: { color: "bg-purple-50 text-purple-700 border-purple-200" },
};

const RESPONSIBLE_PARTIES: ResponsibleParty[] = ["施工者", "下請", "発注者"];

function isOverdue(dueDate: string, status: DefectStatus): boolean {
  if (status === "completed" || status === "closed") return false;
  return new Date(dueDate) < new Date();
}

export default function DefectsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    location: "",
    reported_date: "",
    reported_by: "",
    description: "",
    responsible_party: "施工者" as ResponsibleParty,
    repair_method: "",
    due_date: "",
  });

  const { data: defects = [], isLoading } = useQuery<Defect[]>({
    queryKey: ["defects", projectId],
    queryFn: () =>
      apiFetch(`/api/projects/${projectId}/defects`, { token }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch(`/api/projects/${projectId}/defects`, {
        token,
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defects", projectId] });
      setShowForm(false);
      setForm({
        title: "",
        location: "",
        reported_date: "",
        reported_by: "",
        description: "",
        responsible_party: "施工者",
        repair_method: "",
        due_date: "",
      });
    },
  });

  const advanceStatusMutation = useMutation({
    mutationFn: ({ defectId, newStatus }: { defectId: string; newStatus: DefectStatus }) =>
      apiFetch(`/api/projects/${projectId}/defects/${defectId}`, {
        token,
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["defects", projectId] });
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      title: form.title,
      location: form.location,
      reported_date: form.reported_date,
      reported_by: form.reported_by,
      description: form.description,
      responsible_party: form.responsible_party,
      repair_method: form.repair_method,
      due_date: form.due_date,
    });
  };

  const getNextStatus = (current: DefectStatus): DefectStatus | null => {
    const idx = STATUS_FLOW.indexOf(current);
    if (idx < STATUS_FLOW.length - 1) return STATUS_FLOW[idx + 1];
    return null;
  };

  const openCount = defects.filter(
    (d) => d.status !== "completed" && d.status !== "closed"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">瑕疵・アフター管理</h1>
            {openCount > 0 && (
              <span className="inline-flex items-center justify-center px-3 py-1 bg-red-100 text-red-700 text-sm font-bold rounded-full">
                {openCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "閉じる" : "瑕疵報告"}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800">新規瑕疵報告</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Title */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">件名</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="例: 3F廊下 天井クラック"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">場所</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="例: 3F 廊下"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Reported Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">報告日</label>
                <input
                  type="date"
                  value={form.reported_date}
                  onChange={(e) => setForm({ ...form, reported_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Reported By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">報告者</label>
                <input
                  type="text"
                  value={form.reported_by}
                  onChange={(e) => setForm({ ...form, reported_by: e.target.value })}
                  placeholder="例: 佐藤一郎"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Responsible Party */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">責任区分</label>
                <div className="relative">
                  <select
                    value={form.responsible_party}
                    onChange={(e) =>
                      setForm({ ...form, responsible_party: e.target.value as ResponsibleParty })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none appearance-none"
                  >
                    {RESPONSIBLE_PARTIES.map((rp) => (
                      <option key={rp} value={rp}>
                        {rp}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Description */}
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">詳細</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="瑕疵の詳細を記載してください"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              {/* Repair Method */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">修理方法</label>
                <input
                  type="text"
                  value={form.repair_method}
                  onChange={(e) => setForm({ ...form, repair_method: e.target.value })}
                  placeholder="例: Vカット充填工法"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">対応期限</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || !form.title}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? "登録中..." : "報告する"}
              </button>
            </div>
          </div>
        )}

        {/* Defect List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        ) : defects.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
            <FileWarning className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">瑕疵・アフター案件がありません</p>
            <p className="text-gray-400 text-sm mt-1">「瑕疵報告」ボタンから登録してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {defects.map((defect) => {
              const statusCfg = STATUS_CONFIG[defect.status];
              const rpCfg = RESPONSIBLE_PARTY_CONFIG[defect.responsible_party];
              const overdue = isOverdue(defect.due_date, defect.status);
              const nextStatus = getNextStatus(defect.status);
              const currentIdx = STATUS_FLOW.indexOf(defect.status);

              return (
                <div
                  key={defect.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="p-5 space-y-4">
                    {/* Top Row */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-gray-400">
                            {defect.defect_number}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium border ${statusCfg.bg} ${statusCfg.color}`}
                          >
                            {statusCfg.icon}
                            {statusCfg.label}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{defect.title}</h3>
                      </div>
                      {overdue && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
                          <Clock className="w-3 h-3" />
                          期限超過
                        </span>
                      )}
                    </div>

                    {/* Info Row */}
                    <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{defect.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>{defect.reported_by}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{defect.reported_date}</span>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${rpCfg.color}`}
                      >
                        {defect.responsible_party}
                      </span>
                    </div>

                    {/* Description */}
                    {defect.description && (
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
                        {defect.description}
                      </p>
                    )}

                    {/* Repair Method */}
                    {defect.repair_method && (
                      <div className="flex items-center gap-2 text-sm">
                        <Wrench className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-600">{defect.repair_method}</span>
                      </div>
                    )}

                    {/* Due Date */}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className={overdue ? "text-red-600 font-semibold" : "text-gray-600"}>
                        期限: {defect.due_date}
                      </span>
                    </div>

                    {/* Status Workflow Dots */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        {STATUS_FLOW.map((status, idx) => {
                          const cfg = STATUS_CONFIG[status];
                          const isActive = idx <= currentIdx;
                          const isCurrent = idx === currentIdx;

                          return (
                            <div key={status} className="flex items-center">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                    isCurrent
                                      ? `${cfg.bg} ${cfg.color} border-current shadow-sm`
                                      : isActive
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-300"
                                        : "bg-gray-50 text-gray-300 border-gray-200"
                                  }`}
                                >
                                  {isActive && idx < currentIdx ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                  ) : (
                                    cfg.icon
                                  )}
                                </div>
                                <span
                                  className={`text-[10px] mt-1 font-medium ${
                                    isCurrent ? cfg.color : isActive ? "text-emerald-600" : "text-gray-300"
                                  }`}
                                >
                                  {cfg.label}
                                </span>
                              </div>
                              {idx < STATUS_FLOW.length - 1 && (
                                <div
                                  className={`w-6 h-0.5 mx-0.5 mb-5 ${
                                    idx < currentIdx ? "bg-emerald-300" : "bg-gray-200"
                                  }`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Advance Button */}
                    {nextStatus && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() =>
                            advanceStatusMutation.mutate({
                              defectId: defect.id,
                              newStatus: nextStatus,
                            })
                          }
                          disabled={advanceStatusMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                          {STATUS_CONFIG[nextStatus].label}へ進める
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
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
