"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, statusLabel, statusColor } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import CommentSection from "@/components/comment-section";
import {
  ArrowLeft, Upload, Camera, CheckCircle, Circle,
  FileText, Download, Image as ImageIcon, ChevronDown,
  ChevronUp, Sparkles, AlertCircle,
} from "lucide-react";

interface Phase {
  id: string;
  name: string;
  phase_code: string | null;
  status: string;
}

interface Requirement {
  id: string;
  name: string;
  requirement_type: string;
  min_count: number;
  is_mandatory: boolean;
  fulfilled_count: number | null;
}

interface Photo {
  id: string;
  caption: string | null;
  original_filename: string | null;
  thumbnail_url: string | null;
  url: string | null;
  created_at: string;
}

interface SubmissionItem {
  id: string;
  title: string;
  status: string;
  download_url: string | null;
  phase_id?: string;
}

/* ---------- Progress Ring ---------- */
function ProgressRing({ percent }: { percent: number }) {
  const radius = 54;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setOffset(circumference - (percent / 100) * circumference);
    }, 100);
    return () => clearTimeout(timeout);
  }, [percent, circumference]);

  const color = percent >= 100 ? "#22c55e" : percent >= 50 ? "#3b82f6" : "#f59e0b";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={radius * 2} height={radius * 2} className="-rotate-90">
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{Math.round(percent)}%</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">達成率</span>
      </div>
    </div>
  );
}

/* ---------- Status Badge ---------- */
function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    in_progress: "bg-blue-100 text-blue-800 border-blue-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  const cls = colorMap[status] || statusColor(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border ${cls}`}>
      <span className={`w-2 h-2 rounded-full ${status === "completed" || status === "approved" ? "bg-green-500" : status === "in_progress" ? "bg-blue-500" : "bg-amber-500"}`} />
      {statusLabel(status)}
    </span>
  );
}

