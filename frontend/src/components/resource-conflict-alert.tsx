"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import { AlertTriangle, Users, Truck } from "lucide-react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ConflictEntry {
  project_id: string;
  project_name: string;
  date: string;
  resource_type: "worker" | "equipment";
  worker_id?: string;
  worker_name?: string;
  equipment_id?: string;
  equipment_name?: string;
}

interface ConflictResult {
  date: string;
  worker_conflicts: ConflictEntry[];
  equipment_conflicts: ConflictEntry[];
  has_conflicts: boolean;
}

interface Props {
  projectId: string;
  date: string; // YYYY-MM-DD
  /** If true, renders as a compact badge instead of a full banner */
  compact?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ResourceConflictAlert({ projectId, date, compact = false }: Props) {
  const { token } = useAuth();

  const { data, isLoading } = useQuery<ConflictResult>({
    queryKey: ["resource-conflicts", projectId, date],
    queryFn: () =>
      apiFetch(`/api/projects/${projectId}/resource-conflicts?date=${date}`, {
        token: token!,
      }),
    enabled: !!token && !!date,
    staleTime: 60_000,
  });

  if (isLoading || !data?.has_conflicts) return null;

  const totalConflicts =
    data.worker_conflicts.length + data.equipment_conflicts.length;

  /* ---- Compact badge variant ---- */
  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold"
        title="リソース重複があります"
      >
        <AlertTriangle className="w-3 h-3" />
        重複あり
      </span>
    );
  }

  /* ---- Full banner variant ---- */
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="font-semibold text-red-800 text-sm">
          {date} にリソースの重複が検出されました ({totalConflicts}件)
        </p>
      </div>

      {/* Worker conflicts */}
      {data.worker_conflicts.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            作業員の重複
          </p>
          {data.worker_conflicts.map((c, i) => (
            <div
              key={`worker-${i}`}
              className="flex items-center gap-2 text-xs text-red-700 pl-4"
            >
              <span className="font-medium">{c.worker_name ?? c.worker_id}</span>
              <span className="text-red-400">→</span>
              <Link
                href={`/projects/${c.project_id}`}
                className="underline hover:text-red-900"
              >
                {c.project_name}
              </Link>
              にも割り当てられています
            </div>
          ))}
        </div>
      )}

      {/* Equipment conflicts */}
      {data.equipment_conflicts.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" />
            重機・車両の重複
          </p>
          {data.equipment_conflicts.map((c, i) => (
            <div
              key={`equip-${i}`}
              className="flex items-center gap-2 text-xs text-red-700 pl-4"
            >
              <span className="font-medium">{c.equipment_name ?? c.equipment_id}</span>
              <span className="text-red-400">→</span>
              <Link
                href={`/projects/${c.project_id}`}
                className="underline hover:text-red-900"
              >
                {c.project_name}
              </Link>
              にも割り当てられています
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
