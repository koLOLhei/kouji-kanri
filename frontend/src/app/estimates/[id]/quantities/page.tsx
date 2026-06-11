"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  X,
  Ruler,
  Layers,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";

type Opening = {
  name: string;
  width: number;
  height: number;
  count: number;
};

interface Quantity {
  id: string;
  estimate_id: string;
  face: string; // 北 / 南 / 東 / 西
  floor: string; // 1F / 2F / 3F ...
  width: number;
  height: number;
  openings: Opening[];
  net_area: number;
  tile_count: number;
  sealant_length: number;
  created_at?: string;
  updated_at?: string;
}

const FACES = ["北", "南", "東", "西"] as const;
const DEFAULT_FLOORS = ["1F", "2F", "3F"];

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("ja-JP", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function EstimateQuantitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: estimateId } = use(params);
  const { token } = useAuth();
  const qc = useQueryClient();

  const [face, setFace] = useState<string>(FACES[0]);
  const [floor, setFloor] = useState<string>(DEFAULT_FLOORS[0]);
  const [showCreate, setShowCreate] = useState(false);

  const {
    data: quantities = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Quantity[]>({
    queryKey: ["estimate-quantities", estimateId],
    queryFn: () =>
      apiFetch<Quantity[]>(`/api/estimates/${estimateId}/quantities`, {
        token,
      }),
    enabled: !!token && !!estimateId,
  });

  const floors = useMemo(() => {
    const set = new Set<string>(DEFAULT_FLOORS);
    quantities.forEach((q) => set.add(q.floor));
    return Array.from(set).sort((a, b) => {
      const ax = parseInt(a, 10);
      const bx = parseInt(b, 10);
      if (Number.isFinite(ax) && Number.isFinite(bx)) return ax - bx;
      return a.localeCompare(b);
    });
  }, [quantities]);

  const currentRow = useMemo(
    () => quantities.find((q) => q.face === face && q.floor === floor) || null,
    [quantities, face, floor]
  );

  const totals = useMemo(() => {
    return quantities.reduce(
      (acc, q) => {
        acc.net_area += num(q.net_area);
        acc.tile_count += num(q.tile_count);
        acc.sealant_length += num(q.sealant_length);
        return acc;
      },
      { net_area: 0, tile_count: 0, sealant_length: 0 }
    );
  }, [quantities]);

  const createMut = useMutation({
    mutationFn: (body: Partial<Quantity>) =>
      apiFetch<Quantity>(`/api/estimates/${estimateId}/quantities`, {
        token,
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["estimate-quantities", estimateId],
      });
      setShowCreate(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ qid, body }: { qid: string; body: Partial<Quantity> }) =>
      apiFetch<Quantity>(`/api/estimate-quantities/${qid}`, {
        token,
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["estimate-quantities", estimateId],
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (qid: string) =>
      apiFetch<{ ok: boolean }>(`/api/estimate-quantities/${qid}`, {
        token,
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["estimate-quantities", estimateId],
      });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link
            href={`/estimates`}
            className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"
            aria-label="見積書一覧へ戻る"
          >
            <ArrowLeft size={16} />
            見積書一覧へ戻る
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">数量データ入力</h1>
              <p className="text-sm text-gray-500 mt-1">
                面 (北/南/東/西) × 階 (1F/2F/3F...) ごとに数量を入力します
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-100"
                aria-label="再読み込み"
              >
                <RefreshCw size={14} />
                再読み込み
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                aria-label="新規行追加"
              >
                <Plus size={14} />
                新規追加
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <SummaryCard
            label="合計面積 (㎡)"
            value={formatNumber(totals.net_area, 2)}
            accent="text-gray-900"
            icon={<Ruler size={16} className="text-gray-500" />}
          />
          <SummaryCard
            label="合計タイル枚数"
            value={formatNumber(totals.tile_count, 0)}
            accent="text-emerald-600"
            icon={<Layers size={16} className="text-gray-500" />}
          />
          <SummaryCard
            label="合計シーラント長 (m)"
            value={formatNumber(totals.sealant_length, 2)}
            accent="text-amber-600"
            icon={<Ruler size={16} className="text-gray-500" />}
          />
        </div>

        {/* Error */}
        {isError && (
          <div
            role="alert"
            className="bg-white border border-red-200 rounded-lg p-6 text-center mb-6"
          >
            <p className="text-red-600 mb-3">データの取得に失敗しました</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-100"
            >
              <RefreshCw size={14} />
              再試行
            </button>
          </div>
        )}

        {/* Face / Floor selector */}
        {!isError && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  面を選択
                </label>
                <div
                  role="tablist"
                  aria-label="面選択"
                  className="flex flex-wrap gap-2"
                >
                  {FACES.map((f) => (
                    <button
                      key={f}
                      role="tab"
                      aria-selected={face === f}
                      onClick={() => setFace(f)}
                      className={`px-4 py-2 rounded-md text-sm border ${
                        face === f
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {f}面
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  階を選択
                </label>
                <div
                  role="tablist"
                  aria-label="階選択"
                  className="flex flex-wrap gap-2"
                >
                  {floors.map((f) => (
                    <button
                      key={f}
                      role="tab"
                      aria-selected={floor === f}
                      onClick={() => setFloor(f)}
                      className={`px-4 py-2 rounded-md text-sm border ${
                        floor === f
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card view: 1 face x 1 floor */}
        {!isError && (
          <>
            {isLoading ? (
              <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500">
                読み込み中...
              </div>
            ) : currentRow ? (
              <QuantityCard
                key={currentRow.id}
                quantity={currentRow}
                onSave={(body) =>
                  updateMut.mutate({ qid: currentRow.id, body })
                }
                onDelete={() => {
                  if (confirm(`${face}面 / ${floor} の数量データを削除しますか？`))
                    deleteMut.mutate(currentRow.id);
                }}
                isSaving={updateMut.isPending}
                isDeleting={deleteMut.isPending}
              />
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
                <p className="text-gray-500 mb-4">
                  {face}面 / {floor} の数量データはまだありません
                </p>
                <button
                  onClick={() =>
                    createMut.mutate({
                      face,
                      floor,
                      width: 0,
                      height: 0,
                      openings: [],
                    })
                  }
                  disabled={createMut.isPending}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus size={14} />
                  {createMut.isPending
                    ? "作成中..."
                    : `${face}面 / ${floor} を作成`}
                </button>
              </div>
            )}
          </>
        )}

        {/* All entries list */}
        {!isError && quantities.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              入力済み一覧 ({quantities.length} 件)
            </h2>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">面</th>
                      <th className="px-3 py-2 text-left font-medium">階</th>
                      <th className="px-3 py-2 text-right font-medium">幅(m)</th>
                      <th className="px-3 py-2 text-right font-medium">高(m)</th>
                      <th className="px-3 py-2 text-right font-medium">
                        開口部
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        正味面積(㎡)
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        タイル(枚)
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        シーラント(m)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {quantities.map((q) => (
                      <tr
                        key={q.id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          q.face === face && q.floor === floor
                            ? "bg-gray-50"
                            : ""
                        }`}
                        onClick={() => {
                          setFace(q.face);
                          setFloor(q.floor);
                        }}
                      >
                        <td className="px-3 py-2 text-gray-900">{q.face}</td>
                        <td className="px-3 py-2 text-gray-900">{q.floor}</td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {formatNumber(num(q.width), 2)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {formatNumber(num(q.height), 2)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {q.openings?.length ?? 0}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 font-medium">
                          {formatNumber(num(q.net_area), 2)}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-600 font-medium">
                          {formatNumber(num(q.tile_count), 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-amber-600 font-medium">
                          {formatNumber(num(q.sealant_length), 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onSubmit={(body) => createMut.mutate(body)}
            isPending={createMut.isPending}
            existingFloors={floors}
          />
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function QuantityCard({
  quantity,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: {
  quantity: Quantity;
  onSave: (body: Partial<Quantity>) => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const [width, setWidth] = useState<string>(String(quantity.width ?? 0));
  const [height, setHeight] = useState<string>(String(quantity.height ?? 0));
  const [openings, setOpenings] = useState<Opening[]>(
    Array.isArray(quantity.openings) ? quantity.openings : []
  );

  // Reset when quantity changes
  const quantityKey = quantity.id;
  const [lastKey, setLastKey] = useState(quantityKey);
  if (lastKey !== quantityKey) {
    setLastKey(quantityKey);
    setWidth(String(quantity.width ?? 0));
    setHeight(String(quantity.height ?? 0));
    setOpenings(Array.isArray(quantity.openings) ? quantity.openings : []);
  }

  const updateOpening = (i: number, key: keyof Opening, val: string) => {
    const next = [...openings];
    if (key === "name") {
      next[i] = { ...next[i], name: val };
    } else {
      next[i] = { ...next[i], [key]: num(val) };
    }
    setOpenings(next);
  };

  const grossArea = num(width) * num(height);
  const openingArea = openings.reduce(
    (s, o) => s + num(o.width) * num(o.height) * num(o.count),
    0
  );
  const estimatedNet = Math.max(0, grossArea - openingArea);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-900 text-white mr-2">
            {quantity.face}面
          </span>
          <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-800">
            {quantity.floor}
          </span>
        </div>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 text-red-600 rounded-md text-xs hover:bg-red-50 disabled:opacity-50"
          aria-label="この数量データを削除"
        >
          <Trash2 size={12} />
          {isDeleting ? "削除中..." : "削除"}
        </button>
      </div>

      {/* Width / Height */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            幅 (m)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-gray-900"
            aria-label="幅"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            高さ (m)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-gray-900"
            aria-label="高さ"
          />
        </div>
      </div>

      {/* Openings */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">
            開口部 ({openings.length} 件)
          </h3>
          <button
            onClick={() =>
              setOpenings([
                ...openings,
                { name: "", width: 0, height: 0, count: 1 },
              ])
            }
            className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-md text-xs text-gray-700 bg-white hover:bg-gray-100"
            aria-label="開口部を追加"
          >
            <Plus size={12} />
            開口部追加
          </button>
        </div>
        {openings.length === 0 ? (
          <p className="text-sm text-gray-500 py-3 text-center bg-gray-50 border border-dashed border-gray-300 rounded-md">
            まだ開口部がありません
          </p>
        ) : (
          <div className="space-y-2">
            {openings.map((o, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-2 items-end bg-gray-50 border border-gray-200 rounded-md p-2"
              >
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-[10px] text-gray-500 mb-0.5">
                    名称
                  </label>
                  <input
                    type="text"
                    value={o.name}
                    onChange={(e) => updateOpening(i, "name", e.target.value)}
                    placeholder="窓/扉など"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    aria-label="開口部名称"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[10px] text-gray-500 mb-0.5">
                    幅(m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={o.width || ""}
                    onChange={(e) => updateOpening(i, "width", e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    aria-label="開口部幅"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[10px] text-gray-500 mb-0.5">
                    高(m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={o.height || ""}
                    onChange={(e) => updateOpening(i, "height", e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    aria-label="開口部高さ"
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <label className="block text-[10px] text-gray-500 mb-0.5">
                    数量
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={o.count || ""}
                    onChange={(e) => updateOpening(i, "count", e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    aria-label="開口部数量"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2 flex justify-end">
                  <button
                    onClick={() =>
                      setOpenings(openings.filter((_, j) => j !== i))
                    }
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    aria-label={`開口部 ${i + 1} を削除`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Server-calculated */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <ResultBox
          label="正味面積 (㎡)"
          value={formatNumber(num(quantity.net_area), 2)}
          hint={`今回入力の予測: ${formatNumber(estimatedNet, 2)}`}
          color="text-gray-900"
        />
        <ResultBox
          label="タイル枚数"
          value={formatNumber(num(quantity.tile_count), 0)}
          color="text-emerald-600"
        />
        <ResultBox
          label="シーラント長 (m)"
          value={formatNumber(num(quantity.sealant_length), 2)}
          color="text-amber-600"
        />
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={() =>
            onSave({
              width: num(width),
              height: num(height),
              openings: openings.map((o) => ({
                name: o.name,
                width: num(o.width),
                height: num(o.height),
                count: num(o.count) || 1,
              })),
            })
          }
          disabled={isSaving}
          className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={14} />
          {isSaving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}

function ResultBox({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string;
  color: string;
  hint?: string;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {hint && <div className="text-[10px] text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}

function CreateModal({
  onClose,
  onSubmit,
  isPending,
  existingFloors,
}: {
  onClose: () => void;
  onSubmit: (body: Partial<Quantity>) => void;
  isPending: boolean;
  existingFloors: string[];
}) {
  const [face, setFace] = useState<string>(FACES[0]);
  const [floor, setFloor] = useState<string>(
    existingFloors[0] ?? DEFAULT_FLOORS[0]
  );
  const [customFloor, setCustomFloor] = useState<string>("");
  const [width, setWidth] = useState<string>("0");
  const [height, setHeight] = useState<string>("0");

  const finalFloor = customFloor.trim() || floor;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="数量データ新規作成"
    >
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">数量データ新規作成</h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              face,
              floor: finalFloor,
              width: num(width),
              height: num(height),
              openings: [],
            });
          }}
          className="p-4 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              面
            </label>
            <div className="flex flex-wrap gap-2">
              {FACES.map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFace(f)}
                  className={`px-3 py-1.5 rounded-md text-sm border ${
                    face === f
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {f}面
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              階
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {existingFloors.map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => {
                    setFloor(f);
                    setCustomFloor("");
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm border ${
                    !customFloor && floor === f
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customFloor}
              onChange={(e) => setCustomFloor(e.target.value)}
              placeholder="または直接入力 (例: B1F, 4F, RF)"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              aria-label="階を直接入力"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                幅 (m)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                高さ (m)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending || !finalFloor}
              className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={14} />
              {isPending ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
