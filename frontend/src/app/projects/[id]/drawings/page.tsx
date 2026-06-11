"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate, API_BASE } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileImage, Plus, ChevronDown, ChevronUp, Eye, X } from "lucide-react";
import { PdfViewer } from "@/components/pdf-viewer";

interface Drawing {
  id: string;
  drawing_number: string | null;
  title: string;
  category: string;
  drawing_category?: string | null;
  current_revision: number;
  status?: string;
  approval_status?: string;
  created_at: string;
  updated_at?: string;
}

interface DrawingListItem extends Drawing {
  revisions?: DrawingRevision[];
}

interface DrawingRevision {
  id: string;
  revision_number: number;
  change_description: string | null;
  created_at: string;
  file_key: string | null;
  download_url?: string | null;
}

interface UploadedFile {
  id: string;
  filename: string;
  size: number;
}

interface DrawingCreatePayload {
  drawing_number: string | null;
  title: string;
  category: string;
  file_key: string;
  file_size?: number;
  change_description?: string;
}

export default function DrawingsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewerDrawingId, setViewerDrawingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    drawing_number: "",
    title: "",
    category: "",
    file: null as File | null,
  });

  const { data: drawings = [], isLoading } = useQuery<DrawingListItem[]>({
    queryKey: ["drawings", id],
    queryFn: () => apiFetch(`/api/projects/${id}/drawings`, { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (payload: DrawingCreatePayload) =>
      apiFetch(`/api/projects/${id}/drawings`, {
        token: token!,
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drawings", id] });
      setShowForm(false);
      setForm({ drawing_number: "", title: "", category: "", file: null });
      setUploadError(null);
    },
  });

  // Upload the binary file via the platform attachment endpoint, return the
  // attachment id used as a stable file reference (the backend stores the
  // actual storage key server-side).
  async function uploadAttachment(file: File): Promise<UploadedFile> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("entity_type", "drawing");
    const res = await fetch(`${API_BASE}/api/projects/${id}/files`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "ファイルアップロードに失敗しました");
    }
    return res.json();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    if (!form.file) {
      setUploadError("図面ファイルを選択してください");
      return;
    }
    try {
      setUploading(true);
      const uploaded = await uploadAttachment(form.file);
      const payload: DrawingCreatePayload = {
        drawing_number: form.drawing_number || null,
        title: form.title,
        category: form.category,
        file_key: `attachments/${uploaded.id}/${uploaded.filename}`,
        file_size: uploaded.size,
        change_description: "初版",
      };
      createMutation.mutate(payload);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const toggleExpand = (drawingId: string) => {
    setExpandedId(expandedId === drawingId ? null : drawingId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileImage className="w-6 h-6" /> 図面管理
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 図面登録
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-lg">図面登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">図面番号</label>
              <input type="text" value={form.drawing_number}
                onChange={e => setForm({ ...form, drawing_number: e.target.value })}
                className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">タイトル</label>
              <input type="text" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">カテゴリ</label>
              <input type="text" value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded px-3 py-2" placeholder="建築/構造/設備" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ファイル</label>
            <input type="file"
              onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })}
              className="w-full border rounded px-3 py-2" required />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={uploading || createMutation.isPending}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {uploading
                ? "アップロード中..."
                : createMutation.isPending
                ? "登録中..."
                : "登録"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setUploadError(null); }}
              className="border px-6 py-2 rounded-lg hover:bg-gray-50">キャンセル</button>
          </div>
          {uploadError && (
            <p className="text-red-600 text-sm">{uploadError}</p>
          )}
          {createMutation.isError && (
            <p className="text-red-600 text-sm">{(createMutation.error as Error).message}</p>
          )}
        </form>
      )}

      {viewerDrawingId && (
        <DrawingViewerModal
          projectId={id!}
          drawingId={viewerDrawingId}
          token={token}
          onClose={() => setViewerDrawingId(null)}
        />
      )}

      {isLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : drawings.length === 0 ? (
        <p className="text-gray-500">図面がありません</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drawings.map(d => (
            <div key={d.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-gray-500">{d.drawing_number || "-"}</p>
                  <p className="font-semibold mt-1">{d.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{d.category}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Rev.{d.current_revision}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{formatDate(d.created_at)}</p>
                </div>
                <button
                  onClick={() => setViewerDrawingId(d.id)}
                  className="ml-2 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex-shrink-0"
                  title="ブラウザで開く"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              {d.revisions && d.revisions.length > 0 && (
                <div className="mt-3 border-t pt-2">
                  <button
                    onClick={() => toggleExpand(d.id)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    改訂履歴 ({d.revisions.length})
                    {expandedId === d.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {expandedId === d.id && (
                    <div className="mt-2 space-y-1">
                      {d.revisions.map(rev => (
                        <div key={rev.id} className="text-xs text-gray-700 flex justify-between">
                          <span>Rev.{rev.revision_number} {rev.change_description && `- ${rev.change_description}`}</span>
                          <span>{formatDate(rev.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DrawingDetail {
  drawing: { id: string; title: string; drawing_number: string | null };
  revisions: Array<{
    id: string;
    revision_number: number;
    download_url: string | null;
    file_key: string | null;
  }>;
}

function DrawingViewerModal({
  projectId,
  drawingId,
  token,
  onClose,
}: {
  projectId: string;
  drawingId: string;
  token: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<DrawingDetail>({
    queryKey: ["drawing", projectId, drawingId],
    queryFn: () =>
      apiFetch(`/api/projects/${projectId}/drawings/${drawingId}`, { token: token! }),
    enabled: !!token && !!drawingId,
  });

  const latest = data?.revisions?.[0];
  const url = latest?.download_url;
  const isPdf = (latest?.file_key || "").toLowerCase().endsWith(".pdf");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">
              {data?.drawing.drawing_number} {data?.drawing.title}
            </p>
            {latest && (
              <p className="text-xs text-gray-500">Rev.{latest.revision_number}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-100"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {isLoading && <p className="text-sm text-gray-500">読み込み中...</p>}
          {!isLoading && !url && (
            <p className="text-sm text-gray-500">図面ファイルがありません</p>
          )}
          {url && isPdf && <PdfViewer url={url} filename={data?.drawing.title} />}
          {url && !isPdf && (
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-700">
                このファイル形式（CAD/画像）はブラウザビューアで開けません
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                ダウンロードして外部アプリで開く
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
