"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PackageCheck,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileEdit,
  Send,
  ArrowRight,
  Factory,
  MapPin,
  Hash,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";

interface MaterialApproval {
  id: string;
  material_name: string;
  specification: string;
  manufacturer: string;
  product_name: string;
  usage_location: string;
  quantity: string;
  status: "下書き" | "提出" | "承認" | "却下";
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_at: string;
}

const STATUS_CONFIG = {
  下書き: {
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: FileEdit,
    gradient: "from-gray-400 to-gray-500",
  },
  提出: {
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Send,
    gradient: "from-blue-400 to-blue-600",
  },
  承認: {
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
    gradient: "from-green-400 to-emerald-600",
  },
  却下: {
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
    gradient: "from-red-400 to-rose-600",
  },
};

const STATUS_ORDER: MaterialApproval["status"][] = [
  "下書き",
  "提出",
  "承認",
  "却下",
];

type FilterStatus = "all" | MaterialApproval["status"];

export default function MaterialApprovalsPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    material_name: "",
    specification: "",
    manufacturer: "",
    product_name: "",
    usage_location: "",
    quantity: "",
  });

  const headers = { Authorization: `Bearer ${token}` };

  const { data: approvals = [] } = useQuery<MaterialApproval[]>({
    queryKey: ["material-approvals", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/material-approvals`, { headers }),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch(`/api/projects/${id}/material-approvals`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["material-approvals", id],
      });
      setShowForm(false);
      setForm({
        material_name: "",
        specification: "",
        manufacturer: "",
        product_name: "",
        usage_location: "",
        quantity: "",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      approvalId,
      status,
    }: {
      approvalId: string;
      status: string;
    }) =>
      apiFetch(`/api/projects/${id}/material-approvals/${approvalId}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["material-approvals", id],
      });
    },
  });

  const filtered =
    filter === "all"
      ? approvals
      : approvals.filter((a) => a.status === filter);

  const counts = {
    total: approvals.length,
    approved: approvals.filter((a) => a.status === "承認").length,
    pending: approvals.filter(
      (a) => a.status === "下書き" || a.status === "提出"
    ).length,
  };

  const filterTabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: "all", label: "全て", count: approvals.length },
    {
      key: "下書き",
      label: "下書き",
      count: approvals.filter((a) => a.status === "下書き").length,
    },
    {
      key: "提出",
      label: "提出済",
      count: approvals.filter((a) => a.status === "提出").length,
    },
    {
      key: "承認",
      label: "承認済",
      count: approvals.filter((a) => a.status === "承認").length,
    },
    {
      key: "却下",
      label: "却下",
      count: approvals.filter((a) => a.status === "却下").length,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-violet-500 to-purple-700 p-3 rounded-xl shadow-lg shadow-violet-500/30">
              <PackageCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                材料承認願
              </h1>
              <p className="text-gray-500 mt-0.5">
                材料・製品の承認ワークフロー管理
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-5 py-2.5 rounded-lg shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
          >
            <Plus className="w-5 h-5" />
            新規申請
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <Package className="w-7 h-7 opacity-80" />
              <span className="text-3xl font-bold">{counts.total}</span>
            </div>
            <p className="mt-2 text-sm opacity-90">総申請数</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-700 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-7 h-7 opacity-80" />
              <span className="text-3xl font-bold">{counts.approved}</span>
            </div>
            <p className="mt-2 text-sm opacity-90">承認済</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <Clock className="w-7 h-7 opacity-80" />
              <span className="text-3xl font-bold">{counts.pending}</span>
            </div>
            <p className="mt-2 text-sm opacity-90">未承認</p>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              材料承認申請
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  材料名
                </label>
                <input
                  type="text"
                  value={form.material_name}
                  onChange={(e) =>
                    setForm({ ...form, material_name: e.target.value })
                  }
                  placeholder="例: 異形鉄筋 D25"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  規格・仕様
                </label>
                <input
                  type="text"
                  value={form.specification}
                  onChange={(e) =>
                    setForm({ ...form, specification: e.target.value })
                  }
                  placeholder="例: SD345 JIS G 3112"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  製造者
                </label>
                <input
                  type="text"
                  value={form.manufacturer}
                  onChange={(e) =>
                    setForm({ ...form, manufacturer: e.target.value })
                  }
                  placeholder="例: 東京製鉄株式会社"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  製品名
                </label>
                <input
                  type="text"
                  value={form.product_name}
                  onChange={(e) =>
                    setForm({ ...form, product_name: e.target.value })
                  }
                  placeholder="例: ネジテツコン SD345"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  使用箇所
                </label>
                <input
                  type="text"
                  value={form.usage_location}
                  onChange={(e) =>
                    setForm({ ...form, usage_location: e.target.value })
                  }
                  placeholder="例: 1F-3F 柱・梁"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  数量
                </label>
                <input
                  type="text"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value })
                  }
                  placeholder="例: 12,500 kg"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50"
                >
                  {createMutation.isPending ? "登録中..." : "申請登録"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                filter === tab.key
                  ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {tab.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs ${
                  filter === tab.key
                    ? "bg-white/20"
                    : "bg-gray-100"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Material Cards */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-400 border border-dashed border-gray-300">
            <PackageCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>該当する材料承認願がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((approval) => {
              const statusConfig = STATUS_CONFIG[approval.status];
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedId === approval.id;

              return (
                <div
                  key={approval.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : approval.id)
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {approval.material_name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${statusConfig.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {approval.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Factory className="w-3.5 h-3.5" />
                            {approval.manufacturer}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {approval.usage_location}
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>

                    {/* Status Workflow */}
                    <div className="mt-4 flex items-center gap-1">
                      {STATUS_ORDER.map((status, idx) => {
                        const isActive =
                          status === approval.status ||
                          (approval.status === "承認" &&
                            (status === "下書き" || status === "提出")) ||
                          (approval.status === "却下" &&
                            (status === "下書き" || status === "提出")) ||
                          (approval.status === "提出" && status === "下書き");
                        const isCurrent = status === approval.status;
                        const isRejected =
                          status === "却下" && approval.status === "却下";
                        const conf = STATUS_CONFIG[status];

                        return (
                          <div key={status} className="flex items-center flex-1">
                            <div
                              className={`flex-1 h-2 rounded-full ${
                                isActive
                                  ? isRejected
                                    ? "bg-gradient-to-r from-red-400 to-rose-500"
                                    : `bg-gradient-to-r ${conf.gradient}`
                                  : "bg-gray-200"
                              }`}
                            />
                            {idx < STATUS_ORDER.length - 1 && (
                              <ArrowRight
                                className={`w-3 h-3 flex-shrink-0 mx-0.5 ${
                                  isActive ? "text-gray-600" : "text-gray-300"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      {STATUS_ORDER.map((s) => (
                        <span
                          key={s}
                          className={
                            s === approval.status
                              ? "font-bold text-gray-700"
                              : ""
                          }
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-5">
                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div className="bg-white p-3 rounded-lg border">
                          <p className="text-xs text-gray-500">材料名</p>
                          <p className="font-medium">
                            {approval.material_name}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <p className="text-xs text-gray-500">規格・仕様</p>
                          <p className="font-medium">
                            {approval.specification}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <p className="text-xs text-gray-500">製造者</p>
                          <p className="font-medium">
                            {approval.manufacturer}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <p className="text-xs text-gray-500">製品名</p>
                          <p className="font-medium">
                            {approval.product_name}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <p className="text-xs text-gray-500">使用箇所</p>
                          <p className="font-medium">
                            {approval.usage_location}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <p className="text-xs text-gray-500">数量</p>
                          <p className="font-medium">{approval.quantity}</p>
                        </div>
                      </div>

                      {approval.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                          <p className="text-xs text-red-600 font-medium mb-1">
                            却下理由
                          </p>
                          <p className="text-sm text-red-800">
                            {approval.rejection_reason}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 justify-end">
                        {approval.status === "下書き" && (
                          <button
                            onClick={() =>
                              updateMutation.mutate({
                                approvalId: approval.id,
                                status: "提出",
                              })
                            }
                            disabled={updateMutation.isPending}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white text-sm rounded-lg shadow hover:shadow-md transition disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                            提出する
                          </button>
                        )}
                        {approval.status === "提出" && (
                          <>
                            <button
                              onClick={() =>
                                updateMutation.mutate({
                                  approvalId: approval.id,
                                  status: "却下",
                                })
                              }
                              disabled={updateMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              却下
                            </button>
                            <button
                              onClick={() =>
                                updateMutation.mutate({
                                  approvalId: approval.id,
                                  status: "承認",
                                })
                              }
                              disabled={updateMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm rounded-lg shadow hover:shadow-md transition disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              承認する
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
