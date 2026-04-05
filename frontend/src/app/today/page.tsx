"use client";

import { useState } from "react";
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
  Image,
  Layers,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";

interface TodayData {
  projects: { id: string; name: string }[];
  steps: WorkflowStep[];
  stats: {
    photos_taken: number;
    active_phases: number;
  };
}

interface WorkflowStep {
  id: string;
  number: number;
  title: string;
  description: string;
  status: "done" | "current" | "upcoming";
  type: "ky" | "photo" | "inspection" | "daily_report";
  link: string;
}

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour < 10)
    return { text: "おはようございます", icon: <Sunrise className="w-7 h-7 text-amber-400" /> };
  if (hour < 17)
    return { text: "お疲れさまです", icon: <Sun className="w-7 h-7 text-yellow-400" /> };
  return { text: "お疲れさまでした", icon: <Moon className="w-7 h-7 text-indigo-300" /> };
}

function formatJapaneseDate(): string {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const day = days[now.getDay()];
  return `${y}年${m}月${d}日 ${day}曜日`;
}

const stepConfig: Record<
  string,
  { icon: React.ReactNode; color: string; buttonLabel: string }
> = {
  ky: {
    icon: <Shield className="w-6 h-6" />,
    color: "from-orange-500 to-orange-600",
    buttonLabel: "記録する",
  },
  photo: {
    icon: <Camera className="w-6 h-6" />,
    color: "from-blue-500 to-blue-600",
    buttonLabel: "撮影する",
  },
  inspection: {
    icon: <Search className="w-6 h-6" />,
    color: "from-purple-500 to-purple-600",
    buttonLabel: "対応する",
  },
  daily_report: {
    icon: <ClipboardList className="w-6 h-6" />,
    color: "from-emerald-500 to-emerald-600",
    buttonLabel: "日報を書く",
  },
};

export default function TodayPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<string>("");

  const greeting = getGreeting();

  const { data, isLoading } = useQuery<TodayData>({
    queryKey: ["today", selectedProject],
    queryFn: () =>
      apiFetch(
        `/api/today${selectedProject ? `?project_id=${selectedProject}` : ""}`,
        { token }
      ),
  });

  // Auto-select first project
  if (data?.projects.length && !selectedProject) {
    setSelectedProject(data.projects[0].id);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      {/* Date Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 pt-10 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            {greeting.icon}
            <span className="text-lg text-blue-100">{greeting.text}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">
            {formatJapaneseDate()}
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6 pb-8">
        {/* Project Selector */}
        {(data?.projects.length ?? 0) > 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
              プロジェクト
            </label>
            <div className="relative">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full appearance-none bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-lg font-semibold text-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
              >
                {data?.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Workflow Steps Timeline */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-5">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-6">
            今日のワークフロー
          </h2>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-4">
              {data?.steps.map((step, idx) => {
                const config = stepConfig[step.type];
                const isDone = step.status === "done";
                const isCurrent = step.status === "current";

                return (
                  <div
                    key={step.id}
                    className={`relative flex items-center gap-4 p-4 rounded-2xl transition-all min-h-[80px] ${
                      isCurrent
                        ? "bg-blue-50 border-2 border-blue-300 shadow-md"
                        : isDone
                        ? "bg-gray-50 opacity-75"
                        : "bg-white"
                    }`}
                  >
                    {/* Step Number / Check */}
                    <div
                      className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isDone
                          ? "bg-emerald-500"
                          : isCurrent
                          ? "bg-blue-500"
                          : "bg-gray-300"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      ) : (
                        <span className="text-lg font-bold text-white">
                          {step.number}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-lg font-bold ${
                          isDone ? "text-gray-400 line-through" : "text-gray-800"
                        }`}
                      >
                        {step.title}
                      </h3>
                      <p
                        className={`text-sm mt-0.5 ${
                          isDone ? "text-gray-300" : "text-gray-500"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>

                    {/* Action Button */}
                    {!isDone && (
                      <Link href={step.link} className="flex-shrink-0">
                        <button
                          className={`px-5 py-3 bg-gradient-to-r ${config.color} text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all whitespace-nowrap`}
                        >
                          {config.buttonLabel}
                        </button>
                      </Link>
                    )}

                    {isDone && (
                      <div className="flex-shrink-0 px-4 py-2 text-emerald-500 text-sm font-bold">
                        完了
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Image className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {data?.stats.photos_taken ?? 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">撮影済み写真数</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {data?.stats.active_phases ?? 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">アクティブ工程</div>
          </div>
        </div>
      </div>
    </div>
  );
}