/* ---------- Main Page ---------- */
export default function PhaseDetailPage() {
  const { id, phaseId } = useParams<{ id: string; phaseId: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [expandedReq, setExpandedReq] = useState<string | null>(null);

  const { data: phase } = useQuery({
    queryKey: ["phase", phaseId],
    queryFn: () => apiFetch<Phase>(`/api/projects/${id}/phases/${phaseId}`, { token: token! }),
    enabled: !!token,
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ["checklist", phaseId],
    queryFn: () => apiFetch<Requirement[]>(`/api/projects/${id}/phases/${phaseId}/checklist`, { token: token! }),
    enabled: !!token,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["photos", id, phaseId],
    queryFn: () => apiFetch<Photo[]>(`/api/projects/${id}/photos?phase_id=${phaseId}`, { token: token! }),
    enabled: !!token,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["submissions", id],
    queryFn: () => apiFetch<SubmissionItem[]>(`/api/projects/${id}/submissions`, { token: token! }),
    enabled: !!token,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("phase_id", phaseId);
      if (selectedReq) formData.append("requirement_id", selectedReq);
      if (caption) formData.append("caption", caption);
      return apiFetch(`/api/projects/${id}/photos`, {
        token: token!,
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos", id, phaseId] });
      queryClient.invalidateQueries({ queryKey: ["checklist", phaseId] });
      queryClient.invalidateQueries({ queryKey: ["submissions", id] });
      setCaption("");
      setSelectedReq(null);
    },
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/projects/${id}/submissions/generate`, {
        token: token!,
        method: "POST",
        body: JSON.stringify({ phase_id: phaseId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions", id] });
    },
  });

  const mandatoryChecklist = checklist.filter((r) => r.is_mandatory);
  const metCount = mandatoryChecklist.filter(
    (r) => (r.fulfilled_count || 0) >= r.min_count
  ).length;
  const totalMandatory = mandatoryChecklist.length;
  const percent = totalMandatory > 0 ? (metCount / totalMandatory) * 100 : 0;
  const allMet = totalMandatory > 0 && metCount === totalMandatory;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  };

  if (!phase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pb-32">
      {/* Back link */}
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        工程一覧に戻る
      </Link>

      {/* ===== Phase Header ===== */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {phase.phase_code && (
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-mono font-medium">
                  {phase.phase_code}
                </span>
              )}
              <StatusBadge status={phase.status} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{phase.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              必須要件: {metCount}/{totalMandatory} 完了
            </p>
          </div>
          <div className="flex-shrink-0">
            <ProgressRing percent={percent} />
          </div>
        </div>
      </div>

      {/* ===== Auto-generation Banner ===== */}
      {allMet && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-green-800">
              全ての書類が揃いました！提出書類を生成できます
            </h3>
            <p className="text-sm text-green-600 mt-0.5">
              全ての必須要件が満たされています。提出書類を自動生成できます。
            </p>
          </div>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex-shrink-0 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold text-base shadow-lg shadow-green-200 hover:shadow-green-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            {generateMutation.isPending ? "生成中..." : "生成"}
          </button>
        </div>
      )}

      {/* ===== Checklist + Upload Grid ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            必要書類チェックリスト
          </h2>

          {checklist.length === 0 ? (
            <div className="text-center py-10">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">この工程に要件は定義されていません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checklist.map((req) => {
                const met = (req.fulfilled_count || 0) >= req.min_count;
                const isExpanded = expandedReq === req.id;
                const isPhoto = req.requirement_type === "photo";
                return (
                  <div key={req.id} className="rounded-xl overflow-hidden border border-gray-100">
                    <button
                      onClick={() => setExpandedReq(isExpanded ? null : req.id)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      {/* Left colored bar */}
                      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${met ? "bg-green-500" : "bg-gray-300"}`} />

                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${met ? "bg-green-100" : "bg-gray-100"}`}>
                        {isPhoto ? (
                          <Camera className={`w-5 h-5 ${met ? "text-green-600" : "text-gray-400"}`} />
                        ) : (
                          <FileText className={`w-5 h-5 ${met ? "text-green-600" : "text-gray-400"}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${met ? "text-green-800" : "text-gray-800"}`}>
                            {req.name}
                          </span>
                          {req.is_mandatory && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">必須</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {isPhoto ? "写真" : "書類"} / {req.requirement_type}
                        </span>
                      </div>

                      {/* Count badge */}
                      <div className={`flex items-center gap-2 ${met ? "text-green-600" : "text-gray-500"}`}>
                        <span className="text-sm font-semibold tabular-nums">
                          {req.fulfilled_count || 0}/{req.min_count}
                        </span>
                        {met ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300" />
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                        <div className="pt-3 text-xs text-gray-500 space-y-1">
                          <p>種別: {req.requirement_type}</p>
                          <p>必要枚数: {req.min_count}</p>
                          <p>充足数: {req.fulfilled_count || 0}</p>
                          <p>状態: {met ? "充足済み" : "未充足"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ===== Photo Upload Section ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Camera className="w-4 h-4 text-purple-600" />
            </div>
            写真アップロード
          </h2>

          <div className="space-y-4">
            {/* Step selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">書類区分を選択</label>
              <select
                value={selectedReq || ""}
                onChange={(e) => setSelectedReq(e.target.value || null)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              >
                <option value="">未分類</option>
                {checklist
                  .filter((r) => r.requirement_type === "photo")
                  .map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
              </select>
            </div>

            {/* Caption input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">説明</label>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                placeholder="写真の説明を入力..."
              />
            </div>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Large upload area */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-2xl py-10 hover:border-blue-400 hover:bg-blue-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="w-14 h-14 bg-gray-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors">
                <Upload className="w-7 h-7 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                  {uploadMutation.isPending ? "アップロード中..." : "タップして写真を選択"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">JPG, PNG に対応</p>
              </div>
            </button>

            {/* Camera button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-5 h-5" />
              カメラで撮影
            </button>

            {uploadMutation.isError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                アップロードに失敗しました
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== Photo Gallery ===== */}
      {photos.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-amber-600" />
            </div>
            工事写真
            <span className="ml-auto text-sm font-normal text-gray-400">{photos.length}枚</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <a
                key={photo.id}
                href={photo.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-gray-50 rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all"
              >
                {photo.thumbnail_url ? (
                  <img
                    src={photo.thumbnail_url}
                    alt={photo.caption || ""}
                    className="w-full h-36 md:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-36 md:h-40 bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-gray-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-2.5">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {photo.caption || photo.original_filename || "写真"}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ===== Submissions ===== */}
      {submissions.filter((s) => s.phase_id === phaseId).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
              <Download className="w-4 h-4 text-teal-600" />
            </div>
            生成済み書類
          </h2>
          <div className="space-y-2">
            {submissions
              .filter((s) => s.phase_id === phaseId)
              .map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{sub.title}</p>
                      <span className={`text-xs ${statusColor(sub.status)} px-2 py-0.5 rounded-full`}>
                        {statusLabel(sub.status)}
                      </span>
                    </div>
                  </div>
                  {sub.download_url && (
                    <a
                      href={sub.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      DL
                    </a>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ===== Comment Section ===== */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
        <CommentSection entityType="phase" entityId={phaseId} />
      </div>
    </div>
  );
}
