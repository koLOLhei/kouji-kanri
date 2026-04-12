"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  X,
  Filter,
  BarChart2,
} from "lucide-react";

// ─── Types ───

interface PunchListItem {
  id: string;
  project_id: string;
  location: string;
  title: string;
  description: string | null;
  severity: "minor" | "major" | "critical";
  status: "open" | "in_progress" | "resolved" | "verified";
  reported_by: string;
  reported_by_role: string;
  assigned_to: string | null;
  photo_ids: string[] | null;
  resolution_photo_ids: string[] | null;
  resolution_notes: string | null;
  due_date: string | null;
  resolved_at: string | null;
  verified_at: string | null;
  created_at: string;
}

interface Summary {
  total: number;
  open: number;
  resolved: number;
  verified: number;
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
}

// ─── Severity helpers ───

const SEVERITY_CONFIG = {
  minor: { label: "軽微", cls: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-400" },
  major: { label: "重大", cls: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  critical: { label: "緊急", cls: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-600" },
};

const STATUS_CONFIG = {
  open: { label: "未対応", cls: "bg-amber-100 text-amber-700", icon: <Clock className="w-3.5 h-3.5" /> },
  in_progress: { label: "対応中", cls: "bg-blue-100 text-blue-700", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  resolved: { label: "是正完了", cls: "bg-purple-100 text-purple-700", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  verified: { label: "検証済み", cls: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.minor;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Create Form ───

function CreateForm({
  projectId,
  token,
  onClose,
}: {
  projectId: string;
  token: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    location: "",
    title: "",
    description: "",
    severity: "minor",
    reported_by: "",
    reported_by_role: "inspector",
    assigned_to: "",
    due_date: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch(`/api/projects/${projectId}/punch-list`, {
        method: "POST",
        token,
        body: JSON.stringify({
          ...data,
          due_date: data.due_date || null,
          assigned_to: data.assigned_to || null,
          description: data.description || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["punch-list", projectId] });
      queryClient.invalidateQueries({ queryKey: ["punch-list-summary", projectId] });
      onClose();
    },
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900">指摘事項を登録</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">場所 <span className="text-red-500">*</span></label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 2階廊下 北壁面"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">指摘事項 <span className="text-red-500">*</span></label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: タイルの浮き・剥離"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">詳細説明</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
              placeholder="詳細な状況・範囲など"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">重要度</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.severity}
                onChange={(e) => set("severity", e.target.value)}
              >
                <option value="minor">軽微</option>
                <option value="major">重大</option>
                <option value="critical">緊急</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">報告者区分</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.reported_by_role}
                onChange={(e) => set("reported_by_role", e.target.value)}
              >
                <option value="inspector">監督員</option>
                <option value="client">発注者</option>
                <option value="manager">現場代理人</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">報告者氏名 <span className="text-red-500">*</span></label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 田中 一郎"
              value={form.reported_by}
              onChange={(e) => set("reported_by", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">対応担当者</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="任意"
                value={form.assigned_to}
                onChange={(e) => set("assigned_to", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">対応期限</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={() => createMutation.mutate(form)}
            disabled={!form.location.trim() || !form.title.trim() || !form.reported_by.trim() || createMutation.isPending}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? "登録中..." : "登録する"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Resolve Form ───

function ResolveModal({
  item,
  token,
  projectId,
  onClose,
}: {
  item: PunchListItem;
  token: string;
  projectId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(item.resolution_notes ?? "");

  const resolveMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/projects/${projectId}/punch-list/${item.id}/resolve`, {
        method: "PUT",
        token,
        body: JSON.stringify({ resolution_notes: notes || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["punch-list", projectId] });
      queryClient.invalidateQueries({ queryKey: ["punch-list-summary", projectId] });
      onClose();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/projects/${projectId}/punch-list/${item.id}/verify`, {
        method: "PUT",
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["punch-list", projectId] });
      queryClient.invalidateQueries({ queryKey: ["punch-list-summary", projectId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">是正対応</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-700 font-medium mb-1">{item.title}</p>
        <p className="text-xs text-gray-500 mb-4">{item.location}</p>

        {item.status !== "resolved" && (
          <>
            <label className="block text-xs font-medium text-gray-700 mb-1">是正内容メモ</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] resize-none mb-4"
              placeholder="是正内容を記入してください"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              onClick={() => resolveMutation.mutate()}
              disabled={resolveMutation.isPending}
              className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {resolveMutation.isPending ? "処理中..." : "是正完了としてマーク"}
            </button>
          </>
        )}

        {item.status === "resolved" && (
          <>
            {item.resolution_notes && (
              <div className="bg-purple-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-600 font-medium mb-1">是正内容</p>
                <p className="text-sm text-gray-800">{item.resolution_notes}</p>
              </div>
            )}
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              className="w-full px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {verifyMutation.isPending ? "処理中..." : "検証済みとしてマーク"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Item Card ───

function ItemCard({
  item,
  token,
  projectId,
}: {
  item: PunchListItem;
  token: string;
  projectId: string;
}) {
  const [showResolve, setShowResolve] = useState(false);

  return (
    <>
      {showResolve && (
        <ResolveModal
          item={item}
          token={token}
          projectId={projectId}
          onClose={() => setShowResolve(false)}
        />
      )}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        <div
          className={`h-1 ${
            item.severity === "critical"
              ? "bg-red-500"
              : item.severity === "major"
              ? "bg-orange-400"
              : "bg-gray-300"
          }`}
        />
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={item.severity} />
              <StatusBadge status={item.status} />
            </div>
            {item.due_date && (
              <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(item.due_date)}</span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {item.location}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {item.reported_by}
            </span>
          </div>

          {item.description && (
            <p className="text-xs text-gray-500 mt-2 line-clamp-2">{item.description}</p>
          )}

          {item.assigned_to && (
            <p className="text-xs text-blue-600 mt-1">担当: {item.assigned_to}</p>
          )}

          {/* Resolution notes */}
          {item.resolution_notes && item.status !== "open" && (
            <div className="mt-2 bg-purple-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-600 font-medium">是正内容:</p>
              <p className="text-xs text-gray-800">{item.resolution_notes}</p>
            </div>
          )}

          {/* Before/After photos indicator */}
          {(item.photo_ids?.length || item.resolution_photo_ids?.length) && (
            <div className="flex gap-3 mt-2 text-xs text-gray-400">
              {(item.photo_ids?.length ?? 0) > 0 && (
                <span>指摘写真: {item.photo_ids!.length}枚</span>
              )}
              {(item.resolution_photo_ids?.length ?? 0) > 0 && (
                <span>是正写真: {item.resolution_photo_ids!.length}枚</span>
              )}
            </div>
          )}

          {/* Action buttons */}
          {item.status !== "verified" && (
            <button
              onClick={() => setShowResolve(true)}
              className="mt-3 w-full px-3 py-1.5 border border-purple-200 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-50 transition-colors"
            >
              {item.status === "resolved" ? "検証済みにする" : "是正完了にする"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Page ───

export default function PunchListPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const { token } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSeverity, setFilterSeverity] = useState<string>("");
  const [showSummary, setShowSummary] = useState(true);

  const queryKey = ["punch-list", projectId, filterStatus, filterSeverity];
  const { data: items = [], isLoading } = useQuery<PunchListItem[]>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterSeverity) params.set("severity", filterSeverity);
      return apiFetch(`/api/projects/${projectId}/punch-list?${params}`, { token });
    },
    enabled: !!token,
  });

  const { data: summary } = useQuery<Summary>({
    queryKey: ["punch-list-summary", projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/punch-list/summary`, { token }),
    enabled: !!token,
  });

  const openCount = summary?.open ?? 0;

  return (
    <>
      {showCreate && (
        <CreateForm
          projectId={projectId}
          token={token!}
          onClose={() => setShowCreate(false)}
        />
      )}

      <div className="p-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link href={`/projects/${projectId}`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              パンチリスト
              {openCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {openCount}
                </span>
              )}
            </h1>
          </div>
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            登録
          </button>
        </div>

        {/* Summary */}
        {showSummary && summary && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: "未対応", value: summary.by_status?.open ?? 0, cls: "bg-amber-50 text-amber-700" },
              { label: "対応中", value: summary.by_status?.in_progress ?? 0, cls: "bg-blue-50 text-blue-700" },
              { label: "是正済", value: summary.by_status?.resolved ?? 0, cls: "bg-purple-50 text-purple-700" },
              { label: "検証済", value: summary.by_status?.verified ?? 0, cls: "bg-green-50 text-green-700" },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`rounded-xl p-3 text-center ${cls}`}>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
            <Filter className="w-3.5 h-3.5" />
          </div>
          {["", "open", "in_progress", "resolved", "verified"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterStatus === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "" ? "すべて" : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label ?? s}
            </button>
          ))}
          <div className="w-px bg-gray-200 flex-shrink-0" />
          {["", "minor", "major", "critical"].map((sv) => (
            <button
              key={sv}
              onClick={() => setFilterSeverity(sv)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterSeverity === sv
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {sv === "" ? "全重要度" : SEVERITY_CONFIG[sv as keyof typeof SEVERITY_CONFIG]?.label ?? sv}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading && (
          <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">指摘事項はありません</p>
            <p className="text-xs mt-1">右上の「登録」ボタンから追加できます</p>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} token={token!} projectId={projectId} />
          ))}
        </div>
      </div>
    </>
  );
}
