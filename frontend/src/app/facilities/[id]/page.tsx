"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Zap,
  Droplets,
  Wind,
  Flame,
  CircleDot,
  Box,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  Building2,
  MapPin,
  ShieldCheck,
  Clock,
  Layers,
  FolderTree,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatAmount, formatDate } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────── */

interface CategoryCount {
  category: string;
  count: number;
}

interface Facility {
  id: string;
  name: string;
  address: string;
  building_type: string;
  structure_type: string;
  floors_above: number;
  floors_below: number;
  total_floor_area: number;
  built_year: number;
  owner_name: string;
  elements_by_category: CategoryCount[];
  has_maintenance_contract: boolean;
  maintenance_contract?: {
    id: string;
    client_name: string;
    contract_type: string;
    start_date: string;
    end_date: string;
    annual_fee: number;
    data_scope: string;
  };
}

interface Zone {
  id: string;
  name: string;
  zone_type: string;
  floor_number: number | null;
  children?: Zone[];
}

interface Element {
  id: string;
  category: string;
  element_type: string;
  name: string;
  specification: string;
  condition: string;
  position_description: string;
  zone_id: string;
  zone_name: string;
}

interface LogEntry {
  id: string;
  log_date: string;
  log_type: string;
  element_name: string;
  condition_before: string;
  condition_after: string;
  description: string;
}

/* ── Constants ─────────────────────────────────────── */

const CATEGORIES = [
  { key: "電気", color: "bg-yellow-100 text-yellow-800 border-yellow-300", iconColor: "text-yellow-600", gradient: "from-yellow-400 to-yellow-600", Icon: Zap },
  { key: "給排水", color: "bg-blue-100 text-blue-800 border-blue-300", iconColor: "text-blue-600", gradient: "from-blue-400 to-blue-600", Icon: Droplets },
  { key: "空調", color: "bg-cyan-100 text-cyan-800 border-cyan-300", iconColor: "text-cyan-600", gradient: "from-cyan-400 to-cyan-600", Icon: Wind },
  { key: "消防", color: "bg-red-100 text-red-800 border-red-300", iconColor: "text-red-600", gradient: "from-red-400 to-red-600", Icon: Flame },
  { key: "ガス", color: "bg-orange-100 text-orange-800 border-orange-300", iconColor: "text-orange-600", gradient: "from-orange-400 to-orange-600", Icon: CircleDot },
  { key: "構造", color: "bg-gray-100 text-gray-800 border-gray-300", iconColor: "text-gray-600", gradient: "from-gray-400 to-gray-600", Icon: Box },
] as const;

const CONDITION_MAP: Record<string, { label: string; cls: string }> = {
  良好: { label: "良好", cls: "bg-green-100 text-green-700" },
  注意: { label: "注意", cls: "bg-yellow-100 text-yellow-700" },
  不良: { label: "不良", cls: "bg-red-100 text-red-700" },
  不明: { label: "不明", cls: "bg-gray-100 text-gray-500" },
};

const CONDITIONS = ["良好", "注意", "不良", "不明"] as const;
const ZONE_TYPES = ["フロア", "部屋", "エリア", "シャフト", "天井裏"] as const;
const CONTRACT_TYPES = ["フル", "部分", "データのみ"] as const;

const ELEMENT_CATEGORIES = CATEGORIES.map((c) => c.key);

/* ── Helpers ───────────────────────────────────────── */

function getCategoryMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[5];
}

/* ── Component ─────────────────────────────────────── */

