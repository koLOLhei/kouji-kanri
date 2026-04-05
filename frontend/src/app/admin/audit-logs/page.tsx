"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, ScrollText, Search } from "lucide-react";

interface AuditLog {
  id: string;
  user_name: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

const ENTITY_TYPES = [
  "",
  "project",
  "phase",
  "photo",
  "report",
  "submission",
  "user",
  "tenant",
  "daily_report",
  "inspection",
  "contract",
  "worker",
  "drawing",
  "material_order",
  "corrective_action",
];

export default function AuditLogsPage() {
  const { token } = useAuth();
  const [entityType, setEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryParams = new URLSearchParams();
  if (entityType) queryParams.set("entity_type", entityType);
  if (dateFrom) queryParams.set("date_from", dateFrom);
  if (dateTo) queryParams.set("date_to", dateTo);
  const qs = queryParams.toString();

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs", entityType, dateFrom, dateTo],
    queryFn: () => apiFetch(`/api/audit-logs${qs ? `?${qs}` : ""}`, { token: token! }),
    enabled: !!token,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="w-6 h-6" /> 監査ログ
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">エンティティ種別</label>
            <select value={entityType} onChange={e => setEntityType(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm">
              <option value="">すべて</option>
              {ENTITY_TYPES.filter(Boolean).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">開始日</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">終了日</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm" />
          </div>
          <button
            onClick={() => { setEntityType(""); setDateFrom(""); setDateTo(""); }}
            className="text-sm text-gray-500 hover:text-gray-700 mt-4"
          >
            クリア
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500">ログがありません</p>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">日時</th>
                  <th className="text-left px-4 py-2">ユーザー</th>
                  <th className="text-left px-4 py-2">操作</th>
                  <th className="text-left px-4 py-2">対象</th>
                  <th className="text-left px-4 py-2">詳細</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                      {new Date(log.created_at).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-2">
                      <div>
                        <span className="font-medium">{log.user_name || "-"}</span>
                        {log.user_email && (
                          <span className="text-xs text-gray-400 block">{log.user_email}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        log.action === "create" ? "bg-green-100 text-green-700" :
                        log.action === "update" ? "bg-blue-100 text-blue-700" :
                        log.action === "delete" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="text-xs text-gray-400 ml-1">{log.entity_id.slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs max-w-xs truncate">
                      {log.details || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
