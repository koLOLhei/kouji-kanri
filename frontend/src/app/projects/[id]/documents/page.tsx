"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Camera,
  File,
  ChevronDown,
  ChevronRight,
  Download,
  Zap,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate, statusLabel, statusColor } from "@/lib/utils";

interface DashboardData {
  fulfillment_rate: number;
  generatable_phases: number;
  missing_count: number;
  phases: Phase[];
}

interface Phase {
  id: string;
  code: string;
  name: string;
  fulfilled: number;
  total: number;
  status: "generated" | "generatable" | "insufficient";
  requirements: Requirement[];
}

interface Requirement {
  id: string;
  name: string;
  type: "photo" | "file";
  fulfilled: boolean;
  submission?: {
    id: string;
    status: string;
    download_url: string;
  };
}

interface MissingItem {
  phase_code: string;
  phase_name: string;
  requirement_name: string;
  type: "photo" | "file";
  remaining: number;
}

export default function DocumentsDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [missingOpen, setMissingOpen] = useState(true);

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["documents-dashboard", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/documents/dashboard`, { token }),
  });

  const { data: missingItems } = useQuery<MissingItem[]>({
    queryKey: ["documents-missing", id],
    queryFn: () =>
      apiFetch(`/api/projects/${id}/documents/missing`, { token }),
  });

  const batchGenerate = useMutation({
    mutationFn: () =>
      apiFetch(`/api/projects/${id}/documents/batch-generate`, {
        method: "POST",
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-dashboard", id] });
      queryClient.invalidateQueries({ queryKey: ["documents-missing", id] });
    },
  });

  const phaseGenerate = useMutation({
    mutationFn: (phaseId: string) =>
      apiFetch(`/api/projects/${id}/documents/generate/${phaseId}`, {
        method: "POST",
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-dashboard", id] });
    },
  });

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const rate = dashboard?.fulfillment_rate ?? 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (rate / 100) * circumference;
  const rateColor =
    rate >= 80 ? "text-emerald-500" : rate >= 60 ? "text-amber-500" : "text-red-500";
  const rateStroke =
    rate >= 80 ? "#10b981" : rate >= 60 ? "#f59e0b" : "#ef4444";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-7 h-7" />
          書類ダッシュボード
        </h1>
        <p className="text-blue-100 mt-1">プロジェクト書類の状況を一覧で確認</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6">
        {/* Summary Banner */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            {/* Fulfillment Rate with Progress Ring */}
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke={rateStroke}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold ${rateColor}`}>{rate}%</span>
                </div>
              </div>
              <span className="text-sm text-gray-500 mt-2">書類充足率</span>
            </div>

            {/* Generatable Phases */}
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-3xl font-bold text-blue-600">
                {dashboard?.generatable_phases ?? 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">生成可能工程</div>
            </div>

            {/* Missing Count */}
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <div className="text-3xl font-bold text-red-500">
                {dashboard?.missing_count ?? 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">不足書類数</div>
            </div>

            {/* Batch Generate Button */}
            <div className="flex justify-center">
              <button
                onClick={() => batchGenerate.mutate()}
                disabled={
                  batchGenerate.isPending || (dashboard?.generatable_phases ?? 0) === 0
                }
                className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {batchGenerate.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                一括生成
              </button>
            </div>
          </div>
        </div>

        {/* Missing Documents Section */}
        {(missingItems?.length ?? 0) > 0 && (
          <div className="bg-white rounded-2xl shadow-lg mb-6 overflow-hidden">
            <button
              onClick={() => setMissingOpen(!missingOpen)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-bold text-gray-800">不足書類一覧</h2>
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {missingItems?.length}件
                </span>
              </div>
              {missingOpen ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {missingOpen && (
              <div className="px-6 pb-4">
                <div className="divide-y divide-gray-100">
                  {missingItems?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 py-3 px-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {item.phase_code}
                      </span>
                      {item.type === "photo" ? (
                        <Camera className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      ) : (
                        <File className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-700 flex-1">
                        {item.requirement_name}
                      </span>
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">
                        あと{item.remaining}件
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase Document Status */}
        <div className="space-y-4 pb-8">
          <h2 className="text-lg font-bold text-gray-800 px-1 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-500" />
            工程別書類状況
          </h2>

          {dashboard?.phases.map((phase) => {
            const expanded = expandedPhases.has(phase.id);
            const pct =
              phase.total > 0
                ? Math.round((phase.fulfilled / phase.total) * 100)
                : 0;

            const statusBadge = (() => {
              switch (phase.status) {
                case "generated":
                  return (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      生成済み
                    </span>
                  );
                case "generatable":
                  return (
                    <span className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full">
                      <Circle className="w-3.5 h-3.5" />
                      生成可能
                    </span>
                  );
                default:
                  return (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5" />
                      要件不足
                    </span>
                  );
              }
            })();

            return (
              <div
                key={phase.id}
                className="bg-white rounded-2xl shadow-md overflow-hidden"
              >
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="w-full flex items-center gap-4 px-6 py-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {expanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {phase.code}
                      </span>
                      <span className="font-semibold text-gray-800 truncate">
                        {phase.name}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            pct === 100
                              ? "bg-emerald-500"
                              : pct >= 50
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {phase.fulfilled}/{phase.total}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {statusBadge}
                    {phase.status === "generatable" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          phaseGenerate.mutate(phase.id);
                        }}
                        disabled={phaseGenerate.isPending}
                        className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        生成
                      </button>
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="px-6 pb-5 border-t border-gray-100">
                    <div className="mt-4 space-y-2">
                      {phase.requirements.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50"
                        >
                          {req.fulfilled ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                          )}
                          {req.type === "photo" ? (
                            <Camera className="w-4 h-4 text-blue-400" />
                          ) : (
                            <File className="w-4 h-4 text-amber-400" />
                          )}
                          <span
                            className={`flex-1 text-sm ${
                              req.fulfilled ? "text-gray-500" : "text-gray-800"
                            }`}
                          >
                            {req.name}
                          </span>
                          {req.submission && (
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${statusColor(
                                  req.submission.status
                                )}`}
                              >
                                {statusLabel(req.submission.status)}
                              </span>
                              <a
                                href={req.submission.download_url}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
