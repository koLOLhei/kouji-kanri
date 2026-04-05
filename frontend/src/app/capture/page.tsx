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
} from "lucide-react";

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

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  status: "uploading" | "done" | "error";
}

// ─── Component ───────────────────────────────────────────────────

export default function CapturePage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedProject, setSelectedProject] = useState(
    searchParams.get("project") || ""
  );
  const [selectedPhase, setSelectedPhase] = useState("");
  const [selectedReq, setSelectedReq] = useState("");
  const [caption, setCaption] = useState("");

  // Upload queue & recent uploads
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [recentUploads, setRecentUploads] = useState<
    { preview: string; name: string }[]
  >([]);
  const [todayCount, setTodayCount] = useState(0);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Show toast helper
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

  const photoRequirements = checklist.filter(
    (r) => r.requirement_type === "photo"
  );

  // ─── Upload mutation ──────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: async ({ file, id }: { file: File; id: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedPhase) formData.append("phase_id", selectedPhase);
      if (selectedReq) formData.append("requirement_id", selectedReq);
      if (caption) formData.append("caption", caption);
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
      // Add to recent uploads
      const uploaded = uploadQueue.find((q) => q.id === variables.id);
      if (uploaded) {
        setRecentUploads((prev) =>
          [
            { preview: uploaded.preview, name: uploaded.file.name },
            ...prev,
          ].slice(0, 4)
        );
        setTodayCount((c) => c + 1);
      }
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["checklist"] });
      showToast("写真をアップロードしました");
    },
    onError: (_err, variables) => {
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === variables.id
            ? { ...item, status: "error" as const }
            : item
        )
      );
      showToast("アップロードに失敗しました", "error");
    },
  });

  // ─── File handler ─────────────────────────────────────────────

  const handleFiles = (files: FileList | null) => {
    if (!files || !selectedProject) return;

    const newItems: UploadItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      preview: URL.createObjectURL(file),
      status: "uploading" as const,
    }));

    setUploadQueue((prev) => [...newItems, ...prev]);
    newItems.forEach((item) =>
      uploadMutation.mutate({ file: item.file, id: item.id })
    );
  };

  const clearQueue = () => {
    // Revoke all preview URLs to free memory
    uploadQueue.forEach((item) => URL.revokeObjectURL(item.preview));
    setUploadQueue([]);
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      uploadQueue.forEach((item) => URL.revokeObjectURL(item.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived state
  const isReady = !!selectedProject;
  const selectedProjectName =
    projects.find((p) => p.id === selectedProject)?.name || "";
  const activeStep = !selectedProject
    ? 1
    : !selectedPhase
      ? 2
      : !selectedReq && photoRequirements.length > 0
        ? 3
        : 4;

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-lg text-white text-base font-medium flex items-center gap-2 animate-bounce-in ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
          style={{
            animation: "slideDown 0.3s ease-out",
          }}
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
            写真撮影
          </h1>
          <div className="w-12" /> {/* spacer for centering */}
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

        {/* ── Step 3: Document category (optional) ── */}
        {selectedPhase && photoRequirements.length > 0 && (
          <StepCard
            step={3}
            label="書類区分（任意）"
            active={activeStep === 3}
            done={!!selectedReq}
          >
            <select
              value={selectedReq}
              onChange={(e) => setSelectedReq(e.target.value)}
              className="w-full px-4 py-4 text-base font-medium bg-white border-2 border-gray-200 rounded-2xl appearance-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              style={{ minHeight: 60, fontSize: 16 }}
            >
              <option value="">指定なし</option>
              {photoRequirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </StepCard>
        )}

        {/* ── Step 4: Caption (optional) ── */}
        {selectedProject && (
          <StepCard step={photoRequirements.length > 0 ? 4 : 3} label="説明（任意）" active={false} done={false}>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-4 py-4 text-base bg-white border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              style={{ minHeight: 60, fontSize: 16 }}
              placeholder="写真の説明を入力..."
            />
          </StepCard>
        )}

        {/* ── Hidden file input ── */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            // Reset so the same file can be re-selected
            e.target.value = "";
          }}
        />

        {/* ── GIANT Camera Button ── */}
        <div className="flex flex-col items-center py-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!isReady}
            className="relative group"
            aria-label="撮影する"
          >
            {/* Pulsing ring when ready */}
            {isReady && (
              <span className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping" />
            )}
            {/* Outer ring */}
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
            className={`mt-3 text-base font-semibold ${
              isReady ? "text-blue-700" : "text-gray-400"
            }`}
          >
            {isReady ? "タップして撮影" : "案件を選択してください"}
          </p>
        </div>

        {/* ── Upload Queue ── */}
        {uploadQueue.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">
                アップロード状況
              </h3>
              <button
                onClick={clearQueue}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-500 active:bg-gray-100 rounded-lg transition-colors"
                style={{ minHeight: 44 }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                クリア
              </button>
            </div>
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
                  </div>
                  {/* Thumbnail */}
                  <img
                    src={item.preview}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                  {/* File name */}
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {item.file.name}
                  </span>
                  {/* Status text */}
                  <span
                    className={`text-xs font-medium flex-shrink-0 ${
                      item.status === "uploading"
                        ? "text-blue-500"
                        : item.status === "done"
                          ? "text-green-600"
                          : "text-red-500"
                    }`}
                  >
                    {item.status === "uploading"
                      ? "送信中..."
                      : item.status === "done"
                        ? "完了"
                        : "エラー"}
                  </span>
                </li>
              ))}
            </ul>
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
                本日: {todayCount}枚アップロード済み
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {recentUploads.map((item, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={item.preview}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Green checkmark overlay */}
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

      {/* ── Global animation styles ── */}
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
        {/* Step number badge */}
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
