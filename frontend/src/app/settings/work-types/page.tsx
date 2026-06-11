"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Save,
  AlertCircle,
  Layers,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import { API_BASE } from "@/lib/api-base";

// ---------------- Types ----------------

interface WorkTypeMaster {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  category: string | null;
  default_unit: string | null;
  default_sale_unit_price: number;
  default_cost_unit_price: number;
  is_legal_welfare_cost: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

interface WorkTypeMastersResponse {
  items: WorkTypeMaster[];
  count: number;
}

interface WorkTypeFormState {
  code: string;
  name: string;
  category: string;
  default_unit: string;
  default_sale_unit_price: string;
  default_cost_unit_price: string;
  is_legal_welfare_cost: boolean;
  sort_order: string;
}

const EMPTY_FORM: WorkTypeFormState = {
  code: "",
  name: "",
  category: "",
  default_unit: "",
  default_sale_unit_price: "0",
  default_cost_unit_price: "0",
  is_legal_welfare_cost: false,
  sort_order: "0",
};

// ---------------- Helpers ----------------

function toInt(s: string): number {
  const n = parseInt(s.replace(/,/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatYen(n: number | null | undefined): string {
  if (n == null) return "-";
  return `¥${n.toLocaleString()}`;
}

function formStateFromMaster(wt: WorkTypeMaster): WorkTypeFormState {
  return {
    code: wt.code,
    name: wt.name,
    category: wt.category ?? "",
    default_unit: wt.default_unit ?? "",
    default_sale_unit_price: String(wt.default_sale_unit_price ?? 0),
    default_cost_unit_price: String(wt.default_cost_unit_price ?? 0),
    is_legal_welfare_cost: !!wt.is_legal_welfare_cost,
    sort_order: String(wt.sort_order ?? 0),
  };
}

function formStateToPayload(f: WorkTypeFormState) {
  return {
    code: f.code.trim(),
    name: f.name.trim(),
    category: f.category.trim() || null,
    default_unit: f.default_unit.trim() || null,
    default_sale_unit_price: toInt(f.default_sale_unit_price),
    default_cost_unit_price: toInt(f.default_cost_unit_price),
    is_legal_welfare_cost: f.is_legal_welfare_cost,
    sort_order: toInt(f.sort_order),
  };
}

// ---------------- Page ----------------

export default function WorkTypeMastersSettingsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<WorkTypeFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery<WorkTypeMastersResponse>({
    queryKey: ["work-type-masters"],
    queryFn: () =>
      apiFetch<WorkTypeMastersResponse>("/api/work-type-masters?limit=1000", {
        token,
      }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof formStateToPayload>) =>
      apiFetch<WorkTypeMaster>("/api/work-type-masters", {
        method: "POST",
        body: JSON.stringify(payload),
        token,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-type-masters"] });
      setCreating(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (e: unknown) => {
      setFormError(e instanceof Error ? e.message : "保存に失敗しました");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ReturnType<typeof formStateToPayload>;
    }) =>
      apiFetch<WorkTypeMaster>(`/api/work-type-masters/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        token,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-type-masters"] });
      setEditingId(null);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (e: unknown) => {
      setFormError(e instanceof Error ? e.message : "保存に失敗しました");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ status: string }>(`/api/work-type-masters/${id}`, {
        method: "DELETE",
        token,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-type-masters"] });
    },
  });

  // ----- derived: filter + group -----

  const allItems = listQuery.data?.items ?? [];

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (i) =>
        i.code.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        (i.category ?? "").toLowerCase().includes(q)
    );
  }, [allItems, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, WorkTypeMaster[]>();
    for (const w of filteredItems) {
      const key = (w.category ?? "").trim() || "未分類";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    }
    // 並び順: 既知カテゴリを先頭に、未分類は末尾
    const KNOWN = [
      "共通仮設",
      "直接仮設",
      "躯体",
      "塗装",
      "防水",
      "内装",
      "外装",
      "設備",
      "電気",
      "解体",
    ];
    const keys = Array.from(map.keys());
    keys.sort((a, b) => {
      if (a === "未分類") return 1;
      if (b === "未分類") return -1;
      const ai = KNOWN.indexOf(a);
      const bi = KNOWN.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b, "ja");
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return keys.map((k) => ({ category: k, items: map.get(k)! }));
  }, [filteredItems]);

  // ----- handlers -----

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreating(true);
  };

  const startEdit = (wt: WorkTypeMaster) => {
    setCreating(false);
    setEditingId(wt.id);
    setForm(formStateFromMaster(wt));
    setFormError(null);
  };

  const cancelForm = () => {
    setCreating(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const submitForm = () => {
    setFormError(null);
    if (!form.code.trim()) {
      setFormError("コードを入力してください");
      return;
    }
    if (!form.name.trim()) {
      setFormError("名称を入力してください");
      return;
    }
    const payload = formStateToPayload(form);
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (wt: WorkTypeMaster) => {
    if (
      window.confirm(
        `工事種別「${wt.code} ${wt.name}」を削除します。よろしいですか？`
      )
    ) {
      deleteMutation.mutate(wt.id);
    }
  };

  // ----- render -----

  const isFormBusy = createMutation.isPending || updateMutation.isPending;
  const showForm = creating || editingId !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb / back link */}
        <div className="mb-4">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            aria-label="設定へ戻る"
          >
            <ArrowLeft className="w-4 h-4" />
            設定へ戻る
          </Link>
        </div>

        {/* Header */}
        <header className="bg-white border-b border-gray-200 rounded-t-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-gray-700" />
              工事種別マスタ管理
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              見積項目作成時にコードから名称・単位・単価を自動入力するためのマスタを管理します
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              aria-label="新規工事種別を追加"
            >
              <Plus className="w-4 h-4" />
              新規追加
            </button>
          </div>
        </header>

        {/* Toolbar: search */}
        <div className="bg-white border-x border-b border-gray-200 px-5 py-3">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="コード / 名称 / 区分で検索"
              aria-label="工事種別を検索"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-500 bg-white text-gray-900 placeholder-gray-400"
            />
          </div>
          {listQuery.data && (
            <p className="mt-2 text-xs text-gray-500">
              全 {listQuery.data.count} 件
              {search.trim() && `（絞り込み: ${filteredItems.length} 件）`}
            </p>
          )}
        </div>

        {/* Edit / Create form */}
        {showForm && (
          <WorkTypeFormCard
            mode={editingId ? "edit" : "create"}
            form={form}
            setForm={setForm}
            onCancel={cancelForm}
            onSubmit={submitForm}
            busy={isFormBusy}
            error={formError}
          />
        )}

        {/* Main content */}
        <div className="bg-white border-x border-b border-gray-200 rounded-b-xl">
          {listQuery.isLoading && (
            <div className="px-5 py-10 text-center text-sm text-gray-500">
              読み込み中...
            </div>
          )}

          {listQuery.isError && (
            <div
              role="alert"
              className="px-5 py-10 text-center"
            >
              <p className="text-sm text-red-600 mb-3">
                データの取得に失敗しました
              </p>
              <button
                type="button"
                onClick={() => listQuery.refetch()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                再試行
              </button>
            </div>
          )}

          {listQuery.isSuccess && filteredItems.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-600 mb-3">
                {search.trim()
                  ? "条件に一致する工事種別がありません"
                  : "まだ工事種別マスタがありません"}
              </p>
              {!search.trim() && (
                <button
                  type="button"
                  onClick={startCreate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4" />
                  新規追加
                </button>
              )}
            </div>
          )}

          {listQuery.isSuccess && filteredItems.length > 0 && (
            <div className="divide-y divide-gray-200">
              {grouped.map((g) => (
                <section key={g.category} aria-label={`区分: ${g.category}`}>
                  <div className="px-5 py-2.5 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-800">
                      {g.category}
                    </h2>
                    <span className="text-xs text-gray-500">
                      {g.items.length} 件
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" role="table">
                      <thead className="bg-white border-b border-gray-200">
                        <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                          <th className="px-4 py-2 font-medium">コード</th>
                          <th className="px-4 py-2 font-medium">名称</th>
                          <th className="px-4 py-2 font-medium">単位</th>
                          <th className="px-4 py-2 font-medium text-right">
                            売単価
                          </th>
                          <th className="px-4 py-2 font-medium text-right">
                            原価単価
                          </th>
                          <th className="px-4 py-2 font-medium text-right">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.items.map((w) => {
                          const isDeleting =
                            deleteMutation.isPending &&
                            deleteMutation.variables === w.id;
                          return (
                            <tr
                              key={w.id}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="px-4 py-2.5 font-mono text-gray-900">
                                {w.code}
                              </td>
                              <td className="px-4 py-2.5 text-gray-900">
                                <div className="flex items-center gap-2">
                                  <span>{w.name}</span>
                                  {w.is_legal_welfare_cost && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-amber-50 text-amber-700 border border-amber-200">
                                      法定福利
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-gray-700">
                                {w.default_unit || "-"}
                              </td>
                              <td className="px-4 py-2.5 text-right text-gray-900 tabular-nums">
                                {formatYen(w.default_sale_unit_price)}
                              </td>
                              <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">
                                {formatYen(w.default_cost_unit_price)}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(w)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded"
                                    aria-label={`${w.name} を編集`}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    編集
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(w)}
                                    disabled={isDeleting}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                    aria-label={`${w.name} を削除`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    削除
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Debug footer */}
        <p className="mt-3 text-[10px] text-gray-400">
          API: {API_BASE}/api/work-type-masters
        </p>
      </div>
    </div>
  );
}

// ---------------- Form Card ----------------

function WorkTypeFormCard({
  mode,
  form,
  setForm,
  onCancel,
  onSubmit,
  busy,
  error,
}: {
  mode: "create" | "edit";
  form: WorkTypeFormState;
  setForm: (f: WorkTypeFormState) => void;
  onCancel: () => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
}) {
  const set = <K extends keyof WorkTypeFormState>(
    k: K,
    v: WorkTypeFormState[K]
  ) => setForm({ ...form, [k]: v });

  return (
    <div className="bg-white border-x border-b border-gray-200 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">
          {mode === "create" ? "新規工事種別を追加" : "工事種別を編集"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-900"
          aria-label="フォームを閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <Field label="コード *" htmlFor="wt-code">
          <input
            id="wt-code"
            type="text"
            value={form.code}
            onChange={(e) => set("code", e.target.value)}
            required
            maxLength={100}
            className={inputCls}
            placeholder="例: K001"
          />
        </Field>

        <Field label="名称 *" htmlFor="wt-name" className="sm:col-span-2">
          <input
            id="wt-name"
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            maxLength={255}
            className={inputCls}
            placeholder="例: コンクリート打設"
          />
        </Field>

        <Field label="区分（カテゴリ）" htmlFor="wt-category">
          <input
            id="wt-category"
            type="text"
            list="wt-category-list"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            maxLength={100}
            className={inputCls}
            placeholder="例: 躯体"
          />
          <datalist id="wt-category-list">
            <option value="共通仮設" />
            <option value="直接仮設" />
            <option value="躯体" />
            <option value="塗装" />
            <option value="防水" />
            <option value="内装" />
            <option value="外装" />
            <option value="設備" />
            <option value="電気" />
            <option value="解体" />
          </datalist>
        </Field>

        <Field label="標準単位" htmlFor="wt-unit">
          <input
            id="wt-unit"
            type="text"
            value={form.default_unit}
            onChange={(e) => set("default_unit", e.target.value)}
            maxLength={50}
            className={inputCls}
            placeholder="例: m2, m3, 式"
          />
        </Field>

        <Field label="売単価 (円)" htmlFor="wt-sale">
          <input
            id="wt-sale"
            type="number"
            min={0}
            inputMode="numeric"
            value={form.default_sale_unit_price}
            onChange={(e) => set("default_sale_unit_price", e.target.value)}
            className={inputCls + " text-right tabular-nums"}
          />
        </Field>

        <Field label="原価単価 (円)" htmlFor="wt-cost">
          <input
            id="wt-cost"
            type="number"
            min={0}
            inputMode="numeric"
            value={form.default_cost_unit_price}
            onChange={(e) => set("default_cost_unit_price", e.target.value)}
            className={inputCls + " text-right tabular-nums"}
          />
        </Field>

        <Field label="並び順" htmlFor="wt-sort">
          <input
            id="wt-sort"
            type="number"
            min={0}
            inputMode="numeric"
            value={form.sort_order}
            onChange={(e) => set("sort_order", e.target.value)}
            className={inputCls + " text-right tabular-nums"}
          />
        </Field>

        <Field label="法定福利費">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 mt-2">
            <input
              type="checkbox"
              checked={form.is_legal_welfare_cost}
              onChange={(e) =>
                set("is_legal_welfare_cost", e.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            この項目は法定福利費として扱う
          </label>
        </Field>

        <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3.5 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {busy ? "保存中..." : mode === "create" ? "追加" : "更新"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-500 bg-white text-gray-900 placeholder-gray-400";

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
