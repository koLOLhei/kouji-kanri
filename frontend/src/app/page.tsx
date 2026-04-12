"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, statusLabel } from "@/lib/utils";
import {
  FolderKanban,
  Camera,
  FileText,
  CheckCircle2,
  ClipboardList,
  HardHat,
  ShieldCheck,
  Users,
  BookOpen,
  CalendarDays,
  Activity,
  ChevronRight,
  Plus,
  Bell,
  Search,
  Package,
  BarChart2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  project_code: string | null;
  client_name: string | null;
  status: string;
  phase_count: number | null;
  completed_phases: number | null;
}

const DAY_NAMES = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

function getTodayJP(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const day = DAY_NAMES[now.getDay()];
  return `${y}年${m}月${d}日 ${day}`;
}

function borderColorByStatus(status: string): string {
  switch (status) {
    case "active":
    case "in_progress":
      return "border-l-blue-500";
    case "inspection":
      return "border-l-amber-400";
    case "completed":
      return "border-l-emerald-500";
    case "planning":
      return "border-l-purple-400";
    default:
      return "border-l-gray-300";
  }
}

function progressBarColor(status: string): string {
  switch (status) {
    case "active":
    case "in_progress":
      return "from-blue-500 to-blue-400";
    case "inspection":
      return "from-amber-500 to-amber-400";
    case "completed":
      return "from-emerald-500 to-emerald-400";
    default:
      return "from-gray-400 to-gray-300";
  }
}

function statusBadge(status: string): string {
  switch (status) {
    case "active":
      return "bg-blue-100 text-blue-700 ring-blue-600/20";
    case "inspection":
      return "bg-amber-100 text-amber-700 ring-amber-600/20";
    case "completed":
      return "bg-emerald-100 text-emerald-700 ring-emerald-600/20";
    case "planning":
      return "bg-purple-100 text-purple-700 ring-purple-600/20";
    default:
      return "bg-gray-100 text-gray-600 ring-gray-500/20";
  }
}

// ── Feature groups ──────────────────────────────────────────────

type FeatureGroup = {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  gradient: string;
};

const DAILY_FEATURES: FeatureGroup[] = [
  {
    label: "日報",
    description: "毎日の作業内容を記録",
    icon: ClipboardList,
    href: "/projects",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    label: "写真撮影",
    description: "工事写真をその場で記録",
    icon: Camera,
    href: "/capture",
    gradient: "from-orange-500 to-orange-600",
  },
  {
    label: "安全管理",
    description: "KY・ヒヤリハット・巡回記録",
    icon: ShieldCheck,
    href: "/projects",
    gradient: "from-red-500 to-red-600",
  },
];

const PERIODIC_FEATURES: FeatureGroup[] = [
  {
    label: "検査管理",
    description: "段階確認・完成検査の記録",
    icon: Search,
    href: "/projects",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    label: "資材管理",
    description: "発注・受入・試験成績書",
    icon: Package,
    href: "/projects",
    gradient: "from-amber-500 to-amber-600",
  },
  {
    label: "出来形管理",
    description: "完成部分の寸法・品質を記録",
    icon: BarChart2,
    href: "/projects",
    gradient: "from-teal-500 to-teal-600",
  },
];

const OCCASIONAL_FEATURES: FeatureGroup[] = [
  {
    label: "案件管理",
    description: "工事案件の一覧と作成",
    icon: FolderKanban,
    href: "/projects",
    gradient: "from-indigo-500 to-indigo-600",
  },
  {
    label: "作業員管理",
    description: "人員・資格・出勤を管理",
    icon: Users,
    href: "/workers",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    label: "仕様書",
    description: "公共建築工事標準仕様書を参照",
    icon: BookOpen,
    href: "/specs",
    gradient: "from-teal-500 to-teal-600",
  },
  {
    label: "是正措置",
    description: "品質不適合・NCRの管理",
    icon: AlertTriangle,
    href: "/projects",
    gradient: "from-amber-500 to-amber-600",
  },
];

