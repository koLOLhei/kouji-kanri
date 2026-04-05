"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  FileEdit, Plus, Trash2, ChevronDown, ChevronUp, Loader2,
  CheckCircle2, XCircle, Send, Clock, ArrowUpDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatAmount, cn } from "@/lib/utils";

// ---------- Types ----------

interface DesignChangeItem {
  item_name: string;
  unit: string;
  original_qty: number | null;
  changed_qty: number | null;
  unit_price: number | null;
  original_amount: number | null;
  changed_amount: number | null;
}

interface DesignChange {
  id: string;
  project_id: string;
  change_number: number;
  title: string;
  reason: string | null;
  description: string | null;
  change_type: string;
  status: string;
  original_amount: number | null;
  changed_amount: number | null;
  difference_amount: number | null;
  original_duration: number | null;
  changed_duration: number | null;
  items_json: DesignChangeItem[] | null;
  requested_by: string | null;
  approved_by: string | null;
  requested_at: string;
  approved_at: string | null;
  created_at: string;
}

interface Summary {
  total_changes: number;
  approved_count: number;
  pending_count: number;
  net_budget_impact: number;
  net_duration_impact_days: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
}

// ---------- Helpers ----------

const STATUS_LABEL: Record<string, string> = {
  draft: "下書き",
  submitted: "提出済",
  negotiating: "協議中",
  approved: "承認済",
  rejected: "却下",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  negotiating: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const CHANGE_TYPES = ["設計変更", "数量変更", "工期変更", "追加工事"];

const EMPTY_ITEM: DesignChangeItem = {
  item_name: "",
  unit: "",
  original_qty: null,
  changed_qty: null,
  unit_price: null,
  original_amount: null,
  changed_amount: null,
};

// ---------- Line items table ----------

function LineItemsTable({
  items,
  onChange,
}: {
  items: DesignChangeItem[];
  onChange: (items: DesignChangeItem[]) => void;
}) {
  const update = (idx: number, field: keyof DesignChangeItem, value: string | number | null) => {
    const next = items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      // Auto-calculate amounts
      if (field === "original_qty" || field === "unit_price") {
        const qty = field === "original_qty" ? Number(value) : (item.original_qty || 0);
        const price = field === "unit_price" ? Number(value) : (item.unit_price || 0);
        updated.original_amount = qty && price ? qty * price : null;
      }
      if (field === "changed_qty" || field === "unit_price") {
        const qty = field === "changed_qty" ? Number(value) : (item.changed_qty || 0);
        const price = field === "unit_price" ? Number(value) : (item.unit_price || 0);
        updated.changed_amount = qty && price ? qty * price : null;
      }
      return updated;
    });
    onChange(next);
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, { ...EMPTY_ITEM }]);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              {["工種・種別", "単位", "変更前数量", "変更後数量", "単価", "変更前金額", "変更後金額", ""].map((h) => (
                <th key={h} className="px-2 py-2 text-left text-xs text-gray-500 border-b border-gray-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="px-1 py-1">
                  <input
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    value={item.item_name}
                    onChange={(e) => update(idx, "item_name", e.target.value)}
                    placeholder="工種名"
                  />
                </td>
                <td className="px-1 py-1 w-16">
                  <input
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    value={item.unit}
                    onChange={(e) => update(idx, "unit", e.target.value)}
                    placeholder="m2"
                  />
                </td>
                <td className="px-1 py-1 w-24">
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                    value={item.original_qty ?? ""}
                    onChange={(e) => update(idx, "original_qty", e.target.value ? Number(e.target.value) : null)}
                  />
                </td>
                <td className="px-1 py-1 w-24">
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                    value={item.changed_qty ?? ""}
                    onChange={(e) => update(idx, "changed_qty", e.target.value ? Number(e.target.value) : null)}
                  />
                </td>
                <td className="px-1 py-1 w-28">
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                    value={item.unit_price ?? ""}
                    onChange={(e) => update(idx, "unit_price", e.target.value ? Number(e.target.value) : null)}
                  />
                </td>
                <td className="px-2 py-1 text-right text-gray-600 text-xs w-28">
                  {item.original_amount != null ? formatAmount(item.original_amount) : "-"}
                </td>
                <td className="px-2 py-1 text-right text-gray-600 text-xs w-28">
                  {item.changed_amount != null ? formatAmount(item.changed_amount) : "-"}
                </td>
                <td className="px-1 py-1 w-8">
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
      >
        <Plus className="w-4 h-4" />
        明細を追加
      </button>
    </div>
  );
}

// ---------- Create/Edit Modal ----------

function DesignChangeModal({
  projectId,
  token,
  onClose,
  editing,
}: {
  projectId: string;
  token: string;
  onClose: () => void;
  editing?: DesignChange;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [changeType, setChangeType] = useState(editing?.change_type ?? "設計変更");
  const [reason, setReason] = useState(editing?.reason ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [originalAmount, setOriginalAmount] = useState<string>(String(editing?.original_amount ?? ""));
  const [changedAmount, setChangedAmount] = useState<string>(String(editing?.changed_amount ?? ""));
  const [originalDuration, setOriginalDuration] = useState<string>(String(editing?.original_duration ?? ""));
  const [changedDuration, setChangedDuration] = useState<string>(String(editing?.changed_duration ?? ""));
  const [requestedBy, setRequestedBy] = useState(editing?.requested_by ?? "");
  const [items, setItems] = useState<DesignChangeItem[]>(editing?.items_json ?? [{ ...EMPTY_ITEM }]);

  const mutation = useMutation({
    mutationFn: (data: unknown) => {
      if (editing) {
        return apiFetch(`/api/projects/${projectId}/design-changes/${editing.id}`, {
          method: "PUT", body: JSON.stringify(data), token,
        });
      }
      return apiFetch(`/api/projects/${projectId}/design-changes`, {
        method: "POST", body: JSON.stringify(data), token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["design-changes", projectId] });
      qc.invalidateQueries({ queryKey: ["design-changes-summary", projectId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.item_name.trim());
    mutation.mutate({
      title,
      change_type: changeType,
      reason: reason || null,
      description: description || null,
      original_amount: originalAmount ? Number(originalAmount) : null,
      changed_amount: changedAmount ? Number(changedAmount) : null,
      original_duration: originalDuration ? Number(originalDuration) : null,
      changed_duration: changedDuration ? Number(changedDuration) : null,
      requested_by: requestedBy || null,
      items_json: validItems.length > 0 ? validItems : null,
    });
  };

  const diff =
    changedAmount && originalAmount
      ? Number(changedAmount) - Number(originalAmount)
      : null;
  const durationDiff =
    changedDuration && originalDuration
      ? Number(changedDuration) - Number(originalDuration)
      : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">
            {editing ? "設計変更を編集" : "設計変更を新規登録"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">変更名称 *</label>
              <input
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 〇〇工事 設計変更 第1号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">変更種別</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={changeType}
                onChange={(e) => setChangeType(e.target.value)}
              >
                {CHANGE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">申請者</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">変更理由</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">変更内容</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Amount impact */}
          <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">変更前金額（円）</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={originalAmount}
                onChange={(e) => setOriginalAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">変更後金額（円）</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={changedAmount}
                onChange={(e) => setChangedAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">増減額</label>
              <div className={cn(
                "px-3 py-2 rounded-lg text-sm font-semibold",
                diff == null ? "text-gray-400" : diff >= 0 ? "text-red-600 bg-red-50" : "text-green-600 bg-green-50"
              )}>
                {diff != null ? (diff >= 0 ? "+" : "") + formatAmount(diff) : "-"}
              </div>
            </div>
          </div>

          {/* Duration impact */}
          <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">変更前工期（日）</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={originalDuration}
                onChange={(e) => setOriginalDuration(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">変更後工期（日）</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={changedDuration}
                onChange={(e) => setChangedDuration(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">工期増減</label>
              <div className={cn(
                "px-3 py-2 rounded-lg text-sm font-semibold",
                durationDiff == null ? "text-gray-400" : durationDiff > 0 ? "text-amber-600 bg-amber-50" : "text-green-600 bg-green-50"
              )}>
                {durationDiff != null ? (durationDiff >= 0 ? "+" : "") + durationDiff + " 日" : "-"}
              </div>
            </div>
          </div>

          {/* Line items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">数量変更明細</label>
            <LineItemsTable items={items} onChange={setItems} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "更新" : "登録"}
            </button>
          </div>
          {mutation.error && (
            <p className="text-red-600 text-sm">{String((mutation.error as Error).message)}</p>
          )}
        </form>
      </div>
    </div>
  );
}

// ---------- Main Page ----------

export default function DesignChangesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DesignChange | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: changes = [], isLoading } = useQuery({
    queryKey: ["design-changes", projectId],
    queryFn: () =>
      apiFetch<DesignChange[]>(`/api/projects/${projectId}/design-changes`, { token }),
    enabled: !!token && !!projectId,
  });

  const { data: summary } = useQuery({
    queryKey: ["design-changes-summary", projectId],
    queryFn: () =>
      apiFetch<Summary>(`/api/projects/${projectId}/design-changes/summary`, { token }),
    enabled: !!token && !!projectId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/projects/${projectId}/design-changes/${id}`, {
        method: "DELETE", token,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["design-changes", projectId] });
      qc.invalidateQueries({ queryKey: ["design-changes-summary", projectId] });
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiFetch(`/api/projects/${projectId}/design-changes/${id}/${action}`, {
        method: "POST", token,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["design-changes", projectId] });
      qc.invalidateQueries({ queryKey: ["design-changes-summary", projectId] });
    },
  });

  const handleEdit = (change: DesignChange) => {
    setEditing(change);
    setShowModal(true);
  };

  const handleNew = () => {
    setEditing(undefined);
    setShowModal(true);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <FileEdit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">設計変更管理</h1>
            <p className="text-sm text-gray-500">設計変更の登録・承認・追跡</p>
          </div>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          新規登録
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">変更件数</p>
            <p className="text-2xl font-bold text-gray-900">{summary.total_changes}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">承認済</p>
            <p className="text-2xl font-bold text-green-600">{summary.approved_count}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">金額増減（承認済合計）</p>
            <p className={cn(
              "text-xl font-bold",
              summary.net_budget_impact >= 0 ? "text-red-600" : "text-green-600"
            )}>
              {summary.net_budget_impact >= 0 ? "+" : ""}
              {formatAmount(summary.net_budget_impact)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">工期増減（承認済合計）</p>
            <p className={cn(
              "text-xl font-bold",
              summary.net_duration_impact_days > 0 ? "text-amber-600" : "text-green-600"
            )}>
              {summary.net_duration_impact_days >= 0 ? "+" : ""}
              {summary.net_duration_impact_days} 日
            </p>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {changes.map((change) => (
            <div
              key={change.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="p-4 flex items-start gap-4">
                {/* Change number */}
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-amber-700">
                    第{change.change_number}号
                  </span>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{change.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[change.status] || "bg-gray-100 text-gray-700"}`}>
                      {STATUS_LABEL[change.status] || change.status}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                      {change.change_type}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-4 text-sm text-gray-500 flex-wrap">
                    {change.difference_amount != null && (
                      <span className={change.difference_amount >= 0 ? "text-red-600" : "text-green-600"}>
                        金額: {change.difference_amount >= 0 ? "+" : ""}
                        {formatAmount(change.difference_amount)}
                      </span>
                    )}
                    {change.original_duration != null && change.changed_duration != null && (
                      <span className={change.changed_duration > change.original_duration ? "text-amber-600" : "text-green-600"}>
                        工期: {change.changed_duration - change.original_duration >= 0 ? "+" : ""}
                        {change.changed_duration - change.original_duration}日
                      </span>
                    )}
                    {change.requested_by && <span>申請: {change.requested_by}</span>}
                    {change.approved_by && <span>承認: {change.approved_by}</span>}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {change.status === "draft" && (
                    <button
                      onClick={() => actionMutation.mutate({ id: change.id, action: "submit" })}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      <Send className="w-3 h-3" />提出
                    </button>
                  )}
                  {(change.status === "submitted" || change.status === "negotiating") && (
                    <>
                      <button
                        onClick={() => actionMutation.mutate({ id: change.id, action: "approve" })}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                      >
                        <CheckCircle2 className="w-3 h-3" />承認
                      </button>
                      <button
                        onClick={() => actionMutation.mutate({ id: change.id, action: "reject" })}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        <XCircle className="w-3 h-3" />却下
                      </button>
                    </>
                  )}
                  {change.status === "draft" && (
                    <button
                      onClick={() => handleEdit(change)}
                      className="text-xs px-2 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                    >
                      編集
                    </button>
                  )}
                  {change.status === "draft" && (
                    <button
                      onClick={() => {
                        if (confirm("削除しますか？")) deleteMutation.mutate(change.id);
                      }}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === change.id ? null : change.id)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    {expandedId === change.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === change.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                  {change.reason && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">変更理由</p>
                      <p className="text-sm text-gray-700">{change.reason}</p>
                    </div>
                  )}
                  {change.description && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">変更内容</p>
                      <p className="text-sm text-gray-700">{change.description}</p>
                    </div>
                  )}
                  {change.items_json && change.items_json.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">数量変更明細</p>
                      <div className="overflow-x-auto">
                        <table className="text-xs border border-gray-200 rounded-lg w-full overflow-hidden">
                          <thead className="bg-white">
                            <tr>
                              {["工種・種別", "単位", "変更前数量", "変更後数量", "単価", "変更前金額", "変更後金額"].map((h) => (
                                <th key={h} className="px-2 py-1.5 text-left text-gray-500 border-b border-gray-200">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {change.items_json.map((item, idx) => (
                              <tr key={idx} className="bg-white">
                                <td className="px-2 py-1.5">{item.item_name}</td>
                                <td className="px-2 py-1.5">{item.unit}</td>
                                <td className="px-2 py-1.5 text-right">{item.original_qty}</td>
                                <td className="px-2 py-1.5 text-right">{item.changed_qty}</td>
                                <td className="px-2 py-1.5 text-right">{formatAmount(item.unit_price)}</td>
                                <td className="px-2 py-1.5 text-right">{formatAmount(item.original_amount)}</td>
                                <td className="px-2 py-1.5 text-right">{formatAmount(item.changed_amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {changes.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FileEdit className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>設計変更はまだ登録されていません</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <DesignChangeModal
          projectId={projectId}
          token={token!}
          onClose={() => {
            setShowModal(false);
            setEditing(undefined);
          }}
          editing={editing}
        />
      )}
    </div>
  );
}
