"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  Layers,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";

// ---------- Types ----------

interface FloorAreaItem {
  floor: string;
  area: string; // number-as-string for input flexibility
}

interface OverviewResponse {
  id?: string;
  tenant_id?: string;
  project_id?: string;
  work_name?: string | null;
  work_location?: string | null;
  work_scope?: string | null;
  total_floor_area?: number | null;
  structure?: string | null;
  floors_breakdown?: unknown[] | null;
  separate_works?: unknown[] | null;
  special_notes?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface OverviewForm {
  work_name: string;
  work_location: string;
  work_scope: string;
  total_floor_area: string;
  structure: string;
  floors_breakdown: FloorAreaItem[];
  separate_works: string; // multiline → split per line on save
  special_notes: string;
  remarks: string;
}

type MatrixType = "exterior" | "interior";

interface FinishMatrixEntry {
  id?: string;
  floor: string;
  location: string;
  part: string;
  spec_text: string;
  sort_order?: number;
}

interface FinishMatrixResponse {
  matrix_type: MatrixType;
  entries: FinishMatrixEntry[];
  count: number;
}

// ---------- Helpers ----------

function emptyOverviewForm(): OverviewForm {
  return {
    work_name: "",
    work_location: "",
    work_scope: "",
    total_floor_area: "",
    structure: "",
    floors_breakdown: [],
    separate_works: "",
    special_notes: "",
    remarks: "",
  };
}

function emptyEntry(): FinishMatrixEntry {
  return { floor: "", location: "", part: "", spec_text: "" };
}

function toForm(data: OverviewResponse | undefined | null): OverviewForm {
  if (!data) return emptyOverviewForm();
  const floors: FloorAreaItem[] = Array.isArray(data.floors_breakdown)
    ? (data.floors_breakdown as unknown[])
        .map((row) => {
          if (row && typeof row === "object") {
            const r = row as Record<string, unknown>;
            return {
              floor: String(r.floor ?? ""),
              area: r.area == null ? "" : String(r.area),
            };
          }
          return { floor: "", area: "" };
        })
        .filter((r) => r.floor || r.area)
    : [];
  const separate: string = Array.isArray(data.separate_works)
    ? (data.separate_works as unknown[])
        .map((row) => {
          if (typeof row === "string") return row;
          if (row && typeof row === "object") {
            const r = row as Record<string, unknown>;
            return String(r.text ?? r.name ?? JSON.stringify(r));
          }
          return String(row ?? "");
        })
        .filter((s) => s.length > 0)
        .join("\n")
    : "";
  return {
    work_name: data.work_name ?? "",
    work_location: data.work_location ?? "",
    work_scope: data.work_scope ?? "",
    total_floor_area:
      data.total_floor_area == null ? "" : String(data.total_floor_area),
    structure: data.structure ?? "",
    floors_breakdown: floors,
    separate_works: separate,
    special_notes: data.special_notes ?? "",
    remarks: data.remarks ?? "",
  };
}

// ---------- Page ----------

export default function ProjectOverviewPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // -------- Overview --------
  const overviewQuery = useQuery<OverviewResponse>({
    queryKey: ["project-overview", projectId],
    queryFn: () =>
      apiFetch<OverviewResponse>(`/api/projects/${projectId}/overview`, {
        token,
      }),
    enabled: !!projectId && !!token,
  });