function FeatureCard({ feature }: { feature: FeatureGroup }) {
  const Icon = feature.icon;
  return (
    <Link
      href={feature.href}
      className="group flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all active:scale-[0.98]"
    >
      <div
        className={`bg-gradient-to-br ${feature.gradient} p-2.5 rounded-xl shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
          {feature.label}
        </p>
        <p className="text-xs text-gray-400 truncate">{feature.description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0 ml-auto" />
    </Link>
  );
}

// ── Today's tasks ────────────────────────────────────────────────

interface TodayTask {
  label: string;
  actionLabel: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

function getTodayTasks(
  projects: Project[],
  approvalCount: number
): TodayTask[] {
  const tasks: TodayTask[] = [];
  const activeProject = projects.find((p) => p.status === "active");

  // Daily report not yet submitted (heuristic: show for active projects)
  if (activeProject) {
    tasks.push({
      label: "今日の日報がまだ提出されていません",
      actionLabel: "日報を書く",
      href: `/projects/${activeProject.id}/daily-reports`,
      icon: FileText,
      color: "text-blue-600 bg-blue-50",
    });
  }

  // Approval items pending
  if (approvalCount > 0) {
    tasks.push({
      label: `${approvalCount}件の承認待ちがあります`,
      actionLabel: "承認する",
      href: "/approval",
      icon: Bell,
      color: "text-amber-600 bg-amber-50",
    });
  }

  // Photo reminder if active project with phases
  if (activeProject && (activeProject.phase_count ?? 0) > 0) {
    tasks.push({
      label: "工事写真を撮影・記録しましょう",
      actionLabel: "写真を撮る",
      href: `/capture?project=${activeProject.id}`,
      icon: Camera,
      color: "text-orange-600 bg-orange-50",
    });
  }

  return tasks;
}

export default function DashboardPage() {
  const { token } = useAuth();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<Project[]>("/api/projects", { token: token! }),
    enabled: !!token,
  });

  const { data: approvalQueue = [] } = useQuery<unknown[]>({
    queryKey: ["approval-queue"],
    queryFn: () =>
      apiFetch<unknown[]>("/api/approval-queue", { token: token! }),
    enabled: !!token,
  });

  const active = projects.filter((p) => p.status === "active").length;
  const inspection = projects.filter((p) => p.status === "inspection").length;
  const completed = projects.filter((p) => p.status === "completed").length;

  const stats = [
    {
      label: "総案件数",
      value: projects.length,
      icon: FolderKanban,
      gradient: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50",
      text: "text-blue-700",
    },
    {
      label: "施工中",
      value: active,
      icon: HardHat,
      gradient: "from-orange-500 to-amber-600",
      bg: "bg-orange-50",
      text: "text-orange-700",
    },
    {
      label: "検査予定",
      value: inspection,
      icon: ClipboardList,
      gradient: "from-yellow-500 to-amber-500",
      bg: "bg-yellow-50",
      text: "text-yellow-700",
    },
    {
      label: "完了",
      value: completed,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-green-600",
      bg: "bg-green-50",
      text: "text-green-700",
    },
  ];

  const activeProjects = projects.filter(
    (p) => p.status !== "completed" && p.status !== "deleted"
  );
  const todayTasks = getTodayTasks(projects, approvalQueue.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">

        {/* ─── Today's Summary Bar ─── */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl shadow-lg shadow-blue-500/20 p-5 sm:p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="w-5 h-5 opacity-80" />
                <span className="text-blue-200 text-sm font-medium">本日</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {getTodayJP()}
              </h1>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/projects"
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-5 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 border border-white/20"
              >
                <FileText className="w-5 h-5" />
                <span>今日の日報を書く</span>
              </Link>
              <Link
                href="/capture"
                className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-amber-900 px-5 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 shadow-lg shadow-amber-400/30"
              >
                <Camera className="w-5 h-5" />
                <span>写真を撮る</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ─── 今日やること ─── */}
        {todayTasks.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-red-500" />
              <h2 className="text-base font-bold text-gray-900">今日やること</h2>
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {todayTasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {todayTasks.map((task) => {
                const Icon = task.icon;
                return (
                  <div
                    key={task.label}
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${task.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="flex-1 text-sm text-gray-700 font-medium">{task.label}</p>
                    <Link
                      href={task.href}
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
                    >
                      {task.actionLabel}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Stats Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`bg-gradient-to-br ${s.gradient} p-2.5 rounded-xl shadow-sm`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                {s.value}
              </p>
              <p className={`text-sm font-medium mt-1 ${s.text}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ─── Feature Groups ─── */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* 毎日 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📅</span>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">毎日の業務</h2>
            </div>
            <div className="space-y-2">
              {DAILY_FEATURES.map((f) => (
                <FeatureCard key={f.label} feature={f} />
              ))}
            </div>
          </section>

          {/* 定期 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📊</span>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">定期業務</h2>
            </div>
            <div className="space-y-2">
              {PERIODIC_FEATURES.map((f) => (
                <FeatureCard key={f.label} feature={f} />
              ))}
            </div>
          </section>

          {/* 必要時 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔧</span>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">必要時</h2>
            </div>
            <div className="space-y-2">
              {OCCASIONAL_FEATURES.map((f) => (
                <FeatureCard key={f.label} feature={f} />
              ))}
            </div>
          </section>
        </div>

        {/* ─── Active Projects ─── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">進行中の案件</h2>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {activeProjects.length}
              </span>
            </div>
            <Link
              href="/projects"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
            >
              すべて見る
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeProjects.slice(0, 9).map((project) => {
              const total = project.phase_count || 0;
              const done = project.completed_phases || 0;
              const progress = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={`group block bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${borderColorByStatus(project.status)} hover:shadow-md hover:border-gray-200 transition-all overflow-hidden`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-700 transition-colors truncate">
                          {project.name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {project.project_code && (
                            <span className="font-mono">{project.project_code}</span>
                          )}
                          {project.project_code && project.client_name && " | "}
                          {project.client_name || ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${statusBadge(project.status)}`}
                      >
                        {statusLabel(project.status)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">進捗</span>
                        <span className="font-bold text-gray-700">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${progressBarColor(project.status)} transition-all duration-500`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {done}/{total} 工程完了
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Empty state */}
          {activeProjects.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FolderKanban className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-1">進行中の案件はありません</h3>
              <p className="text-sm text-gray-400 mb-4">新しい案件を作成して始めましょう</p>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                案件を作成する
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
