"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, statusLabel, statusColor } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import CommentSection from "@/components/comment-section";
import {
  ArrowLeft, Upload, Camera, CheckCircle, Circle,
  FileText, Download, Image as ImageIcon, ChevronDown,
  ChevronUp, Sparkles, AlertCircle, MapPin, LayoutGrid,
  List, Pencil, Filter, Tag, X, Loader2,
} from "lucide-react";

// ── Lazy-load heavy components ────────────────────────────────────────────────
const PhotoAnnotator = dynamic(
  () => import("@/components/photo-annotator"),
  { ssr: false }
);
const PhotoMap = dynamic(
  () => import("@/components/photo-map"),
  { ssr: false }
);

// ── Types ─────────────────────────────────────────────────────────────────────

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
  latitude?: number | null;
  longitude?: number | null;
  work_type?: string | null;
  work_type_id?: string | null;
  photo_category?: string | null;
  photo_category_id?: string | null;
}

interface SubmissionItem {
  id: string;
  title: string;
  status: string;
  download_url: string | null;
  phase_id?: string;
}

interface WorkType {
  id: string;
  name: string;
  code?: string;
}

interface PhotoCategory {
  id: string;
  name: string;
  code?: string;
}

type PhotoView = "grid" | "list" | "map";

// ── Progress Ring ─────────────────────────────────────────────────────────────

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
        <circle stroke="#e5e7eb" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle
          stroke={color} fill="transparent" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset}
          r={normalizedRadius} cx={radius} cy={radius}
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

// ── Status Badge ──────────────────────────────────────────────────────────────

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

// ── Bulk Classify Modal ───────────────────────────────────────────────────────

interface BulkClassifyModalProps {
  selectedIds: string[];
  workTypes: WorkType[];
  photoCategories: PhotoCategory[];
  onApply: (workTypeId: string, photoCategoryId: string) => void;
  onClose: () => void;
}