  const [form, setForm] = useState<OverviewForm>(emptyOverviewForm());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (overviewQuery.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(toForm(overviewQuery.data));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDirty(false);
    }
  }, [overviewQuery.data]);

  const overviewMutation = useMutation({
    mutationFn: async (f: OverviewForm) => {
      const body: Record<string, unknown> = {
        work_name: f.work_name || null,
        work_location: f.work_location || null,
        work_scope: f.work_scope || null,
        total_floor_area:
          f.total_floor_area === "" ? null : Number(f.total_floor_area),
        structure: f.structure || null,
        floors_breakdown: f.floors_breakdown
          .filter((r) => r.floor || r.area)
          .map((r) => ({
            floor: r.floor,
            area: r.area === "" ? null : Number(r.area),
          })),
        separate_works: f.separate_works
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .map((s) => ({ text: s })),
        special_notes: f.special_notes || null,
        remarks: f.remarks || null,
      };
      return apiFetch<OverviewResponse>(
        `/api/projects/${projectId}/overview`,
        {
          method: "PUT",
          token,
          body: JSON.stringify(body),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-overview", projectId],
      });
      setDirty(false);
    },
  });

  function updateForm<K extends keyof OverviewForm>(
    key: K,
    value: OverviewForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function addFloor() {
    updateForm("floors_breakdown", [
      ...form.floors_breakdown,
      { floor: "", area: "" },
    ]);
  }

  function updateFloor(idx: number, patch: Partial<FloorAreaItem>) {
    const next = form.floors_breakdown.map((row, i) =>
      i === idx ? { ...row, ...patch } : row
    );
    updateForm("floors_breakdown", next);
  }

  function removeFloor(idx: number) {
    updateForm(
      "floors_breakdown",
      form.floors_breakdown.filter((_, i) => i !== idx)
    );
  }

  // -------- Finish Matrix --------
  const [matrixType, setMatrixType] = useState<MatrixType>("exterior");

  const matrixQuery = useQuery<FinishMatrixResponse>({
    queryKey: ["finish-matrix", projectId, matrixType],
    queryFn: () =>
      apiFetch<FinishMatrixResponse>(
        `/api/projects/${projectId}/finish-matrix?type=${matrixType}`,
        { token }
      ),
    enabled: !!projectId && !!token,
  });

  const [entries, setEntries] = useState<FinishMatrixEntry[]>([]);
  const [matrixDirty, setMatrixDirty] = useState(false);

  useEffect(() => {
    if (matrixQuery.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntries(
        matrixQuery.data.entries.map((e) => ({
          id: e.id,
          floor: e.floor ?? "",
          location: e.location ?? "",
          part: e.part ?? "",
          spec_text: e.spec_text ?? "",
          sort_order: e.sort_order ?? 0,
        }))
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMatrixDirty(false);
    }
  }, [matrixQuery.data]);

  const matrixMutation = useMutation({
    mutationFn: async (payload: {
      matrix_type: MatrixType;
      entries: FinishMatrixEntry[];
    }) => {
      const body = {
        matrix_type: payload.matrix_type,
        entries: payload.entries.map((e, i) => ({
          floor: e.floor || null,
          location: e.location || null,
          part: e.part || null,
          spec_text: e.spec_text || null,
          sort_order: i,
        })),
      };
      return apiFetch<FinishMatrixResponse>(
        `/api/projects/${projectId}/finish-matrix`,
        {
          method: "PUT",
          token,
          body: JSON.stringify(body),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["finish-matrix", projectId, matrixType],
      });
      setMatrixDirty(false);
    },
  });

  function addEntry() {
    setEntries((prev) => [...prev, emptyEntry()]);
    setMatrixDirty(true);
  }

  function updateEntry(idx: number, patch: Partial<FinishMatrixEntry>) {
    setEntries((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    );
    setMatrixDirty(true);
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
    setMatrixDirty(true);
  }

  const inputCls =
    "w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  const hasOverview = useMemo(
    () => !!overviewQuery.data && Object.keys(overviewQuery.data).length > 0,
    [overviewQuery.data]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-6 h-6" aria-hidden="true" />
            <div>
              <h1 className="text-lg font-semibold">工事概要書・仕上マトリクス</h1>
              <p className="text-xs text-gray-300">G9 / 案件基礎情報</p>
            </div>
          </div>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1 text-sm text-gray-300 hover:text-white"
            aria-label="案件詳細へ戻る"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            案件詳細へ戻る
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ===================== 上半分: 工事概要書 ===================== */}
        <section
          className="bg-white border border-gray-200 rounded-lg shadow-sm"
          aria-labelledby="overview-heading"
        >
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-700" aria-hidden="true" />
              <h2 id="overview-heading" className="text-base font-semibold text-gray-900">
                工事概要書
              </h2>
              {!hasOverview && !overviewQuery.isLoading && (
                <span className="ml-2 text-xs text-gray-500">(未作成)</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => overviewMutation.mutate(form)}
              disabled={overviewMutation.isPending || !dirty}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              aria-label="工事概要書を保存"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              {overviewMutation.isPending ? "保存中..." : "保存"}
            </button>
          </div>

          {overviewQuery.isLoading ? (
            <div className="p-6 text-sm text-gray-500">読み込み中...</div>
          ) : overviewQuery.isError ? (
            <div className="p-6 flex items-center justify-between bg-red-50 border-l-4 border-red-600">
              <p className="text-sm text-red-700">データの取得に失敗しました</p>
              <button
                type="button"
                onClick={() => overviewQuery.refetch()}
                className="px-3 py-1 text-sm text-red-700 border border-red-600 rounded hover:bg-red-100"
              >
                再試行
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="work_name" className={labelCls}>
                    工事名称
                  </label>
                  <input
                    id="work_name"
                    type="text"
                    value={form.work_name}
                    onChange={(e) => updateForm("work_name", e.target.value)}
                    className={inputCls}
                    placeholder="例: ○○庁舎建替工事"
                  />
                </div>
                <div>
                  <label htmlFor="work_location" className={labelCls}>
                    工事場所
                  </label>
                  <input
                    id="work_location"
                    type="text"
                    value={form.work_location}
                    onChange={(e) => updateForm("work_location", e.target.value)}
                    className={inputCls}
                    placeholder="例: 東京都千代田区..."
                  />
                </div>
              </div>

              <div>
                <label htmlFor="work_scope" className={labelCls}>
                  工事範囲
                </label>
                <textarea
                  id="work_scope"
                  value={form.work_scope}
                  onChange={(e) => updateForm("work_scope", e.target.value)}
                  className={`${inputCls} resize-y min-h-[80px]`}
                  placeholder="本工事に含まれる範囲を記入"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="total_floor_area" className={labelCls}>
                    建築床面積 (m²)
                  </label>
                  <input
                    id="total_floor_area"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={form.total_floor_area}
                    onChange={(e) =>
                      updateForm("total_floor_area", e.target.value)
                    }
                    className={inputCls}
                    placeholder="例: 1234.56"
                  />
                </div>
                <div>
                  <label htmlFor="structure" className={labelCls}>
                    構造
                  </label>
                  <input
                    id="structure"
                    type="text"
                    value={form.structure}
                    onChange={(e) => updateForm("structure", e.target.value)}
                    className={inputCls}
                    placeholder="例: 鉄筋コンクリート造 地上5階"
                  />
                </div>
              </div>

              {/* Floors breakdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls + " mb-0"}>階別床面積</label>
                  <button
                    type="button"
                    onClick={addFloor}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
                    aria-label="階別床面積の行を追加"
                  >
                    <Plus className="w-3 h-3" aria-hidden="true" />
                    行を追加
                  </button>
                </div>
                {form.floors_breakdown.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-md p-4 text-center text-sm text-gray-500">
                    まだ階別床面積がありません
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={addFloor}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700"
                      >
                        <Plus className="w-3 h-3" aria-hidden="true" />
                        新規追加
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="w-full text-sm" role="table">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 w-1/2">
                            階
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 w-1/2">
                            面積 (m²)
                          </th>
                          <th className="px-3 py-2 w-12" aria-label="操作" />
                        </tr>
                      </thead>
                      <tbody>
                        {form.floors_breakdown.map((row, idx) => (
                          <tr key={idx} className="border-t border-gray-200">
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.floor}
                                onChange={(e) =>
                                  updateFloor(idx, { floor: e.target.value })
                                }
                                className={inputCls}
                                placeholder="例: 1F"
                                aria-label={`階 ${idx + 1}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                value={row.area}
                                onChange={(e) =>
                                  updateFloor(idx, { area: e.target.value })
                                }
                                className={inputCls}
                                placeholder="例: 250.50"
                                aria-label={`面積 ${idx + 1}`}
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeFloor(idx)}
                                className="p-1 text-gray-500 hover:text-red-600"
                                aria-label={`${idx + 1} 行目を削除`}
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="separate_works" className={labelCls}>
                  別途工事 (1行 = 1項目)
                </label>
                <textarea
                  id="separate_works"
                  value={form.separate_works}
                  onChange={(e) =>
                    updateForm("separate_works", e.target.value)
                  }
                  className={`${inputCls} resize-y min-h-[80px]`}
                  placeholder={"電気設備工事\n機械設備工事\n外構工事"}
                />
              </div>

              <div>
                <label htmlFor="special_notes" className={labelCls}>
                  特記事項
                </label>
                <textarea
                  id="special_notes"
                  value={form.special_notes}
                  onChange={(e) => updateForm("special_notes", e.target.value)}
                  className={`${inputCls} resize-y min-h-[80px]`}
                />
              </div>

              <div>
                <label htmlFor="remarks" className={labelCls}>
                  備考
                </label>
                <textarea
                  id="remarks"
                  value={form.remarks}
                  onChange={(e) => updateForm("remarks", e.target.value)}
                  className={`${inputCls} resize-y min-h-[60px]`}
                />
              </div>

              {dirty && (
                <p className="text-xs text-amber-600" role="status">
                  未保存の変更があります
                </p>
              )}
              {overviewMutation.isError && (
                <p className="text-xs text-red-600" role="alert">
                  保存に失敗しました: {(overviewMutation.error as Error).message}
                </p>
              )}
            </div>
          )}
        </section>

        {/* ===================== 下半分: 仕上マトリクス ===================== */}
        <section
          className="bg-white border border-gray-200 rounded-lg shadow-sm"
          aria-labelledby="matrix-heading"
        >
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-gray-700" aria-hidden="true" />
              <h2 id="matrix-heading" className="text-base font-semibold text-gray-900">
                仕上マトリクス
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                matrixMutation.mutate({
                  matrix_type: matrixType,
                  entries,
                })
              }
              disabled={matrixMutation.isPending || !matrixDirty}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              aria-label="仕上マトリクスを保存"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              {matrixMutation.isPending ? "保存中..." : "保存"}
            </button>
          </div>

          {/* Tabs */}
          <div
            className="border-b border-gray-200 px-6 pt-3"
            role="tablist"
            aria-label="仕上マトリクスのタイプ"
          >
            <div className="flex gap-1">
              {(
                [
                  { key: "exterior", label: "外部 (Exterior)" },
                  { key: "interior", label: "内部 (Interior)" },
                ] as const
              ).map((t) => {
                const active = matrixType === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMatrixType(t.key)}
                    className={
                      "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " +
                      (active
                        ? "border-gray-900 text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-700")
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {matrixQuery.isLoading ? (
              <p className="text-sm text-gray-500">読み込み中...</p>
            ) : matrixQuery.isError ? (
              <div className="flex items-center justify-between bg-red-50 border-l-4 border-red-600 p-4">
                <p className="text-sm text-red-700">データの取得に失敗しました</p>
                <button
                  type="button"
                  onClick={() => matrixQuery.refetch()}
                  className="px-3 py-1 text-sm text-red-700 border border-red-600 rounded hover:bg-red-100"
                >
                  再試行
                </button>
              </div>
            ) : entries.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-md p-8 text-center">
                <p className="text-sm text-gray-500 mb-3">
                  まだ仕上マトリクスのエントリがありません
                </p>
                <button
                  type="button"
                  onClick={addEntry}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  新規追加
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                  <table className="w-full text-sm" role="table">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 w-32">
                          階 (floor)
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 w-40">
                          場所 (location)
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 w-32">
                          部位 (part)
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">
                          仕様 (spec_text)
                        </th>
                        <th className="px-3 py-2 w-12" aria-label="操作" />
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((row, idx) => (
                        <tr key={idx} className="border-t border-gray-200">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.floor}
                              onChange={(e) =>
                                updateEntry(idx, { floor: e.target.value })
                              }
                              className={inputCls}
                              placeholder="1F"
                              aria-label={`階 ${idx + 1}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.location}
                              onChange={(e) =>
                                updateEntry(idx, { location: e.target.value })
                              }
                              className={inputCls}
                              placeholder="事務室"
                              aria-label={`場所 ${idx + 1}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.part}
                              onChange={(e) =>
                                updateEntry(idx, { part: e.target.value })
                              }
                              className={inputCls}
                              placeholder="床"
                              aria-label={`部位 ${idx + 1}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.spec_text}
                              onChange={(e) =>
                                updateEntry(idx, { spec_text: e.target.value })
                              }
                              className={inputCls}
                              placeholder="タイルカーペット t=6.5mm"
                              aria-label={`仕様 ${idx + 1}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeEntry(idx)}
                              className="p-1 text-gray-500 hover:text-red-600"
                              aria-label={`${idx + 1} 行目を削除`}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={addEntry}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
                    aria-label="エントリ行を追加"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    行を追加
                  </button>
                  <p className="text-xs text-gray-500">
                    保存時は {matrixType === "exterior" ? "外部" : "内部"} のエントリ全てを置換します
                  </p>
                </div>
              </>
            )}

            {matrixDirty && (
              <p className="mt-3 text-xs text-amber-600" role="status">
                未保存の変更があります
              </p>
            )}
            {matrixMutation.isError && (
              <p className="mt-3 text-xs text-red-600" role="alert">
                保存に失敗しました: {(matrixMutation.error as Error).message}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
