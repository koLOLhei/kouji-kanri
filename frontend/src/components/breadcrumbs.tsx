"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ChevronRight } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  "": "ダッシュボード",
  projects: "案件一覧",
  "daily-reports": "日報",
  safety: "安全管理",
  "quick-report": "簡易報告",
  orientation: "入場教育",
  documents: "書類管理",
  schedule: "工程表",
  "design-changes": "設計変更",
  costs: "原価管理",
  materials: "資材管理",
  inspections: "検査管理",
  drawings: "図面管理",
  calendar: "カレンダー",
  meetings: "打合せ",
  measurements: "出来形",
  waste: "廃棄物",
  "corrective-actions": "是正措置",
  contracts: "下請管理",
  phases: "工程",
  workers: "作業員一覧",
  subcontractors: "協力業者",
  equipment: "車両・重機",
  settings: "設定",
  admin: "管理",
  tenants: "テナント管理",
  "audit-logs": "監査ログ",
  capture: "写真撮影",
  specs: "仕様書",
  search: "検索",
  notifications: "通知",
  today: "今日のタスク",
  health: "プロジェクトヘルス",
  approval: "承認待ち",
  login: "ログイン",
};

function labelForSegment(segment: string, index: number, segments: string[]): string {
  // If segment is a UUID/ID (dynamic segment), try to give a contextual label
  const isId = /^[0-9a-f-]{8,}$/i.test(segment) || /^\d+$/.test(segment);
  if (isId) {
    // Look at previous segment to provide context
    const prev = segments[index - 1];
    if (prev === "projects") return "案件詳細";
    if (prev === "phases") return "工程詳細";
    if (prev === "workers") return "作業員詳細";
    if (prev === "tenants") return "テナント詳細";
    return "詳細";
  }
  return ROUTE_LABELS[segment] ?? segment;
}

export function Breadcrumbs() {
  const pathname = usePathname();

  // Don't show on login page
  if (pathname === "/login") return null;

  const segments = pathname.split("/").filter(Boolean);

  // Build crumb list
  type Crumb = { label: string; href: string };
  const crumbs: Crumb[] = [{ label: "ダッシュボード", href: "/" }];

  segments.forEach((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = labelForSegment(seg, i, segments);
    crumbs.push({ label, href });
  });

  // Only show if we're not at root
  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="パンくずリスト"
      className="flex items-center gap-1 text-xs text-gray-500 px-4 sm:px-6 py-2 bg-white border-b border-gray-100 overflow-x-auto"
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1 whitespace-nowrap">
            {i === 0 ? (
              <Link
                href={crumb.href}
                className="flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="sr-only">ダッシュボード</span>
              </Link>
            ) : isLast ? (
              <span className="font-medium text-gray-800" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-gray-400 hover:text-blue-600 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
            {!isLast && (
              <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
            )}
          </span>
        );
      })}
    </nav>
  );
}