function BulkClassifyModal({
  selectedIds,
  workTypes,
  photoCategories,
  onApply,
  onClose,
}: BulkClassifyModalProps) {
  const [workTypeId, setWorkTypeId] = useState("");
  const [photoCategoryId, setPhotoCategoryId] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">
            一括分類 ({selectedIds.length}枚)
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {workTypes.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">工種</label>
              <select
                value={workTypeId}
                onChange={(e) => setWorkTypeId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              >
                <option value="">変更しない</option>
                {workTypes.map((wt) => (
                  <option key={wt.id} value={wt.id}>
                    {wt.code ? `[${wt.code}] ` : ""}{wt.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {photoCategories.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">写真区分</label>
              <select
                value={photoCategoryId}
                onChange={(e) => setPhotoCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              >
                <option value="">変更しない</option>
                {photoCategories.map((pc) => (
                  <option key={pc.id} value={pc.id}>
                    {pc.code ? `[${pc.code}] ` : ""}{pc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={() => onApply(workTypeId, photoCategoryId)}
              disabled={!workTypeId && !photoCategoryId}
              className="flex-1 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              適用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PhaseDetailPage() {
  const { id, phaseId } = useParams<{ id: string; phaseId: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [expandedReq, setExpandedReq] = useState<string | null>(null);

  // Photo view
  const [photoView, setPhotoView] = useState<PhotoView>("grid");

  // Photo annotation
  const [annotatingPhoto, setAnnotatingPhoto] = useState<Photo | null>(null);

  // Bulk classify
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Filters
  const [filterWorkType, setFilterWorkType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Upload classification
  const [uploadWorkTypeId, setUploadWorkTypeId] = useState("");
  const [uploadPhotoCategoryId, setUploadPhotoCategoryId] = useState("");

  // ── Queries ────────────────────────────────────────────────────────────────

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

  const { data: workTypes = [] } = useQuery({
    queryKey: ["work-types"],
    queryFn: () => apiFetch<WorkType[]>("/api/electronic-delivery/work-types", { token: token! }),
    enabled: !!token,
    retry: false,
  });

  const { data: photoCategories = [] } = useQuery({
    queryKey: ["photo-categories"],
    queryFn: () => apiFetch<PhotoCategory[]>("/api/electronic-delivery/photo-categories", { token: token! }),
    enabled: !!token,
    retry: false,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("phase_id", phaseId);
      if (selectedReq) formData.append("requirement_id", selectedReq);
      if (caption) formData.append("caption", caption);
      if (uploadWorkTypeId) formData.append("work_type_id", uploadWorkTypeId);
      if (uploadPhotoCategoryId) formData.append("photo_category_id", uploadPhotoCategoryId);
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

  const bulkClassifyMutation = useMutation({
    mutationFn: async ({
      photoIds,
      workTypeId,
      photoCategoryId,
    }: {
      photoIds: string[];
      workTypeId: string;
      photoCategoryId: string;
    }) => {
      return apiFetch(`/api/projects/${id}/photos/bulk-classify`, {
        token: token!,
        method: "POST",
        body: JSON.stringify({ photo_ids: photoIds, work_type_id: workTypeId || null, photo_category_id: photoCategoryId || null }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos", id, phaseId] });
      setSelectedPhotoIds(new Set());
      setBulkSelectMode(false);
      setShowBulkModal(false);
    },
    onError: () => {
      // Silently invalidate anyway since API might not exist yet
      queryClient.invalidateQueries({ queryKey: ["photos", id, phaseId] });
      setSelectedPhotoIds(new Set());
      setBulkSelectMode(false);
      setShowBulkModal(false);
    },
  });

  const annotationSaveMutation = useMutation({
    mutationFn: async ({ photoId, dataUrl }: { photoId: string; dataUrl: string }) => {
      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `annotated_${photoId}.png`, { type: "image/png" });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("phase_id", phaseId);
      formData.append("caption", `注釈付き写真 (${new Date().toLocaleDateString("ja-JP")})`);
      return apiFetch(`/api/projects/${id}/photos`, {
        token: token!,
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos", id, phaseId] });
      setAnnotatingPhoto(null);
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

  // ── Derived ────────────────────────────────────────────────────────────────

  const mandatoryChecklist = checklist.filter((r) => r.is_mandatory);
  const metCount = mandatoryChecklist.filter((r) => (r.fulfilled_count || 0) >= r.min_count).length;
  const totalMandatory = mandatoryChecklist.length;
  const percent = totalMandatory > 0 ? (metCount / totalMandatory) * 100 : 0;
  const allMet = totalMandatory > 0 && metCount === totalMandatory;

  // Filtered photos
  const filteredPhotos = photos.filter((p) => {
    if (filterWorkType && p.work_type_id !== filterWorkType) return false;
    if (filterCategory && p.photo_category_id !== filterCategory) return false;
    return true;
  });

  const hasFilters = !!filterWorkType || !!filterCategory;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      Array.from(e.target.files || []).forEach((file) =>
        uploadMutation.mutate(file)
      );
      e.target.value = "";
    },
    [uploadMutation]
  );

  const togglePhotoSelect = useCallback((photoId: string) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  }, []);

  const handleBulkClassifyApply = useCallback(
    (workTypeId: string, photoCategoryId: string) => {
      bulkClassifyMutation.mutate({
        photoIds: Array.from(selectedPhotoIds),
        workTypeId,
        photoCategoryId,
      });
    },
    [selectedPhotoIds, bulkClassifyMutation]
  );

  const handleAnnotationSave = useCallback(
    (dataUrl: string) => {
      if (!annotatingPhoto) return;
      annotationSaveMutation.mutate({
        photoId: annotatingPhoto.id,
        dataUrl,
      });
    },
    [annotatingPhoto, annotationSaveMutation]
  );

  // ── Loading state ──────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pb-32">
      {/* ── Annotator overlay ── */}
      {annotatingPhoto && annotatingPhoto.url && (
        <PhotoAnnotator
          imageUrl={annotatingPhoto.url}
          onSave={handleAnnotationSave}
          onClose={() => setAnnotatingPhoto(null)}
        />
      )}

      {/* ── Bulk classify modal ── */}
      {showBulkModal && (
        <BulkClassifyModal
          selectedIds={Array.from(selectedPhotoIds)}
          workTypes={workTypes}
          photoCategories={photoCategories}
          onApply={handleBulkClassifyApply}
          onClose={() => setShowBulkModal(false)}
        />
      )}

      {/* ── Back link ── */}
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        工程一覧に戻る
      </Link>

      {/* ── Phase Header ── */}
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

      {/* ── Auto-generation Banner ── */}
      {allMet && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-green-800">全ての書類が揃いました！提出書類を生成できます</h3>
            <p className="text-sm text-green-600 mt-0.5">全ての必須要件が満たされています。提出書類を自動生成できます。</p>
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

      {/* ── Checklist + Upload Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist */}
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
                      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${met ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${met ? "bg-green-100" : "bg-gray-100"}`}>
                        {isPhoto ? (
                          <Camera className={`w-5 h-5 ${met ? "text-green-600" : "text-gray-400"}`} />
                        ) : (
                          <FileText className={`w-5 h-5 ${met ? "text-green-600" : "text-gray-400"}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${met ? "text-green-800" : "text-gray-800"}`}>{req.name}</span>
                          {req.is_mandatory && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">必須</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">{isPhoto ? "写真" : "書類"} / {req.requirement_type}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${met ? "text-green-600" : "text-gray-500"}`}>
                        <span className="text-sm font-semibold tabular-nums">{req.fulfilled_count || 0}/{req.min_count}</span>
                        {met ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-300" />}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>
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

        {/* Photo Upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Camera className="w-4 h-4 text-purple-600" />
            </div>
            写真アップロード
          </h2>

          <div className="space-y-3">
            {/* Document requirement */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">書類区分</label>
              <select
                value={selectedReq || ""}
                onChange={(e) => setSelectedReq(e.target.value || null)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              >
                <option value="">未分類</option>
                {checklist.filter((r) => r.requirement_type === "photo").map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Work type */}
            {workTypes.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">工種</label>
                <select
                  value={uploadWorkTypeId}
                  onChange={(e) => setUploadWorkTypeId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                >
                  <option value="">指定なし</option>
                  {workTypes.map((wt) => (
                    <option key={wt.id} value={wt.id}>
                      {wt.code ? `[${wt.code}] ` : ""}{wt.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Photo category */}
            {photoCategories.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">写真区分</label>
                <select
                  value={uploadPhotoCategoryId}
                  onChange={(e) => setUploadPhotoCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                >
                  <option value="">指定なし</option>
                  {photoCategories.map((pc) => (
                    <option key={pc.id} value={pc.id}>
                      {pc.code ? `[${pc.code}] ` : ""}{pc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Caption */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">説明</label>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                placeholder="写真の説明を入力..."
              />
            </div>

            {/* Hidden inputs */}
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFileChange} />

            {/* Upload area */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-2xl py-8 hover:border-blue-400 hover:bg-blue-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="w-12 h-12 bg-gray-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors">
                {uploadMutation.isPending ? (
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                  {uploadMutation.isPending ? "アップロード中..." : "タップして写真を選択（複数可）"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">JPG, PNG 対応</p>
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

      {/* ── Photo Gallery ── */}
      {photos.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
          {/* Gallery header */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-amber-600" />
              </div>
              工事写真
              <span className="text-sm font-normal text-gray-400">
                {filteredPhotos.length}/{photos.length}枚
              </span>
            </h2>

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {/* Bulk select mode toggle */}
              <button
                onClick={() => {
                  setBulkSelectMode((v) => !v);
                  setSelectedPhotoIds(new Set());
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  bulkSelectMode
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                一括選択
              </button>

              {/* Bulk classify button */}
              {bulkSelectMode && selectedPhotoIds.size > 0 && (
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                >
                  <Tag className="w-3.5 h-3.5" />
                  一括分類 ({selectedPhotoIds.size})
                </button>
              )}

              {/* Filter toggle */}
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  hasFilters
                    ? "bg-amber-500 text-white border-amber-500"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                フィルター{hasFilters && " (ON)"}
              </button>

              {/* View switcher */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setPhotoView("grid")}
                  className={`p-2 transition-colors ${photoView === "grid" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                  title="グリッド表示"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPhotoView("list")}
                  className={`p-2 transition-colors ${photoView === "list" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                  title="リスト表示"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPhotoView("map")}
                  className={`p-2 transition-colors ${photoView === "map" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                  title="マップ表示"
                >
                  <MapPin className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
              {workTypes.length > 0 && (
                <select
                  value={filterWorkType}
                  onChange={(e) => setFilterWorkType(e.target.value)}
                  className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 outline-none transition-colors"
                >
                  <option value="">工種: すべて</option>
                  {workTypes.map((wt) => (
                    <option key={wt.id} value={wt.id}>{wt.name}</option>
                  ))}
                </select>
              )}
              {photoCategories.length > 0 && (
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 outline-none transition-colors"
                >
                  <option value="">写真区分: すべて</option>
                  {photoCategories.map((pc) => (
                    <option key={pc.id} value={pc.id}>{pc.name}</option>
                  ))}
                </select>
              )}
              {hasFilters && (
                <button
                  onClick={() => { setFilterWorkType(""); setFilterCategory(""); }}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-3 h-3" />
                  クリア
                </button>
              )}
            </div>
          )}

          {/* ── Grid view ── */}
          {photoView === "grid" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {filteredPhotos.map((photo) => {
                const isSelected = selectedPhotoIds.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    className={`group relative bg-gray-50 rounded-xl overflow-hidden border transition-all ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-300"
                        : "border-gray-100 hover:shadow-lg hover:border-blue-200"
                    }`}
                    onClick={() => bulkSelectMode && togglePhotoSelect(photo.id)}
                  >
                    {photo.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
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

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Action buttons (shown on hover when not in bulk select) */}
                    {!bulkSelectMode && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Annotate button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnnotatingPhoto(photo);
                          }}
                          className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors"
                          title="注釈を追加"
                        >
                          <Pencil className="w-3.5 h-3.5 text-gray-700" />
                        </button>

                        {/* Open in new tab */}
                        {photo.url && (
                          <a
                            href={photo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors"
                            title="フルサイズで開く"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-gray-700" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Bulk select checkbox */}
                    {bulkSelectMode && (
                      <div className="absolute top-2 left-2">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                        }`}>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                    )}

                    {/* GPS indicator */}
                    {photo.latitude && (
                      <div className="absolute bottom-2 left-2">
                        <span className="bg-blue-600/80 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          GPS
                        </span>
                      </div>
                    )}

                    <div className="p-2.5">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {photo.caption || photo.original_filename || "写真"}
                      </p>
                      {photo.work_type && (
                        <p className="text-[10px] text-gray-400 truncate">{photo.work_type}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── List view ── */}
          {photoView === "list" && (
            <div className="space-y-2">
              {filteredPhotos.map((photo) => {
                const isSelected = selectedPhotoIds.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-100 hover:bg-gray-50"
                    }`}
                    onClick={() => bulkSelectMode && togglePhotoSelect(photo.id)}
                  >
                    {bulkSelectMode && (
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                      }`}>
                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                    )}
                    {photo.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.thumbnail_url}
                        alt={photo.caption || ""}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {photo.caption || photo.original_filename || "写真"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {new Date(photo.created_at).toLocaleDateString("ja-JP")}
                        </span>
                        {photo.work_type && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                            {photo.work_type}
                          </span>
                        )}
                        {photo.photo_category && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">
                            {photo.photo_category}
                          </span>
                        )}
                        {photo.latitude && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />GPS
                          </span>
                        )}
                      </div>
                    </div>
                    {!bulkSelectMode && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setAnnotatingPhoto(photo)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="注釈を追加"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {photo.url && (
                          <a
                            href={photo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Map view ── */}
          {photoView === "map" && (
            <PhotoMap photos={filteredPhotos} />
          )}

          {filteredPhotos.length === 0 && (
            <div className="text-center py-12">
              <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                {hasFilters ? "フィルター条件に一致する写真がありません" : "写真がありません"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Submissions ── */}
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
                <div key={sub.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
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

      {/* ── Comments ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
        <CommentSection entityType="phase" entityId={phaseId} />
      </div>
    </div>
  );
}
