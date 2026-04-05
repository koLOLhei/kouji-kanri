"use client";

import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import Link from "next/link";

export interface NextStepConfig {
  message: string;
  actionLabel: string;
  actionHref: string;
  gradient?: string;
}

interface NextStepBannerProps {
  config: NextStepConfig | null;
  sessionKey?: string; // unique key per suggestion so it can be dismissed per session
}

const SESSION_DISMISSED_KEY = "next_step_dismissed";

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function setDismissed(keys: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_DISMISSED_KEY, JSON.stringify([...keys]));
  } catch {
    // ignore
  }
}

export function NextStepBanner({ config, sessionKey }: NextStepBannerProps) {
  const key = sessionKey ?? (config?.message ?? "");
  const alreadyDismissed = getDismissed().has(key);
  const [dismissed, setDismissedState] = useState(alreadyDismissed);

  if (!config || dismissed) return null;

  function dismiss() {
    const current = getDismissed();
    current.add(key);
    setDismissed(current);
    setDismissedState(true);
  }

  const gradient = config.gradient ?? "from-blue-600 to-indigo-600";

  return (
    <div
      className={`bg-gradient-to-r ${gradient} rounded-2xl shadow-lg shadow-blue-500/20 p-4 sm:p-5 text-white flex items-center gap-4`}
      role="alert"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm sm:text-base font-semibold leading-snug">{config.message}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href={config.actionHref}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 border border-white/20 whitespace-nowrap"
        >
          {config.actionLabel}
          <ArrowRight className="w-4 h-4" />
        </Link>
        <button
          onClick={dismiss}
          aria-label="閉じる"
          className="text-white/60 hover:text-white transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Predefined configs for common contexts
export const NEXT_STEP_CONFIGS = {
  noPhases: (projectId: string): NextStepConfig => ({
    message: "工程がまだ登録されていません。仕様書から工程を自動生成しましょう。",
    actionLabel: "工程を生成する",
    actionHref: `/projects/${projectId}`,
    gradient: "from-blue-600 to-indigo-600",
  }),
  noPhotos: (projectId: string, phaseId: string): NextStepConfig => ({
    message: "この工程の写真がまだ撮影されていません。写真を記録しましょう。",
    actionLabel: "写真を撮る",
    actionHref: `/capture?project=${projectId}&phase=${phaseId}`,
    gradient: "from-orange-500 to-amber-600",
  }),
  allRequirementsMet: (projectId: string): NextStepConfig => ({
    message: "すべての要件が揃っています！書類を生成できます。",
    actionLabel: "書類を生成する",
    actionHref: `/projects/${projectId}/documents`,
    gradient: "from-emerald-500 to-green-600",
  }),
  noDailyReport: (projectId: string): NextStepConfig => ({
    message: "今日の日報をまだ提出していません。作業内容を記録しましょう。",
    actionLabel: "日報を書く",
    actionHref: `/projects/${projectId}/daily-reports`,
    gradient: "from-purple-500 to-indigo-600",
  }),
};
