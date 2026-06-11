"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Camera,
  Shield,
  ClipboardList,
  Search,
  ChevronDown,
  Loader2,
  Sun,
  Sunrise,
  Moon,
  Layers,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";

interface ActivePhase {
  id: string;
  name: string;
  phase_code?: string | null;
}

interface WorkflowStep {
  order: number;
  key: "ky" | "photos" | "inspection" | "daily_report" | string;
  title: string;
  description: string;
  status: "done" | "todo" | string;
  action_url?: string;
  api_url?: string;
  count?: number;
  daily_report_status?: string | null;
}

interface ProjectWorkflow {
  project_id: string;
  project_name: string;
  project_code?: string | null;
  steps: WorkflowStep[];
  todo_count: number;
  done_count: number;
  total_steps: number;
  completion_percent: number;
  active_phases: ActivePhase[];
}

interface TodayData {
  date: string;
  day_of_week: string;
  projects: ProjectWorkflow[];
}

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour < 10)
    return { text: "おはようございます", icon: <Sunrise className="w-7 h-7 text-amber-300" /> };
  if (hour < 17)
    return { text: "お疲れさまです", icon: <Sun className="w-7 h-7 text-amber-300" /> };
  return { text: "お疲れさまでした", icon: <Moon className="w-7 h-7 text-gray-300" /> };
}

function formatJapaneseDate(dateStr?: string, dayOfWeek?: string): string {
  const now = dateStr ? new Date(dateStr) : new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const day = dayOfWeek ?? days[now.getDay()];
  return `${y}年${m}月${d}日 ${day}曜日`;
}

const stepConfig: Record<
  string,
  { icon: React.ReactNode; buttonLabel: string }
> = {
  ky: {
    icon: <Shield className="w-6 h-6" />,
    buttonLabel: "記録する",
  },
  photos: {
    icon: <Camera className="w-6 h-6" />,
    buttonLabel: "撮影する",
  },
  inspection: {
    icon: <Search className="w-6 h-6" />,
    buttonLabel: "対応する",
  },
  daily_report: {
    icon: <ClipboardList className="w-6 h-6" />,
    buttonLabel: "日報を書く",
  },
};

export default function TodayPage() {
  const { token } = useAuth();
  const _router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const greeting = getGreeting();

  const { data, isLoading } = useQuery<TodayData>({
    queryKey: ["today", selectedProjectId],
    queryFn: () =>
      apiFetch(
        `/api/today${selectedProjectId ? `?project_id=${selectedProjectId}` : ""}`,
        { token }
      ),
  });

  const projects = data?.projects ?? [];

  // Auto-select first project (effect で render 中の setState を回避)
  useEffect(() => {
    if (projects.length && !selectedProjectId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedProjectId(projects[0].project_id);
    }
  }, [projects, selectedProjectId]);

  const currentProject: ProjectWorkflow | undefined =
    projects.find((p) => p.project_id === selectedProjectId) ?? projects[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const steps = currentProject?.steps ?? [];
  const activePhases = currentProject?.active_phases ?? [];
  const todayPhotosCount =
    steps.find((s) => s.key === "photos")?.count ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Date Header */}
      <div className="bg-gray-900 px-6 pt-10 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            {greeting.icon}
            <span className="text-lg text-gray-300">{greeting.text}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">
            {formatJapaneseDate(data?.date, data?.day_of_week)}
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6 pb-8">
        {/* Project Selector */}
        {projects.length > 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-5 border border-gray-200">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
              プロジェクト
            </label>
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full appearance-none bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-lg font-semibold text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.project_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* No active project */}
        {projects.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-200">
            <p className="text-gray-700 font-semibold">
              本日対応する案件はありません
            </p>
            <p className="text-sm text-gray-500 mt-2">
              アクティブな案件が登録されると、ここに今日のワークフローが表示されます。
            </p>
          </div>
        )}

        {/* Workflow Steps Timeline */}
        {currentProject && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-5 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                  今日のワークフロー
                </h2>
                <p className="text-base font-bold text-gray-900 mt-1">
                  {currentProject.project_name}
                </p>
                {currentProject.project_code && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {currentProject.project_code}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {currentProject.completion_percent}%
                </div>
                <div className="text-xs text-gray-500">
                  {currentProject.done_count} / {currentProject.total_steps} 完了
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

              <div className="space-y-4">
                {steps.map((step, idx) => {
                  const config = stepConfig[step.key];
                  const isDone = step.status === "done";
                  const isCurrent =
                    !isDone &&
                    steps.findIndex((s) => s.status !== "done") === idx;
                  const stepKey = `${step.key}-${step.order}-${idx}`;

                  return (
                    <div
                      key={stepKey}
                      className={`relative flex items-center gap-4 p-4 rounded-2xl transition-all min-h-[80px] border ${
                        isCurrent
                          ? "bg-blue-50 border-blue-300 shadow-sm"
                          : isDone
                          ? "bg-gray-50 border-gray-200"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      {/* Step Number / Check */}
                      <div
                        className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isDone
                            ? "bg-emerald-600"
                            : isCurrent
                            ? "bg-blue-600"
                            : "bg-gray-400"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        ) : (
                          <span className="text-lg font-bold text-white">
                            {step.order}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-lg font-bold ${
                            isDone ? "text-gray-500" : "text-gray-900"
                          }`}
                        >
                          {step.title}
                        </h3>
                        <p
                          className={`text-sm mt-0.5 ${
                            isDone ? "text-gray-500" : "text-gray-700"
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>

                      {/* Action Button */}
                      {!isDone && step.action_url && (
                        <Link href={step.action_url} className="flex-shrink-0">
                          <button
                            type="button"
                            className="px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm rounded-xl shadow-sm active:scale-95 transition-all whitespace-nowrap inline-flex items-center gap-2"
                          >
                            {config?.icon}
                            {config?.buttonLabel ?? "対応する"}
                          </button>
                        </Link>
                      )}

                      {isDone && (
                        <div className="flex-shrink-0 px-4 py-2 text-emerald-600 text-sm font-bold">
                          完了
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Today's Stats */}
        {currentProject && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-lg p-5 text-center border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Camera className="w-6 h-6 text-gray-700" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {todayPhotosCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">撮影済み写真数</div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-5 text-center border border-gray-200">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Layers className="w-6 h-6 text-gray-700" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {activePhases.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">アクティブ工程</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
