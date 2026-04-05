"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, statusLabel, statusColor, formatDate, formatAmount } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Camera, ChevronRight, ChevronDown,
  CheckCircle2, Circle, Clock, AlertCircle, Sparkles, Package,
  ClipboardList, Shield, Search, DollarSign, FileImage,
  Handshake, AlertTriangle, Calendar, BookOpen, BarChart2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Project {
  id: string;
  name: string;
  project_code: string | null;
  client_name: string | null;
  contractor_name: string | null;
  site_address: string | null;
  contract_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  spec_base: string;
  phase_count: number | null;
  completed_phases: number | null;
}

interface Phase {
  id: string;
  name: string;
  phase_code: string | null;
  status: string;
  sort_order: number;
  requirements_met: number | null;
  requirements_total: number | null;
}

/* ------------------------------------------------------------------ */
/*  Progress Ring SVG                                                   */
/* ------------------------------------------------------------------ */

function ProgressRing({ percent, size = 96, stroke = 8 }: { percent: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color =
    percent >= 100 ? "#22c55e" : percent >= 60 ? "#3b82f6" : percent >= 30 ? "#f59e0b" : "#94a3b8";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold text-gray-900">{Math.round(percent)}%</span>
        <span className="text-[10px] text-gray-400 leading-none">完了</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature Link Config                                                */
/* ------------------------------------------------------------------ */

const FEATURES = [
  { key: "documents",           label: "書類管理",  icon: FileImage,      bg: "bg-rose-50",    ring: "ring-rose-200",    iconColor: "text-rose-600",    badgeBg: "bg-rose-100",    badgeText: "text-rose-700" },
  { key: "daily-reports",      label: "日報",     icon: ClipboardList,  bg: "bg-blue-50",    ring: "ring-blue-200",    iconColor: "text-blue-600",    badgeBg: "bg-blue-100",    badgeText: "text-blue-700" },
  { key: "safety",             label: "安全管理",  icon: Shield,         bg: "bg-emerald-50", ring: "ring-emerald-200", iconColor: "text-emerald-600", badgeBg: "bg-emerald-100", badgeText: "text-emerald-700" },
  { key: "inspections",        label: "検査",     icon: Search,         bg: "bg-purple-50",  ring: "ring-purple-200",  iconColor: "text-purple-600",  badgeBg: "bg-purple-100",  badgeText: "text-purple-700" },
  { key: "materials",          label: "資材",     icon: Package,        bg: "bg-orange-50",  ring: "ring-orange-200",  iconColor: "text-orange-600",  badgeBg: "bg-orange-100",  badgeText: "text-orange-700" },
  { key: "costs",              label: "原価",     icon: DollarSign,     bg: "bg-red-50",     ring: "ring-red-200",     iconColor: "text-red-600",     badgeBg: "bg-red-100",     badgeText: "text-red-700" },
  { key: "drawings",           label: "図面",     icon: FileImage,      bg: "bg-indigo-50",  ring: "ring-indigo-200",  iconColor: "text-indigo-600",  badgeBg: "bg-indigo-100",  badgeText: "text-indigo-700" },
  { key: "contracts",          label: "下請",     icon: Handshake,      bg: "bg-teal-50",    ring: "ring-teal-200",    iconColor: "text-teal-600",    badgeBg: "bg-teal-100",    badgeText: "text-teal-700" },
  { key: "corrective-actions", label: "是正措置",  icon: AlertTriangle,  bg: "bg-amber-50",   ring: "ring-amber-200",   iconColor: "text-amber-600",   badgeBg: "bg-amber-100",   badgeText: "text-amber-700" },
  { key: "meetings",           label: "打合せ",    icon: ClipboardList,  bg: "bg-sky-50",     ring: "ring-sky-200",     iconColor: "text-sky-600",     badgeBg: "bg-sky-100",     badgeText: "text-sky-700" },
  { key: "measurements",       label: "出来形",    icon: Search,         bg: "bg-lime-50",    ring: "ring-lime-200",    iconColor: "text-lime-600",    badgeBg: "bg-lime-100",    badgeText: "text-lime-700" },
  { key: "waste",              label: "廃棄物",    icon: AlertTriangle,  bg: "bg-stone-50",   ring: "ring-stone-200",   iconColor: "text-stone-600",   badgeBg: "bg-stone-100",   badgeText: "text-stone-700" },
  { key: "calendar",           label: "カレンダー", icon: Calendar,      bg: "bg-pink-50",    ring: "ring-pink-200",    iconColor: "text-pink-600",    badgeBg: "bg-pink-100",    badgeText: "text-pink-700" },
  { key: "schedule",           label: "ガント",     icon: BarChart2,     bg: "bg-violet-50",  ring: "ring-violet-200",  iconColor: "text-violet-600",  badgeBg: "bg-violet-100",  badgeText: "text-violet-700" },
  { key: "capture",            label: "写真撮影",  icon: Camera,         bg: "bg-cyan-50",    ring: "ring-cyan-200",    iconColor: "text-cyan-600",    badgeBg: "bg-cyan-100",    badgeText: "text-cyan-700",   isCapture: true },
] as const;

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  /* ---------- queries ---------- */

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => apiFetch<Project>(`/api/projects/${id}`, { token: token! }),
    enabled: !!token,
  });

  const { data: phases = [], isLoading: phasesLoading } = useQuery({
    queryKey: ["phases", id],
    queryFn: () => apiFetch<Phase[]>(`/api/projects/${id}/phases`, { token: token! }),
    enabled: !!token,
  });

  const initPhasesMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/projects/${id}/phases/init-from-spec?spec_code=kokyo_r7`, {
        token: token!,
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phases", id] });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  /* ---------- derived ---------- */

  const completionPercent =
    project && project.phase_count
      ? Math.round(((project.completed_phases ?? 0) / project.phase_count) * 100)
      : 0;

  // Group phases by chapter
  const chapters = new Map<string, Phase[]>();
  phases.forEach((p) => {
    const ch = p.phase_code?.split("-")[0] || "OTHER";
    if (!chapters.has(ch)) chapters.set(ch, []);
    chapters.get(ch)!.push(p);
  });

  const toggleChapter = (code: string) =>
    setCollapsed((prev) => ({ ...prev, [code]: !prev[code] }));

  /* ---------- status helpers ---------- */

  const statusIcon = (status: string, size = "w-4 h-4") => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className={`${size} text-green-500`} />;
      case "in_progress":
        return <Clock className={`${size} text-blue-500`} />;
      case "inspection":
        return <AlertCircle className={`${size} text-yellow-500`} />;
      default:
        return <Circle className={`${size} text-gray-300`} />;
    }
  };

  const chapterProgress = (chPhases: Phase[]) => {
    const total = chPhases.length;
    const done = chPhases.filter((p) => p.status === "completed").length;
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  };

  /* ---------- loading ---------- */

  if (projectLoading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">読込中...</p>
        </div>
      </div>
    );
  }

  /* ---------- render ---------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Back link */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          案件一覧に戻る
        </Link>

        {/* ============================================================ */}
        {/*  1. PROJECT HEADER CARD                                       */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* colored accent bar */}
          <div className={`h-1.5 ${
            project.status === "completed" ? "bg-gradient-to-r from-green-400 to-emerald-500" :
            project.status === "active"    ? "bg-gradient-to-r from-blue-400 to-indigo-500" :
            project.status === "inspection"? "bg-gradient-to-r from-yellow-400 to-orange-400" :
                                             "bg-gradient-to-r from-gray-300 to-gray-400"
          }`} />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              {/* Left: title + info */}
              <div className="flex-1 min-w-0 space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                      {project.name}
                    </h1>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${statusColor(project.status)}`}
                    >
                      {statusLabel(project.status)}
                    </span>
                  </div>
                  {project.project_code && (
                    <p className="text-sm text-gray-400 font-mono">No. {project.project_code}</p>
                  )}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                  {[
                    { label: "発注者",   value: project.client_name || "-" },
                    { label: "施工者",   value: project.contractor_name || "-" },
                    { label: "請負金額", value: formatAmount(project.contract_amount) },
                    { label: "工期",     value: `${formatDate(project.start_date)} 〜 ${formatDate(project.end_date)}` },
                  ].map((item) => (
                    <div key={item.label}>
                      <dt className="text-xs text-gray-400 mb-0.5">{item.label}</dt>
                      <dd className="text-sm font-semibold text-gray-800 truncate">{item.value}</dd>
                    </div>
                  ))}
                  {project.site_address && (
                    <div className="col-span-2 sm:col-span-4">
                      <dt className="text-xs text-gray-400 mb-0.5">工事場所</dt>
                      <dd className="text-sm font-semibold text-gray-800">{project.site_address}</dd>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: progress ring */}
              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                <ProgressRing percent={completionPercent} size={110} stroke={10} />
                <p className="text-[11px] text-gray-400 mt-1">
                  {project.completed_phases ?? 0} / {project.phase_count ?? 0} 工程
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  2. QUICK ACTION GRID                                         */}
        {/* ============================================================ */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
            クイックアクセス
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {FEATURES.map((f) => {
              const href = "isCapture" in f && f.isCapture
                ? `/capture?project=${id}`
                : `/projects/${id}/${f.key}`;
              const Icon = f.icon;
              return (
                <Link
                  key={f.key}
                  href={href}
                  className={`group relative flex flex-col items-center gap-2 p-4 rounded-2xl border border-transparent ring-1 ${f.ring} ${f.bg} hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all duration-150`}
                >
                  <div className={`p-2.5 rounded-xl bg-white/70 shadow-sm ${f.iconColor} group-hover:shadow-md transition-shadow`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                    {f.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ============================================================ */}
        {/*  3. PHASE / PROCESS TREE                                      */}
        {/* ============================================================ */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-400" />
              工程一覧
              <span className="text-sm font-normal text-gray-400 ml-1">({phases.length})</span>
            </h2>
          </div>

          {phasesLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : phases.length === 0 ? (
            /* ---------- Empty: big CTA ---------- */
            <div className="bg-white rounded-2xl shadow-sm border border-dashed border-blue-300 p-10 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">工程がまだ登録されていません</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  公共建築工事標準仕様書（令和7年版）に基づいて、工程ツリーを自動生成できます。
                </p>
              </div>
              <button
                onClick={() => initPhasesMutation.mutate()}
                disabled={initPhasesMutation.isPending}
                className="mt-2 inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-base shadow-lg shadow-blue-200 hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all"
              >
                <Sparkles className="w-5 h-5" />
                {initPhasesMutation.isPending ? "生成中..." : "仕様書から工程を自動生成"}
              </button>
            </div>
          ) : (
            /* ---------- Phase tree ---------- */
            <div className="space-y-3">
              {Array.from(chapters.entries()).map(([chCode, chPhases]) => {
                const chapterPhase = chPhases.find((p) => !p.phase_code?.includes("-"));
                const subPhases = chPhases.filter((p) => p.phase_code?.includes("-"));
                const progress = chapterProgress(subPhases.length > 0 ? subPhases : chPhases);
                const isCollapsed = !!collapsed[chCode];

                return (
                  <div
                    key={chCode}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    {/* Chapter header */}
                    <button
                      type="button"
                      onClick={() => toggleChapter(chCode)}
                      className="w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-gray-50 to-white hover:from-blue-50/40 hover:to-white transition-colors text-left"
                    >
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                      />

                      {/* Chapter number badge */}
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                        {chCode}
                      </span>

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-900 text-sm">
                          {chapterPhase?.name || `第${chCode}章`}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                        <div className="w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              progress.percent >= 100 ? "bg-green-500" :
                              progress.percent >= 50  ? "bg-blue-500" :
                              progress.percent > 0    ? "bg-amber-400" :
                                                        "bg-gray-200"
                            }`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-16 text-right tabular-nums">
                          {progress.done}/{progress.total}
                        </span>
                      </div>

                      {/* Status icon for chapter itself */}
                      {chapterPhase && statusIcon(chapterPhase.status)}
                    </button>

                    {/* Sub-phases */}
                    {!isCollapsed && subPhases.length > 0 && (
                      <div className="divide-y divide-gray-50">
                        {subPhases.map((phase) => (
                          <Link
                            key={phase.id}
                            href={`/projects/${id}/phases/${phase.id}`}
                            className="group flex items-center gap-3 px-5 py-3 hover:bg-blue-50/60 transition-colors"
                          >
                            <span className="w-5 flex-shrink-0 flex justify-center">
                              {statusIcon(phase.status)}
                            </span>

                            <span className="flex-1 min-w-0 text-sm text-gray-700 group-hover:text-blue-700 transition-colors truncate">
                              {phase.name}
                            </span>

                            <span className="text-[11px] font-mono text-gray-300 flex-shrink-0">
                              {phase.phase_code}
                            </span>

                            {phase.requirements_total != null && phase.requirements_total > 0 && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                  phase.requirements_met === phase.requirements_total
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {phase.requirements_met}/{phase.requirements_total}
                              </span>
                            )}

                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/*  4. BOTTOM CTA (if no phases)                                 */}
        {/* ============================================================ */}
        {phases.length === 0 && !phasesLoading && (
          <div className="pb-8 flex justify-center">
            <button
              onClick={() => initPhasesMutation.mutate()}
              disabled={initPhasesMutation.isPending}
              className="w-full max-w-lg py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:shadow-xl disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              {initPhasesMutation.isPending ? "工程を生成しています..." : "仕様書から工程を自動生成"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
