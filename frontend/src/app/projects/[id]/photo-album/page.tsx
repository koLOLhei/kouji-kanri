"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookImage,
  Download,
  FileImage,
  Grid2X2,
  Grid3X3,
  LayoutGrid,
  Loader2,
  RectangleHorizontal,
  Square,
  ChevronDown,
} from "lucide-react";

interface AlbumPhoto {
  id: string;
  thumbnail_url: string;
  caption: string;
  phase_name: string;
  taken_at: string;
}

interface PreviewData {
  photos: AlbumPhoto[];
  phases: { id: string; name: string }[];
  total_count: number;
}

interface GenerateResult {
  download_url: string;
  filename: string;
  page_count: number;
}

type LayoutOption = "1x1" | "2x1" | "2x2" | "3x2";

const LAYOUT_OPTIONS: {
  value: LayoutOption;
  label: string;
  description: string;
  icon: typeof Square;
  gridClass: string;
}[] = [
  {
    value: "1x1",
    label: "1枚/ページ",
    description: "大判・高解像度",
    icon: Square,
    gridClass: "grid-cols-1 grid-rows-1",
  },
  {
    value: "2x1",
    label: "2枚/ページ",
    description: "横並び",
    icon: RectangleHorizontal,
    gridClass: "grid-cols-2 grid-rows-1",
  },
  {
    value: "2x2",
    label: "4枚/ページ",
    description: "標準レイアウト",
    icon: Grid2X2,
    gridClass: "grid-cols-2 grid-rows-2",
  },
  {
    value: "3x2",
    label: "6枚/ページ",
    description: "一覧性重視",
    icon: Grid3X3,
    gridClass: "grid-cols-3 grid-rows-2",
  },
];

export default function PhotoAlbumPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [layout, setLayout] = useState<LayoutOption>("2x2");
  const [selectedPhase, setSelectedPhase] = useState<string>("");
  const [title, setTitle] = useState("");

  const { data: preview, isLoading } = useQuery<PreviewData>({
    queryKey: ["photo-album-preview", id, selectedPhase],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedPhase) params.set("phase_id", selectedPhase);
      return apiFetch(
        `/api/projects/${id}/photo-album/preview?${params.toString()}`,
        { token: token! }
      );
    },
    enabled: !!token,
  });

  const generateMutation = useMutation<GenerateResult>({
    mutationFn: () =>
      apiFetch(`/api/projects/${id}/photo-album/generate`, {
        token: token!,
        method: "POST",
        body: JSON.stringify({
          layout,
          phase_id: selectedPhase || null,
          title: title || "写真台帳",
        }),
      }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/projects/${id}`}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookImage className="w-6 h-6" /> 写真台帳生成
        </h1>
      </div>

      {/* Layout Selector */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-gray-500" />
          レイアウト選択
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {LAYOUT_OPTIONS.map((opt) => {
            const selected = layout === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setLayout(opt.value)}
                className={`relative flex flex-col items-center p-5 rounded-xl border-2 transition-all ${
                  selected
                    ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {selected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}

                {/* Visual Layout Preview */}
                <div
                  className={`w-16 h-20 border rounded-lg p-1 grid gap-0.5 mb-3 ${opt.gridClass} ${
                    selected ? "border-blue-300 bg-blue-100" : "border-gray-300 bg-gray-100"
                  }`}
                >
                  {Array.from({
                    length:
                      opt.value === "1x1"
                        ? 1
                        : opt.value === "2x1"
                          ? 2
                          : opt.value === "2x2"
                            ? 4
                            : 6,
                  }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-sm ${
                        selected ? "bg-blue-400" : "bg-gray-400"
                      }`}
                    />
                  ))}
                </div>

                <span
                  className={`text-sm font-medium ${selected ? "text-blue-700" : "text-gray-700"}`}
                >
                  {opt.label}
                </span>
                <span
                  className={`text-xs ${selected ? "text-blue-500" : "text-gray-400"}`}
                >
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Title */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phase Filter */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">工程フィルタ</h2>
          <div className="relative">
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 text-sm appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全工程</option>
              {preview?.phases.map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {preview && (
            <p className="text-sm text-gray-500 mt-3">
              対象写真: <span className="font-medium text-gray-800">{preview.total_count}枚</span>
            </p>
          )}
        </div>

        {/* Title Input */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">台帳タイトル</h2>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="写真台帳"
            className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-400 mt-2">
            PDFの表紙に表示されるタイトルです
          </p>
        </div>
      </div>

      {/* Photo Preview */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <FileImage className="w-5 h-5 text-gray-500" />
          プレビュー
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : !preview || preview.photos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileImage className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>対象の写真がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {preview.photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100"
              >
                <img
                  src={photo.thumbnail_url}
                  alt={photo.caption}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <div>
                    <p className="text-white text-xs font-medium truncate">
                      {photo.caption}
                    </p>
                    <p className="text-white/60 text-xs">{photo.phase_name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Button + Result */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={
              generateMutation.isPending ||
              !preview ||
              preview.photos.length === 0
            }
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3.5 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <BookImage className="w-5 h-5" />
                写真台帳PDFを生成
              </>
            )}
          </button>

          {preview && preview.photos.length > 0 && (
            <span className="text-sm text-gray-500">
              {preview.total_count}枚 / {layout}レイアウト
            </span>
          )}
        </div>

        {generateMutation.isError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {(generateMutation.error as Error).message}
          </div>
        )}

        {generateMutation.isSuccess && generateMutation.data && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">PDF生成完了</p>
                <p className="text-sm text-green-600">
                  {generateMutation.data.filename} ({generateMutation.data.page_count}ページ)
                </p>
              </div>
            </div>
            <a
              href={generateMutation.data.download_url}
              download
              className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium mt-2"
            >
              <Download className="w-4 h-4" />
              ダウンロード
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
