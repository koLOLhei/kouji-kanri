"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ChevronRight,
  Loader2,
  TrendingUp,
  FileText,
  ClipboardList,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";

interface HealthData {
  average_score: number;
  projects: ProjectHealth[];
}

interface ProjectHealth {
  id: string;
  name: string;
  code: string;
  score: number;
  progress_percent: number;
  document_rate: number;
  open_ncr_count: number;
  daily_report_today: boolean;
  next_inspection_date: string | null;
}

interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  project_name: string;
  project_id: string;
  days_until: number;
  action_link: string;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function scoreRing(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function severityConfig(severity: string) {
  switch (severity) {
    case "critical":
      return {
        dot: "bg-red-500",
        bg: "bg-red-50",
        border: "border-red-200",
        icon: <AlertCircle className="w-4 h-4 text-red-500" />,
      };
    case "warning":
      return {
        dot: "bg-amber-500",
        bg: "bg-amber-50",
        border: "border-amber-200",
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      };
    default:
      return {
        dot: "bg-blue-500",
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: <Info className="w-4 h-4 text-blue-500" />,
      };
  }
}

export default function ProjectHealthPage() {
  const { token } = useAuth();

  const { data: health, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ["project-health"],
    queryFn: () => apiFetch("/api/project-health", { token: token! }),
    enabled: !!token,
  });

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: () => apiFetch("/api/alerts?days=14", { token: token! }),
    enabled: !!token,
  });

  const avgScore = health?.average_score ?? 0;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (avgScore / 100) * circumference;

  const criticalCount =
    alerts?.filter((a) => a.severity === "critical").length ?? 0;
  const warningCount =
    alerts?.filter((a) => a.severity === "warning").length ?? 0;

  // Sort projects by score ascending (worst first)
  const sortedProjects = [...(health?.projects ?? [])].sort(
    (a, b) => a.score - b.score
  );

  if (healthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-7 h-7" />
            プロジェクトヘルス
          </h1>
          <p className="text-teal-100 mt-1">全プロジェクトの健全性を一覧で把握</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-6 pb-8">
        {/* Average Score + Alert Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Average Score Ring */}
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="10"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    fill="none"
                    stroke={scoreRing(avgScore)}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${scoreColor(avgScore)}`}>
                    {avgScore}
                  </span>
                  <span className="text-xs text-gray-400">平均スコア</span>
                </div>
              </div>
            </div>

            {/* Alert Summary */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-600">
                    {criticalCount}
                  </div>
                  <div className="text-sm text-red-400">重大アラート</div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-600">
                    {warningCount}
                  </div>
                  <div className="text-sm text-amber-400">警告</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Cards */}
        <h2 className="text-lg font-bold text-gray-800 mb-4 px-1 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-500" />
          プロジェクト一覧
          <span className="text-sm font-normal text-gray-400">
            (スコア順)
          </span>
        </h2>

        <div className="space-y-4 mb-8">
          {sortedProjects.map((project) => {
            const miniCircumference = 2 * Math.PI * 18;
            const miniOffset =
              miniCircumference - (project.score / 100) * miniCircumference;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block"
              >
                <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all p-5 group">
                  <div className="flex items-center gap-5">
                    {/* Health Score Mini Ring */}
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <svg
                        className="w-14 h-14 -rotate-90"
                        viewBox="0 0 48 48"
                      >
                        <circle
                          cx="24"
                          cy="24"
                          r="18"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="4"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="18"
                          fill="none"
                          stroke={scoreRing(project.score)}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={miniCircumference}
                          strokeDashoffset={miniOffset}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className={`text-sm font-bold ${scoreColor(
                            project.score
                          )}`}
                        >
                          {project.score}
                        </span>
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                          {project.code}
                        </span>
                        <h3 className="font-bold text-gray-800 truncate">
                          {project.name}
                        </h3>
                      </div>

                      {/* Mini Indicators */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{
                                width: `${project.progress_percent}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            工程{project.progress_percent}%
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            書類{project.document_rate}%
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <AlertTriangle
                            className={`w-3.5 h-3.5 ${
                              project.open_ncr_count > 0
                                ? "text-red-400"
                                : "text-gray-300"
                            }`}
                          />
                          <span
                            className={`text-xs ${
                              project.open_ncr_count > 0
                                ? "text-red-500 font-bold"
                                : "text-gray-400"
                            }`}
                          >
                            NCR {project.open_ncr_count}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {project.daily_report_today ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <ClipboardList className="w-3.5 h-3.5 text-gray-300" />
                          )}
                          <span
                            className={`text-xs ${
                              project.daily_report_today
                                ? "text-emerald-500"
                                : "text-gray-400"
                            }`}
                          >
                            日報
                          </span>
                        </div>
                      </div>

                      {/* Next Inspection */}
                      {project.next_inspection_date && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-xs text-purple-500">
                            次回検査: {formatDate(project.next_inspection_date)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Alerts Section */}
        {alerts && alerts.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4 px-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              アラート一覧
              <span className="text-sm font-normal text-gray-400">
                (直近14日)
              </span>
            </h2>

            <div className="space-y-3">
              {alerts
                .sort((a, b) => {
                  const order = { critical: 0, warning: 1, info: 2 };
                  return (
                    (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
                  );
                })
                .map((alert) => {
                  const config = severityConfig(alert.severity);

                  return (
                    <Link
                      key={alert.id}
                      href={alert.action_link}
                      className="block"
                    >
                      <div
                        className={`${config.bg} border ${config.border} rounded-2xl p-4 hover:shadow-md transition-all group`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">{config.icon}</div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 text-sm">
                              {alert.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {alert.project_name}
                              </span>
                              {alert.days_until > 0 && (
                                <>
                                  <span className="text-xs text-gray-300">
                                    |
                                  </span>
                                  <span
                                    className={`text-xs font-bold ${
                                      alert.days_until <= 3
                                        ? "text-red-500"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {alert.days_until}日後
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
