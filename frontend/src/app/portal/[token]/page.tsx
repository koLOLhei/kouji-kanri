"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import {
  Building2,
  Camera,
  CalendarDays,
  CheckCircle2,
  Clock,
  CloudSun,
  FileText,
  HardHat,
  TrendingUp,
  Users,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface PortalData {
  project_name: string;
  contractor_name: string;
  contractor_logo_url: string | null;
  welcome_message: string;
  progress_percent: number;
  current_phase: string;
  phase_stats: { name: string; progress: number; status: string }[];
  show_photos: boolean;
  show_daily_reports: boolean;
  show_inspections: boolean;
  last_updated: string;
}

interface TimelineItem {
  id: string;
  type: "daily_report" | "photo" | "inspection";
  title: string;
  description: string;
  created_at: string;
}

interface PortalPhoto {
  id: string;
  thumbnail_url: string;
  caption: string;
  taken_at: string;
}

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [activeTab, setActiveTab] = useState<"timeline" | "photos" | "reports" | "inspections">("timeline");

  const { data: portal, isLoading, isError } = useQuery<PortalData>({
    queryKey: ["portal", token],
    queryFn: () => apiFetch(`/api/portal/${token}`),
  });

  const { data: timeline = [] } = useQuery<TimelineItem[]>({
    queryKey: ["portal-timeline", token],
    queryFn: () => apiFetch(`/api/portal/${token}/timeline`),
  });

  const { data: photos = [] } = useQuery<PortalPhoto[]>({
    queryKey: ["portal-photos", token],
    queryFn: () => apiFetch(`/api/portal/${token}/photos`),
    enabled: !!portal?.show_photos,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (isError || !portal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md mx-4">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            ページが見つかりません
          </h2>
          <p className="text-gray-500">
            このリンクは無効か、期限切れの可能性があります。施工業者にお問い合わせください。
          </p>
        </div>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 70;
  const dashOffset = circumference - (portal.progress_percent / 100) * circumference;

  const timelineIcon = (type: string) => {
    switch (type) {
      case "daily_report": return <FileText className="w-4 h-4 text-blue-500" />;
      case "photo": return <Camera className="w-4 h-4 text-green-500" />;
      case "inspection": return <CheckCircle2 className="w-4 h-4 text-orange-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            {portal.contractor_logo_url ? (
              <img
                src={portal.contractor_logo_url}
                alt={portal.contractor_name}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {portal.project_name}
              </h1>
              <p className="text-sm text-gray-500">
                {portal.contractor_name} | 工事進捗ポータル
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Message */}
        {portal.welcome_message && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-200/50">
            <p className="text-lg leading-relaxed">{portal.welcome_message}</p>
          </div>
        )}

        {/* Progress Section */}
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            工事進捗
          </h2>

          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Progress Ring */}
            <div className="relative flex-shrink-0">
              <svg width="180" height="180" className="transform -rotate-90">
                <circle
                  cx="90"
                  cy="90"
                  r="70"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="90"
                  cy="90"
                  r="70"
                  stroke="url(#progressGradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-gray-900">
                  {portal.progress_percent}
                </span>
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>

            {/* Phase Stats */}
            <div className="flex-1 w-full space-y-3">
              <p className="text-sm text-gray-500 mb-2">
                現在の工程: <span className="font-medium text-gray-800">{portal.current_phase}</span>
              </p>
              {portal.phase_stats.map((phase) => (
                <div key={phase.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{phase.name}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {phase.progress}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        phase.status === "completed"
                          ? "bg-gradient-to-r from-green-400 to-emerald-500"
                          : phase.status === "active"
                            ? "bg-gradient-to-r from-blue-400 to-indigo-500"
                            : "bg-gray-300"
                      }`}
                      style={{ width: `${phase.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white rounded-xl p-1.5 shadow-sm">
          {[
            { key: "timeline" as const, label: "タイムライン", icon: Clock },
            ...(portal.show_photos ? [{ key: "photos" as const, label: "写真", icon: Camera }] : []),
            ...(portal.show_daily_reports ? [{ key: "reports" as const, label: "日報", icon: FileText }] : []),
            ...(portal.show_inspections ? [{ key: "inspections" as const, label: "検査", icon: CheckCircle2 }] : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timeline Tab */}
        {activeTab === "timeline" && (
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-6">最近の活動</h2>
            {timeline.length === 0 ? (
              <p className="text-gray-400 text-center py-8">活動記録がありません</p>
            ) : (
              <div className="relative">
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-200" />
                <div className="space-y-6">
                  {timeline.map((item) => (
                    <div key={item.id} className="flex gap-4 relative">
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0 z-10">
                        {timelineIcon(item.type)}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-800">
                            {item.title}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === "photos" && portal.show_photos && (
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Camera className="w-5 h-5 text-green-600" />
              工事写真
            </h2>
            {photos.length === 0 ? (
              <p className="text-gray-400 text-center py-8">写真がありません</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.slice(0, 12).map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-lg transition-shadow"
                  >
                    <img
                      src={photo.thumbnail_url}
                      alt={photo.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-xs font-medium truncate">
                          {photo.caption}
                        </p>
                        <p className="text-white/70 text-xs">
                          {formatDate(photo.taken_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Daily Reports Tab */}
        {activeTab === "reports" && portal.show_daily_reports && (
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              日報
            </h2>
            {timeline.filter((i) => i.type === "daily_report").length === 0 ? (
              <p className="text-gray-400 text-center py-8">日報がありません</p>
            ) : (
              <div className="space-y-4">
                {timeline
                  .filter((i) => i.type === "daily_report")
                  .slice(0, 7)
                  .map((report) => (
                    <div
                      key={report.id}
                      className="border border-gray-100 rounded-xl p-5 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-800">
                          {formatDate(report.created_at)}
                        </span>
                        <CloudSun className="w-4 h-4 text-yellow-500 ml-2" />
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">
                        {report.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {report.description}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Inspections Tab */}
        {activeTab === "inspections" && portal.show_inspections && (
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-orange-600" />
              検査状況
            </h2>
            {timeline.filter((i) => i.type === "inspection").length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                検査記録がありません
              </p>
            ) : (
              <div className="space-y-3">
                {timeline
                  .filter((i) => i.type === "inspection")
                  .map((insp) => (
                    <div
                      key={insp.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <HardHat className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {insp.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {insp.description}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-gray-500">
                          {formatDate(insp.created_at)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-gray-200/50 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400">
            <p>Powered by 工事管理SaaS</p>
            <p>
              最終更新:{" "}
              {portal.last_updated
                ? new Date(portal.last_updated).toLocaleString("ja-JP")
                : "-"}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
