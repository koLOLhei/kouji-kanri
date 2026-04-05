"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle,
  X,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Trash2,
  Image,
  RefreshCw,
  Upload,
  LayoutGrid,
  List,
  RotateCcw,
} from "lucide-react";
import ElectronicBlackboard, {
  type BlackboardData,
  compositeBlackboardOntoImage,
} from "@/components/electronic-blackboard";

// ─── Types ───────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
}

interface Phase {
  id: string;
  name: string;
  phase_code: string | null;
}

interface Requirement {
  id: string;
  name: string;
  requirement_type: string;
}

interface WorkType {
  id: string;
  name: string;
  code?: string;
}

interface WorkSubtype {
  id: string;
  name: string;
  work_type_id: string;
}

interface WorkDetail {
  id: string;
  name: string;
  subtype_id: string;
}

interface PhotoCategory {
  id: string;
  name: string;
  code?: string;
}

type UploadStatus = "pending" | "uploading" | "done" | "error";

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  status: UploadStatus;
  error?: string;
  /** After blackboard composite, the composited data URL */
  compositedDataUrl?: string;
}

// ─── Component ───────────────────────────────────────────────────

export default function CapturePage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedProject, setSelectedProject] = useState(
    searchParams.get("project") || ""
  );
  const [selectedPhase, setSelectedPhase] = useState("");
  const [selectedReq, setSelectedReq] = useState("");
  const [caption, setCaption] = useState("");

  // Classification
  const [workTypeId, setWorkTypeId] = useState("");
  const [workSubtypeId, setWorkSubtypeId] = useState("");
  const [workDetailId, setWorkDetailId] = useState("");
  const [photoCategoryId, setPhotoCategoryId] = useState("");

  // Electronic blackboard
  const [bbVisible, setBbVisible] = useState(false);
  const [bbData, setBbData] = useState<BlackboardData>({
    projectName: "",
    workType: "",
    captureDate: new Date().toLocaleDateString("ja-JP"),
    measurement: "",
    photographer: "",
  });

  // Upload queue
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [recentUploads, setRecentUploads] = useState<
    { preview: string; name: string }[]
  >([]);
  const [todayCount, setTodayCount] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    []
  );

  // ─── Queries ──────────────────────────────────────────────────

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<Project[]>("/api/projects", { token: token! }),
    enabled: !!token,
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["phases", selectedProject],
    queryFn: () =>
      apiFetch<Phase[]>(`/api/projects/${selectedProject}/phases`, {
        token: token!,
      }),
    enabled: !!token && !!selectedProject,
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ["checklist", selectedProject, selectedPhase],
    queryFn: () =>
      apiFetch<Requirement[]>(
        `/api/projects/${selectedProject}/phases/${selectedPhase}/checklist`,
        { token: token! }
      ),
    enabled: !!token && !!selectedProject && !!selectedPhase,
  });

  const { data: workTypes = [] } = useQuery({
    queryKey: ["work-types"],
    queryFn: () =>
      apiFetch<WorkType[]>("/api/electronic-delivery/work-types", {
        token: token!,
      }),
    enabled: !!token,
    // Don't throw if endpoint doesn't exist yet
    retry: false,
  });

  const { data: photoCategories = [] } = useQuery({
    queryKey: ["photo-categories"],
    queryFn: () =>
      apiFetch<PhotoCategory[]>("/api/electronic-delivery/photo-categories", {
        token: token!,
      }),
    enabled: !!token,
    retry: false,
  });

  const photoRequirements = checklist.filter(
    (r) => r.requirement_type === "photo"
  );

  // Sync project name to blackboard
  useEffect(() => {
    const project = projects.find((p) => p.id === selectedProject);
    if (project) {
      setBbData((prev) => ({ ...prev, projectName: project.name }));
    }
  }, [selectedProject, projects]);

  // Sync work type to blackboard
  useEffect(() => {
    const wt = workTypes.find((w) => w.id === workTypeId);
    if (wt) {
      setBbData((prev) => ({ ...prev, workType: wt.name }));
    }
  }, [workTypeId, workTypes]);

  // ─── Upload mutation ──────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: async ({ file, id, compositedDataUrl }: { file: File; id: string; compositedDataUrl?: string }) => {
      let uploadFile = file;

      // If blackboard is visible and we have a composited version, use that
      if (bbVisible && compositedDataUrl) {
        const res = await fetch(compositedDataUrl);
        const blob = await res.blob();
        uploadFile = new File([blob], file.name, { type: "image/png" });
      }

      const formData = new FormData();
      formData.append("file", uploadFile);
      if (selectedPhase) formData.append("phase_id", selectedPhase);
      if (selectedReq) formData.append("requirement_id", selectedReq);
      if (caption) formData.append("caption", caption);
      if (workTypeId) formData.append("work_type_id", workTypeId);
      if (photoCategoryId) formData.append("photo_category_id", photoCategoryId);
      return apiFetch(`/api/projects/${selectedProject}/photos`, {
        token: token!,
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (_data, variables) => {
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === variables.id ? { ...item, status: "done" as const } : item
        )
      );
      const uploaded = uploadQueue.find((q) => q.id === variables.id);
      if (uploaded) {
        setRecentUploads((prev) =>
          [
            { preview: uploaded.preview, name: uploaded.file.name },
            ...prev,
          ].slice(0, 8)
        );
        setTodayCount((c) => c + 1);
      }
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["checklist"] });
      showToast("写真をアップロードしました");
    },
    onError: (err, variables) => {
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === variables.id
            ? {
                ...item,
                status: "error" as const,
                error: err instanceof Error ? err.message : "エラー",
              }
            : item
        )
      );
      showToast("アップロードに失敗しました", "error");
    },
  });

  // ─── File handler ─────────────────────────────────────────────

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !selectedProject) return;

      const fileArray = Array.from(files);

      // If blackboard is on, pre-composite each image
      const newItems: UploadItem[] = await Promise.all(
        fileArray.map(async (file) => {
          const preview = URL.createObjectURL(file);
          let compositedDataUrl: string | undefined;

          if (bbVisible) {
            try {
              compositedDataUrl = await compositeBlackboardOntoImage(
                preview,
                bbData,
                { x: 16, y: 16 }
              );
            } catch {
              // If composite fails, upload original
            }
          }

          return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            preview,
            status: "uploading" as const,
            compositedDataUrl,
          };
        })
      );

      setUploadQueue((prev) => [...newItems, ...prev]);
      newItems.forEach((item) =>
        uploadMutation.mutate({
          file: item.file,
          id: item.id,
          compositedDataUrl: item.compositedDataUrl,
        })
      );
    },
    [selectedProject, bbVisible, bbData, uploadMutation]
  );

  // Retry single item
  const retryItem = useCallback(
    (item: UploadItem) => {
      setUploadQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "uploading" as const, error: undefined } : q
        )
      );
      uploadMutation.mutate({
        file: item.file,
        id: item.id,
        compositedDataUrl: item.compositedDataUrl,
      });
    },
    [uploadMutation]
  );

  const removeItem = useCallback((id: string) => {
    setUploadQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((q) => q.id !== id);
    });
  }, []);

  const clearDoneItems = () => {
    setUploadQueue((prev) => {
      const removing = prev.filter((q) => q.status === "done");
      removing.forEach((item) => URL.revokeObjectURL(item.preview));
      return prev.filter((q) => q.status !== "done");
    });
  };

  const clearQueue = () => {
    uploadQueue.forEach((item) => URL.revokeObjectURL(item.preview));
    setUploadQueue([]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      uploadQueue.forEach((item) => URL.revokeObjectURL(item.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Derived state ────────────────────────────────────────────
  const isReady = !!selectedProject;
  const selectedProjectName =
    projects.find((p) => p.id === selectedProject)?.name || "";
  const activeStep = !selectedProject ? 1 : !selectedPhase ? 2 : 4;

  const pendingCount = uploadQueue.filter((q) => q.status === "uploading").length;
  const doneCount = uploadQueue.filter((q) => q.status === "done").length;
  const errorCount = uploadQueue.filter((q) => q.status === "error").length;

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-lg text-white text-base font-medium flex items-center gap-2 ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
          style={{ animation: "slideDown 0.3s ease-out" }}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-12 h-12 -ml-2 rounded-xl active:bg-gray-100 transition-colors"
            aria-label="戻る"
          >
            <ChevronLeft className="w-7 h-7 text-gray-700" />
          </button>
          <h1 className="flex-1 text-center text-lg font-bold text-gray-900 flex items-center justify-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            写真撮影・一括アップロード
          </h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-5">
        {/* ── Step 1: Project ── */}
        <StepCard
          step={1}
          label="案件を選択"
          required
          active={activeStep === 1}
          done={!!selectedProject}
        >
          <select
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setSelectedPhase("");
              setSelectedReq("");
            }}
            className="w-full px-4 py-4 text-base font-medium bg-white border-2 border-gray-200 rounded-2xl appearance-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            style={{ minHeight: 60, fontSize: 16 }}
          >
            <option value="">タップして案件を選択</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {selectedProjectName && (
            <div className="mt-2 px-3 py-2 bg-blue-50 rounded-xl text-blue-800 font-semibold text-base">
              {selectedProjectName}
            </div>
          )}
        </StepCard>

        {/* ── Step 2: Phase ── */}
        {selectedProject && (
          <StepCard
            step={2}
            label="工程を選択"
            active={activeStep === 2}
            done={!!selectedPhase}
          >
            <select
              value={selectedPhase}
              onChange={(e) => {
                setSelectedPhase(e.target.value);
                setSelectedReq("");
              }}
              className="w-full px-4 py-4 text-base font-medium bg-white border-2 border-gray-200 rounded-2xl appearance-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              style={{ minHeight: 60, fontSize: 16 }}
            >
              <option value="">未分類のまま進む</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.phase_code ? `[${p.phase_code}] ` : ""}
                  {p.name}
                </option>
              ))}
            </select>
          </StepCard>
        )}

        {/* ── Step 3: Photo Classification ── */}
        {selectedProject && (
          <StepCard step={3} label="写真分類（任意）" active={false} done={false}>
            <div className="space-y-3">
              {/* Document requirement */}
              {selectedPhase && photoRequirements.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">書類区分</label>
                  <select
                    value={selectedReq}
                    onChange={(e) => setSelectedReq(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl appearance-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  >
                    <option value="">指定なし</option>
                    {photoRequirements.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Work type */}
              {workTypes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">工種</label>
                  <select
                    value={workTypeId}
                    onChange={(e) => {
                      setWorkTypeId(e.target.value);
                      setWorkSubtypeId("");
                      setWorkDetailId("");
                    }}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl appearance-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  >
                    <option value="">工種を選択</option>
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
                    value={photoCategoryId}
                    onChange={(e) => setPhotoCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl appearance-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  >
                    <option value="">写真区分を選択</option>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">説明（任意）</label>
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  placeholder="写真の説明を入力..."
                />
              </div>
            </div>
          </StepCard>
        )}

        {/* ── Electronic Blackboard ── */}
        {selectedProject && (
          <ElectronicBlackboard
            data={bbData}
            onChange={setBbData}
            visible={bbVisible}
            onToggle={() => setBbVisible((v) => !v)}
          />
        )}

        {/* ── Hidden file inputs ── */}
        {/* Camera capture */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {/* Gallery / bulk select */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* ── Action buttons ── */}
        <div className="flex flex-col items-center gap-3 py-4">
          {/* Giant camera button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!isReady}
            className="relative group"
            aria-label="撮影する"
          >
            {isReady && (
              <span className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping" />
            )}
            <span
              className={`relative flex items-center justify-center rounded-full shadow-xl transition-all active:scale-95 ${
                isReady
                  ? "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-300"
                  : "bg-gray-300 shadow-gray-200"
              }`}
              style={{ width: 96, height: 96 }}
            >
              <Camera
                className={`w-10 h-10 ${isReady ? "text-white" : "text-gray-500"}`}
              />
            </span>
          </button>
          <p
            className={`text-base font-semibold ${
              isReady ? "text-blue-700" : "text-gray-400"
            }`}
          >
            {isReady ? "タップして撮影" : "案件を選択してください"}
          </p>

          {/* Bulk upload button */}
          {isReady && (
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-blue-200 text-blue-700 rounded-2xl font-semibold text-base shadow-sm hover:border-blue-400 hover:bg-blue-50 active:scale-95 transition-all"
            >
              <Upload className="w-5 h-5" />
              一括アップロード
            </button>
          )}
        </div>

        {/* ── Upload Queue ── */}
        {uploadQueue.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-700">
                  アップロード状況
                </h3>
                {/* Count summary */}
                <p className="text-xs text-gray-500 mt-0.5">
                  {uploadQueue.length}枚選択中
                  {doneCount > 0 && (
                    <span className="text-green-600 ml-2">
                      / {doneCount}枚完了
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span className="text-blue-600 ml-2">
                      / {pendingCount}枚送信中
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="text-red-600 ml-2">
                      / {errorCount}枚エラー
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 transition-colors ${
                      viewMode === "list"
                        ? "bg-blue-600 text-white"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 transition-colors ${
                      viewMode === "grid"
                        ? "bg-blue-600 text-white"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>

                {doneCount > 0 && (
                  <button
                    onClick={clearDoneItems}
                    className="px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    style={{ minHeight: 32 }}
                  >
                    完了を削除
                  </button>
                )}
                <button
                  onClick={clearQueue}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg hover:bg-red-50 transition-colors"
                  style={{ minHeight: 32 }}
                >
                  <Trash2 className="w-3 h-3" />
                  全クリア
                </button>
              </div>
            </div>

            {/* Progress bar */}
            {uploadQueue.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>進行状況</span>
                  <span>
                    {doneCount}/{uploadQueue.length}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        uploadQueue.length > 0
                          ? (doneCount / uploadQueue.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* List view */}
            {viewMode === "list" && (
              <ul className="divide-y divide-gray-100">
                {uploadQueue.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                      {item.status === "uploading" && (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                      {item.status === "done" && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {item.status === "error" && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      {item.status === "pending" && (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>

                    {/* Thumbnail */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.compositedDataUrl || item.preview}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-700 truncate block">
                        {item.file.name}
                      </span>
                      {item.status === "error" && item.error && (
                        <span className="text-xs text-red-500 truncate block">
                          {item.error}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span
                        className={`text-xs font-medium ${
                          item.status === "uploading"
                            ? "text-blue-500"
                            : item.status === "done"
                              ? "text-green-600"
                              : item.status === "error"
                                ? "text-red-500"
                                : "text-gray-400"
                        }`}
                      >
                        {item.status === "uploading"
                          ? "送信中..."
                          : item.status === "done"
                            ? "完了"
                            : item.status === "error"
                              ? "エラー"
                              : "待機中"}
                      </span>

                      {item.status === "error" && (
                        <button
                          onClick={() => retryItem(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          aria-label="再試行"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="削除"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Grid view */}
            {viewMode === "grid" && (
              <div className="p-3 grid grid-cols-3 gap-2">
                {uploadQueue.map((item) => (
                  <div key={item.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.compositedDataUrl || item.preview}
                      alt=""
                      className="w-full aspect-square rounded-xl object-cover"
                    />
                    {/* Status overlay */}
                    <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/20">
                      {item.status === "uploading" && (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      )}
                      {item.status === "done" && (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      )}
                      {item.status === "error" && (
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      )}
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {/* Retry button for errors */}
                    {item.status === "error" && (
                      <button
                        onClick={() => retryItem(item)}
                        className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center"
                        aria-label="再試行"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Recent Uploads ── */}
        {recentUploads.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <Image className="w-4 h-4 text-gray-500" />
                最近のアップロード
              </h3>
              <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                本日: {todayCount}枚
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {recentUploads.map((item, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.preview}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/10 flex items-end justify-end p-1">
                    <span className="bg-green-500 rounded-full p-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
}

// ─── Step Card Component ─────────────────────────────────────────

function StepCard({
  step,
  label,
  required,
  active,
  done,
  children,
}: {
  step: number;
  label: string;
  required?: boolean;
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border-2 transition-all ${
        active
          ? "border-blue-400 bg-white shadow-md shadow-blue-100"
          : done
            ? "border-green-200 bg-green-50/50"
            : "border-gray-200 bg-white"
      }`}
    >
      <div className="px-4 pt-3 pb-1 flex items-center gap-2.5">
        <span
          className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
            done
              ? "bg-green-500 text-white"
              : active
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-500"
          }`}
        >
          {done ? <CheckCircle className="w-4 h-4" /> : step}
        </span>
        <span className="text-sm font-bold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}
