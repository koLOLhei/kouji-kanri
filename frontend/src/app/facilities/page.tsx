"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Plus,
  X,
  MapPin,
  Wrench,
  Database,
  ShieldCheck,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatAmount, formatDate } from "@/lib/utils";

const BUILDING_TYPES = [
  "オフィス",
  "学校",
  "病院",
  "住宅",
  "工場",
  "その他",
] as const;

const STRUCTURE_TYPES = ["RC", "SRC", "S", "W"] as const;

interface FacilityStats {
  facility_count: number;
  contract_count: number;
  annual_maintenance_income: number;
  data_value_score: number;
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
  element_count: number;
  zone_count: number;
  has_maintenance_contract: boolean;
}

const initialForm = {
  name: "",
  address: "",
  building_type: "オフィス",
  structure_type: "RC",
  floors_above: 1,
  floors_below: 0,
  total_floor_area: 0,
  built_year: 2020,
  owner_name: "",
};

export default function FacilitiesPage() {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);

  const { data: stats } = useQuery<FacilityStats>({
    queryKey: ["facility-stats"],
    queryFn: () => apiFetch("/api/facility-stats", { token }),
  });

  const { data: facilities, isLoading } = useQuery<Facility[]>({
    queryKey: ["facilities"],
    queryFn: () => apiFetch("/api/facilities", { token }),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch("/api/facilities", { method: "POST", token, body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facility-stats"] });
      setShowForm(false);
      setForm(initialForm);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              施設インフラデータベース
            </h1>
            <p className="text-gray-500 mt-1">
              施設・設備情報の一元管理と保守契約ダッシュボード
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            {showForm ? (
              <X className="w-5 h-5" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {showForm ? "閉じる" : "施設を登録"}
          </button>
        </div>

        {/* Stats banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl p-5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg">
            <div className="flex items-center gap-2 text-blue-100 text-sm font-medium mb-1">
              <Building2 className="w-4 h-4" />
              登録施設数
            </div>
            <div className="text-3xl font-bold">
              {stats?.facility_count ?? 0}
            </div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-green-500 to-green-700 text-white shadow-lg">
            <div className="flex items-center gap-2 text-green-100 text-sm font-medium mb-1">
              <ShieldCheck className="w-4 h-4" />
              保守契約数
            </div>
            <div className="text-3xl font-bold">
              {stats?.contract_count ?? 0}
            </div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg">
            <div className="flex items-center gap-2 text-amber-100 text-sm font-medium mb-1">
              <Wrench className="w-4 h-4" />
              年間保守収入
            </div>
            <div className="text-3xl font-bold">
              {formatAmount(stats?.annual_maintenance_income ?? 0)}
            </div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg">
            <div className="flex items-center gap-2 text-purple-100 text-sm font-medium mb-1">
              <Database className="w-4 h-4" />
              データ価値スコア
            </div>
            <div className="text-3xl font-bold">
              {stats?.data_value_score ?? 0}
            </div>
          </div>
        </div>

        {/* Create facility form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              新規施設登録
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    施設名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 第一庁舎"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    住所 *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 東京都千代田区..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    建物用途
                  </label>
                  <select
                    value={form.building_type}
                    onChange={(e) => updateField("building_type", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {BUILDING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    構造種別
                  </label>
                  <select
                    value={form.structure_type}
                    onChange={(e) =>
                      updateField("structure_type", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {STRUCTURE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    地上階数
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.floors_above}
                    onChange={(e) =>
                      updateField("floors_above", Number(e.target.value))
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    地下階数
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.floors_below}
                    onChange={(e) =>
                      updateField("floors_below", Number(e.target.value))
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    延床面積 (m2)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.total_floor_area}
                    onChange={(e) =>
                      updateField("total_floor_area", Number(e.target.value))
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    建築年
                  </label>
                  <input
                    type="number"
                    min={1900}
                    max={2100}
                    value={form.built_year}
                    onChange={(e) =>
                      updateField("built_year", Number(e.target.value))
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    所有者名
                  </label>
                  <input
                    type="text"
                    value={form.owner_name}
                    onChange={(e) => updateField("owner_name", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 千代田区"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm(initialForm);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-bold text-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? "登録中..." : "登録する"}
                </button>
              </div>
              {createMutation.isError && (
                <p className="text-red-600 text-sm mt-2">
                  登録に失敗しました。入力内容を確認してください。
                </p>
              )}
            </form>
          </div>
        )}

        {/* Facility list */}
        {isLoading ? (
          <div className="text-center py-16 text-gray-500">読み込み中...</div>
        ) : !facilities || facilities.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              施設が登録されていません。「施設を登録」ボタンから最初の施設を追加してください。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {facilities.map((facility) => (
              <button
                key={facility.id}
                onClick={() => router.push(`/facilities/${facility.id}`)}
                className="bg-white rounded-xl shadow border border-gray-200 p-5 text-left hover:shadow-lg hover:border-blue-300 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {facility.name}
                    </h3>
                    <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{facility.address}</span>
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {facility.building_type}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {facility.structure_type}造
                  </span>
                  {facility.built_year > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {facility.built_year}年築
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Layers className="w-4 h-4 text-gray-400" />
                    インフラ要素: {facility.element_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    ゾーン: {facility.zone_count}
                  </span>
                </div>

                <div className="mt-3">
                  {facility.has_maintenance_contract ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      保守契約あり
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      保守契約なし
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
