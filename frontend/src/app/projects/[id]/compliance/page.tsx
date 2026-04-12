"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ShieldCheck, Plus, AlertTriangle, Clock,
  CheckCircle2, FileText, ChevronDown, ChevronUp, X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ComplianceItem {
  id: string;
  project_id: string;
  item_type: string;
  title: string;
  authority: string;
  deadline: string | null;
  status: string;
  status_label: string;
  reference_number: string | null;
  notes: string | null;
  attachments: unknown[];
  days_until_deadline: number | null;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

interface Template {
  item_type: string;
  title: string;
  authority: string;
  notes: string | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.FC<{ className?: string }> }
> = {
  not_started: {
    label: "未着手",
    color: "text-gray-600",
    bg: "bg-gray-100",
    icon: Clock,
  },
  preparing: {
    label: "準備中",
    color: "text-blue-700",
    bg: "bg-blue-100",
    icon: FileText,
  },
  submitted: {
    label: "提出済",
    color: "text-indigo-700",
    bg: "bg-indigo-100",
    icon: FileText,
  },
  approved: {
    label: "承認済",
    color: "text-green-700",
    bg: "bg-green-100",
    icon: CheckCircle2,
  },
  expired: {
    label: "期限切れ",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: AlertTriangle,
  },
};

const TYPE_LABELS: Record<string, string> = {
  road_occupancy: "道路使用許可",
  road_excavation: "道路占用許可",
  building_permit: "建築確認申請",
  noise_permit: "騒音規制法届出",
  vibration_permit: "振動規制法届出",
  waste_disposal: "廃棄物処理計画",
  scaffolding: "足場設置届",
  crane_setup: "クレーン設置届",
  fire_prevention: "火気使用工事届",
  dust_measures: "大気汚染防止法届出",
  other: "その他",
};

/* ------------------------------------------------------------------ */
/*  Form state default                                                 */
/* ------------------------------------------------------------------ */

interface FormState {
  item_type: string;
  title: string;
  authority: string;
  deadline: string;
  status: string;
  reference_number: string;
  notes: string;
}

interface CompliancePayload {
  item_type: string;
  title: string;
  authority: string;
  deadline: string | null;
  status: string;
  reference_number: string | null;
  notes: string | null;
}

const emptyForm = (): FormState => ({
  item_type: "other",
  title: "",
  authority: "",
  deadline: "",
  status: "not_started",
  reference_number: "",
  notes: "",
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(s: string | null | undefined): string {
  if (!s) return "-";
  const d = new Date(s + "T00:00:00");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function DeadlineBadge({ item }: { item: ComplianceItem }) {
  if (!item.deadline) return <span className="text-gray-400 text-xs">期限なし</span>;

  if (item.status === "approved") {
    return <span className="text-green-600 text-xs font-medium">{formatDate(item.deadline)}</span>;
  }

  const days = item.days_until_deadline ?? 0;

  if (item.is_overdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        {formatDate(item.deadline)} ({Math.abs(days)}日超過)
      </span>
    );
  }

  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" />
        {formatDate(item.deadline)} (残{days}日)
      </span>
    );
  }

  return (
    <span className="text-xs text-gray-600">
      {formatDate(item.deadline)}
      <span className="text-gray-400 ml-1">(残{days}日)</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function CompliancePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ComplianceItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [showTemplates, setShowTemplates] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  /* ---- Queries ---- */
  const { data: items = [], isLoading } = useQuery<ComplianceItem[]>({
    queryKey: ["compliance", id],
    queryFn: () => apiFetch(`/api/projects/${id}/compliance`, { token: token! }),
    enabled: !!token,
  });

  const { data: overdueItems = [] } = useQuery<ComplianceItem[]>({
    queryKey: ["compliance-overdue", id],
    queryFn: () => apiFetch(`/api/projects/${id}/compliance/overdue`, { token: token! }),
    enabled: !!token,
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["compliance-templates", id],
    queryFn: () => apiFetch(`/api/projects/${id}/compliance/templates`, { token: token! }),
    enabled: !!token,
  });

  /* ---- Mutations ---- */
  const createMutation = useMutation({
    mutationFn: (data: CompliancePayload) =>
      apiFetch(`/api/projects/${id}/compliance`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance", id] });
      queryClient.invalidateQueries({ queryKey: ["compliance-overdue", id] });
      setShowForm(false);
      setForm(emptyForm());
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: CompliancePayload }) =>
      apiFetch(`/api/projects/${id}/compliance/${itemId}`, {
        token: token!,
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance", id] });
      queryClient.invalidateQueries({ queryKey: ["compliance-overdue", id] });
      setEditItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiFetch(`/api/projects/${id}/compliance/${itemId}`, {
        token: token!,
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance", id] });
      queryClient.invalidateQueries({ queryKey: ["compliance-overdue", id] });
    },
  });

  /* ---- Handlers ---- */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      deadline: form.deadline || null,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
    };
    if (editItem) {
      updateMutation.mutate({ itemId: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function startEdit(item: ComplianceItem) {
    setEditItem(item);
    setForm({
      item_type: item.item_type,
      title: item.title,
      authority: item.authority,
      deadline: item.deadline ?? "",
      status: item.status,
      reference_number: item.reference_number ?? "",
      notes: item.notes ?? "",
    });
    setShowForm(true);
  }

  function applyTemplate(tpl: Template) {
    setForm((prev) => ({
      ...prev,
      item_type: tpl.item_type,
      title: tpl.title,
      authority: tpl.authority,
      notes: tpl.notes ?? "",
    }));
    setShowTemplates(false);
  }

  /* ---- Filtered items ---- */
  const filteredItems =
    filterStatus === "all"
      ? items
      : items.filter((it) => it.status === filterStatus);

  /* ---- Stats ---- */
  const statsByStatus = {
    total: items.length,
    approved: items.filter((i) => i.status === "approved").length,
    overdue: overdueItems.length,
    upcoming: items.filter(
      (i) => i.days_until_deadline !== null && i.days_until_deadline >= 0 && i.days_until_deadline <= 14 && i.status !== "approved"
    ).length,
  };

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">読込中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ---- Header ---- */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/projects/${id}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-green-600" />
          許認可・届出管理
        </h1>
        <button
          onClick={() => {
            setEditItem(null);
            setForm(emptyForm());
            setShowForm(!showForm);
          }}
          className="ml-auto flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新規追加
        </button>
      </div>

      {/* ---- Overdue banner ---- */}
      {overdueItems.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">
              期限超過: {overdueItems.length}件のアイテムが期限を過ぎています
            </p>
            <div className="mt-1 space-y-0.5">
              {overdueItems.slice(0, 3).map((it) => (
                <p key={it.id} className="text-sm text-red-700">
                  {it.title}（{it.authority}）- {formatDate(it.deadline)}
                </p>
              ))}
              {overdueItems.length > 3 && (
                <p className="text-sm text-red-500">他 {overdueItems.length - 3} 件...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Stats row ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "総件数", value: statsByStatus.total, color: "text-gray-700", bg: "bg-gray-50" },
          { label: "承認済", value: statsByStatus.approved, color: "text-green-700", bg: "bg-green-50" },
          { label: "期限超過", value: statsByStatus.overdue, color: "text-red-700", bg: "bg-red-50" },
          { label: "期限14日以内", value: statsByStatus.upcoming, color: "text-amber-700", bg: "bg-amber-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ---- Create / Edit Form ---- */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800">
              {editItem ? "許認可・届出を編集" : "新規許認可・届出"}
            </h2>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditItem(null); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Template picker (create mode only) */}
          {!editItem && (
            <div>
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                テンプレートから選択
                {showTemplates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showTemplates && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.item_type}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="text-left text-sm border rounded-lg px-3 py-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <p className="font-medium text-gray-800">{tpl.title}</p>
                      <p className="text-xs text-gray-500 truncate">{tpl.authority}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
              <select
                value={form.item_type}
                onChange={(e) => setForm({ ...form, item_type: e.target.value })}
                className="border rounded-lg px-3 py-2 w-full text-sm"
              >
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="border rounded-lg px-3 py-2 w-full text-sm"
              >
                {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                  <option key={val} value={val}>{cfg.label}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                件名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="border rounded-lg px-3 py-2 w-full text-sm"
                placeholder="例: ○○工事に伴う道路使用許可"
              />
            </div>

            {/* Authority */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                提出先・主管機関 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.authority}
                onChange={(e) => setForm({ ...form, authority: e.target.value })}
                className="border rounded-lg px-3 py-2 w-full text-sm"
                placeholder="例: ○○市建設局 道路課"
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期限日</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="border rounded-lg px-3 py-2 w-full text-sm"
              />
            </div>

            {/* Reference number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">許可番号 / 受付番号</label>
              <input
                type="text"
                value={form.reference_number}
                onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                className="border rounded-lg px-3 py-2 w-full text-sm"
                placeholder="承認後に記入"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="border rounded-lg px-3 py-2 w-full text-sm resize-none"
                rows={3}
                placeholder="申請に必要な書類や注意事項など"
              />
            </div>
          </div>

          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-sm text-red-600">
              {((createMutation.error || updateMutation.error) as Error)?.message}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditItem(null); }}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? "保存中..."
                : editItem
                ? "更新"
                : "追加"}
            </button>
          </div>
        </form>
      )}

      {/* ---- Filter tabs ---- */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterStatus === "all"
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          すべて ({items.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([val, cfg]) => {
          const count = items.filter((i) => i.status === val).length;
          if (count === 0) return null;
          return (
            <button
              key={val}
              onClick={() => setFilterStatus(val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === val
                  ? `${cfg.bg} ${cfg.color} ring-1 ring-current`
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ---- Items list ---- */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {filterStatus === "all" ? "許認可・届出がありません" : `${STATUS_CONFIG[filterStatus]?.label}のアイテムがありません`}
          </h3>
          <p className="text-sm text-gray-400">
            「新規追加」ボタンから許認可・届出を登録してください
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.not_started;
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-xl p-4 shadow-sm transition-all hover:shadow-md ${
                  item.is_overdue ? "border-red-300 bg-red-50/30" : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${statusCfg.bg}`}>
                    <StatusIcon className={`w-5 h-5 ${statusCfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${item.is_overdue ? "text-red-800" : "text-gray-800"}`}>
                        {item.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {TYPE_LABELS[item.item_type] ?? item.item_type}
                      </span>
                      {item.is_overdue && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          超過
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 mb-2">
                      提出先: {item.authority}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <DeadlineBadge item={item} />
                      </div>
                      {item.reference_number && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="font-mono text-xs">{item.reference_number}</span>
                        </div>
                      )}
                    </div>

                    {item.notes && (
                      <p className="mt-2 text-xs text-gray-500 line-clamp-2">{item.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(item)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`「${item.title}」を削除しますか？`)) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      className="text-sm text-red-500 hover:underline"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