export default function FacilityDetailPage() {
  const params = useParams();
  const facilityId = params.id as string;
  const router = useRouter();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [showElementForm, setShowElementForm] = useState(false);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  /* ── Queries ── */

  const { data: facility, isLoading } = useQuery<Facility>({
    queryKey: ["facility", facilityId],
    queryFn: () => apiFetch(`/api/facilities/${facilityId}`, { token }),
  });

  const { data: zones } = useQuery<Zone[]>({
    queryKey: ["facility-zones", facilityId],
    queryFn: () => apiFetch(`/api/facilities/${facilityId}/zones`, { token }),
  });

  const elementParams = new URLSearchParams();
  if (activeCategory) elementParams.set("category", activeCategory);
  if (activeZoneId) elementParams.set("zone_id", activeZoneId);

  const { data: elements } = useQuery<Element[]>({
    queryKey: ["facility-elements", facilityId, activeCategory, activeZoneId],
    queryFn: () =>
      apiFetch(
        `/api/facilities/${facilityId}/elements?${elementParams.toString()}`,
        { token }
      ),
  });

  const { data: logs } = useQuery<LogEntry[]>({
    queryKey: ["facility-logs", facilityId],
    queryFn: () => apiFetch(`/api/facilities/${facilityId}/logs`, { token }),
  });

  /* ── Element form ── */

  const [elementForm, setElementForm] = useState({
    category: "電気",
    element_type: "",
    name: "",
    specification: "",
    zone_id: "",
    position_description: "",
    condition: "良好",
  });

  const createElementMutation = useMutation({
    mutationFn: (data: typeof elementForm) =>
      apiFetch(`/api/facilities/${facilityId}/elements`, {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-elements", facilityId] });
      queryClient.invalidateQueries({ queryKey: ["facility", facilityId] });
      setShowElementForm(false);
      setElementForm({
        category: "電気",
        element_type: "",
        name: "",
        specification: "",
        zone_id: "",
        position_description: "",
        condition: "良好",
      });
    },
  });

  /* ── Zone form ── */

  const [zoneForm, setZoneForm] = useState({
    name: "",
    zone_type: "フロア",
    floor_number: 1,
  });

  const createZoneMutation = useMutation({
    mutationFn: (data: typeof zoneForm) =>
      apiFetch(`/api/facilities/${facilityId}/zones`, {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-zones", facilityId] });
      setShowZoneForm(false);
      setZoneForm({ name: "", zone_type: "フロア", floor_number: 1 });
    },
  });

  /* ── Contract form ── */

  const [contractForm, setContractForm] = useState({
    facility_id: facilityId,
    client_name: "",
    contract_type: "フル",
    start_date: "",
    end_date: "",
    annual_fee: 0,
    data_scope: "",
  });

  const createContractMutation = useMutation({
    mutationFn: (data: typeof contractForm) =>
      apiFetch("/api/maintenance-contracts", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility", facilityId] });
      setShowContractForm(false);
    },
  });

  /* ── Zone tree toggle ── */

  const toggleZone = (id: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Render ── */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        施設が見つかりません
      </div>
    );
  }

  const renderZoneTree = (zoneList: Zone[], depth = 0) => (
    <ul className={depth > 0 ? "ml-4 border-l border-gray-200" : ""}>
      {zoneList.map((zone) => {
        const hasChildren = zone.children && zone.children.length > 0;
        const isExpanded = expandedZones.has(zone.id);
        const isActive = activeZoneId === zone.id;
        return (
          <li key={zone.id}>
            <div
              className={`flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer text-sm ${
                isActive
                  ? "bg-blue-100 text-blue-800 font-bold"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              {hasChildren && (
                <button
                  onClick={() => toggleZone(zone.id)}
                  className="p-0.5"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              {!hasChildren && <span className="w-4" />}
              <button
                onClick={() =>
                  setActiveZoneId(isActive ? null : zone.id)
                }
                className="flex-1 text-left truncate"
              >
                {zone.name}
                <span className="text-xs text-gray-400 ml-1">
                  ({zone.zone_type})
                </span>
              </button>
            </div>
            {hasChildren && isExpanded && renderZoneTree(zone.children!, depth + 1)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back nav */}
        <button
          onClick={() => router.push("/facilities")}
          className="flex items-center gap-1 text-gray-500 hover:text-blue-600 mb-4 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          施設一覧に戻る
        </button>

        {/* ── Facility header ─────────────────────── */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-600" />
                {facility.name}
              </h1>
              <p className="text-gray-500 mt-1 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {facility.address}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {facility.building_type}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {facility.structure_type}造
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  地上{facility.floors_above}階
                  {facility.floors_below > 0 && ` / 地下${facility.floors_below}階`}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {facility.total_floor_area} m&sup2;
                </span>
                {facility.built_year > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {facility.built_year}年築
                  </span>
                )}
              </div>
              {facility.owner_name && (
                <p className="text-sm text-gray-500 mt-2">
                  所有者: {facility.owner_name}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              {facility.has_maintenance_contract ? (
                <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold bg-green-100 text-green-700">
                  <ShieldCheck className="w-4 h-4" />
                  保守契約あり
                </span>
              ) : (
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-500">
                  保守契約なし
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Category breakdown ──────────────────── */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Layers className="w-5 h-5 text-gray-400" />
            カテゴリ別インフラ要素
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.map(({ key, gradient, Icon }) => {
              const count =
                facility.elements_by_category?.find(
                  (c) => c.category === key
                )?.count ?? 0;
              const isActive = activeCategory === key;
              return (
                <button
                  key={key}
                  onClick={() =>
                    setActiveCategory(isActive ? null : key)
                  }
                  className={`relative rounded-xl p-4 text-white shadow transition-all ${
                    isActive
                      ? "ring-4 ring-offset-2 ring-blue-500 scale-105"
                      : "hover:scale-105"
                  } bg-gradient-to-br ${gradient}`}
                >
                  <Icon className="w-8 h-8 mb-2 opacity-90" />
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm font-medium opacity-90">{key}</div>
                </button>
              );
            })}
          </div>
          {activeCategory && (
            <button
              onClick={() => setActiveCategory(null)}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              フィルタ解除
            </button>
          )}
        </div>

        {/* ── Main content: sidebar + elements ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Sidebar: Zone navigator */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow border border-gray-200 p-4 sticky top-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-gray-400" />
                  ゾーン
                </h3>
                <button
                  onClick={() => setShowZoneForm(!showZoneForm)}
                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                >
                  {showZoneForm ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
              </div>

              {showZoneForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createZoneMutation.mutate(zoneForm);
                  }}
                  className="border border-gray-200 rounded-lg p-3 mb-3 space-y-2"
                >
                  <input
                    type="text"
                    required
                    placeholder="ゾーン名"
                    value={zoneForm.name}
                    onChange={(e) =>
                      setZoneForm((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={zoneForm.zone_type}
                    onChange={(e) =>
                      setZoneForm((p) => ({ ...p, zone_type: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {ZONE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="階数"
                    value={zoneForm.floor_number}
                    onChange={(e) =>
                      setZoneForm((p) => ({
                        ...p,
                        floor_number: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={createZoneMutation.isPending}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createZoneMutation.isPending ? "追加中..." : "追加"}
                  </button>
                </form>
              )}

              {activeZoneId && (
                <button
                  onClick={() => setActiveZoneId(null)}
                  className="text-xs text-blue-600 hover:underline mb-2"
                >
                  ゾーンフィルタ解除
                </button>
              )}

              {zones && zones.length > 0 ? (
                renderZoneTree(zones)
              ) : (
                <p className="text-sm text-gray-400 py-2">
                  ゾーンがありません
                </p>
              )}
            </div>
          </div>

          {/* Elements */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-gray-400" />
                インフラ要素一覧
                {(activeCategory || activeZoneId) && (
                  <span className="text-sm font-normal text-blue-600">
                    (フィルタ中)
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowElementForm(!showElementForm)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                {showElementForm ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {showElementForm ? "閉じる" : "要素を追加"}
              </button>
            </div>

            {/* Add element form */}
            {showElementForm && (
              <div className="bg-white rounded-xl shadow border border-gray-200 p-5 mb-4">
                <h4 className="font-bold text-gray-900 mb-3">
                  新規インフラ要素
                </h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createElementMutation.mutate(elementForm);
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3"
                >
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      カテゴリ *
                    </label>
                    <select
                      value={elementForm.category}
                      onChange={(e) =>
                        setElementForm((p) => ({
                          ...p,
                          category: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {ELEMENT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      要素タイプ *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="例: 分電盤"
                      value={elementForm.element_type}
                      onChange={(e) =>
                        setElementForm((p) => ({
                          ...p,
                          element_type: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      名称 *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="例: 1F-DB-01"
                      value={elementForm.name}
                      onChange={(e) =>
                        setElementForm((p) => ({ ...p, name: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      仕様
                    </label>
                    <input
                      type="text"
                      placeholder="例: 三菱 200V 30A"
                      value={elementForm.specification}
                      onChange={(e) =>
                        setElementForm((p) => ({
                          ...p,
                          specification: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      ゾーン
                    </label>
                    <select
                      value={elementForm.zone_id}
                      onChange={(e) =>
                        setElementForm((p) => ({
                          ...p,
                          zone_id: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">選択してください</option>
                      {zones?.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      状態
                    </label>
                    <select
                      value={elementForm.condition}
                      onChange={(e) =>
                        setElementForm((p) => ({
                          ...p,
                          condition: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      設置位置の説明
                    </label>
                    <input
                      type="text"
                      placeholder="例: EPS内、北側壁面"
                      value={elementForm.position_description}
                      onChange={(e) =>
                        setElementForm((p) => ({
                          ...p,
                          position_description: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowElementForm(false)}
                      className="px-5 py-2.5 border border-gray-300 rounded-lg font-bold hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={createElementMutation.isPending}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {createElementMutation.isPending ? "登録中..." : "登録する"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Element cards */}
            {elements && elements.length > 0 ? (
              <div className="space-y-3">
                {elements.map((el) => {
                  const meta = getCategoryMeta(el.category);
                  const cond = CONDITION_MAP[el.condition] ?? CONDITION_MAP["不明"];
                  return (
                    <button
                      key={el.id}
                      onClick={() =>
                        router.push(
                          `/facilities/${facilityId}/elements?eid=${el.id}`
                        )
                      }
                      className="w-full bg-white rounded-xl shadow border border-gray-200 p-4 text-left hover:shadow-md hover:border-blue-300 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2.5 rounded-xl ${meta.color} border flex-shrink-0`}
                        >
                          <meta.Icon className={`w-6 h-6 ${meta.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 truncate">
                              {el.name}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cond.cls}`}>
                              {cond.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {el.element_type}
                            {el.specification && ` / ${el.specification}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {el.zone_name && `${el.zone_name} `}
                            {el.position_description}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">
                  {activeCategory || activeZoneId
                    ? "条件に一致する要素がありません"
                    : "インフラ要素が登録されていません"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent inspection logs ──────────────── */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 mb-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            最近の点検ログ
          </h3>
          {logs && logs.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {logs.slice(0, 10).map((log) => {
                const condBefore =
                  CONDITION_MAP[log.condition_before] ?? CONDITION_MAP["不明"];
                const condAfter =
                  CONDITION_MAP[log.condition_after] ?? CONDITION_MAP["不明"];
                return (
                  <div key={log.id} className="py-3 flex items-center gap-4">
                    <div className="text-sm text-gray-500 w-24 flex-shrink-0">
                      {formatDate(log.log_date)}
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 flex-shrink-0">
                      {log.log_type}
                    </span>
                    <div className="flex-1 min-w-0 text-sm text-gray-800 truncate">
                      {log.element_name}
                      {log.description && (
                        <span className="text-gray-400 ml-2">
                          - {log.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 text-xs">
                      <span className={`px-1.5 py-0.5 rounded ${condBefore.cls}`}>
                        {condBefore.label}
                      </span>
                      <span className="text-gray-400">&rarr;</span>
                      <span className={`px-1.5 py-0.5 rounded ${condAfter.cls}`}>
                        {condAfter.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4">ログがありません</p>
          )}
        </div>

        {/* ── Maintenance contract section ────────── */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gray-400" />
            保守契約
          </h3>

          {facility.maintenance_contract ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">クライアント</p>
                <p className="font-bold text-gray-900">
                  {facility.maintenance_contract.client_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">契約種別</p>
                <p className="font-bold text-gray-900">
                  {facility.maintenance_contract.contract_type}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">年間費用</p>
                <p className="font-bold text-gray-900">
                  {formatAmount(facility.maintenance_contract.annual_fee)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">開始日</p>
                <p className="font-bold text-gray-900">
                  {formatDate(facility.maintenance_contract.start_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">終了日</p>
                <p className="font-bold text-gray-900">
                  {formatDate(facility.maintenance_contract.end_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">データ範囲</p>
                <p className="font-bold text-gray-900">
                  {facility.maintenance_contract.data_scope || "-"}
                </p>
              </div>
            </div>
          ) : (
            <div>
              {!showContractForm && (
                <button
                  onClick={() => setShowContractForm(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  保守契約を登録
                </button>
              )}
            </div>
          )}

          {showContractForm && !facility.maintenance_contract && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createContractMutation.mutate(contractForm);
              }}
              className="mt-4 border border-gray-200 rounded-lg p-5 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    クライアント名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={contractForm.client_name}
                    onChange={(e) =>
                      setContractForm((p) => ({
                        ...p,
                        client_name: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    契約種別
                  </label>
                  <select
                    value={contractForm.contract_type}
                    onChange={(e) =>
                      setContractForm((p) => ({
                        ...p,
                        contract_type: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CONTRACT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    開始日 *
                  </label>
                  <input
                    type="date"
                    required
                    value={contractForm.start_date}
                    onChange={(e) =>
                      setContractForm((p) => ({
                        ...p,
                        start_date: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    終了日 *
                  </label>
                  <input
                    type="date"
                    required
                    value={contractForm.end_date}
                    onChange={(e) =>
                      setContractForm((p) => ({
                        ...p,
                        end_date: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    年間費用
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={contractForm.annual_fee}
                    onChange={(e) =>
                      setContractForm((p) => ({
                        ...p,
                        annual_fee: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    データ範囲
                  </label>
                  <input
                    type="text"
                    placeholder="例: 全設備データ"
                    value={contractForm.data_scope}
                    onChange={(e) =>
                      setContractForm((p) => ({
                        ...p,
                        data_scope: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowContractForm(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg font-bold hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createContractMutation.isPending}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {createContractMutation.isPending ? "登録中..." : "契約を登録"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
