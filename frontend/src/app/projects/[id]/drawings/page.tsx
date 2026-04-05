"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileImage, Plus, ChevronDown, ChevronUp } from "lucide-react";

interface Drawing {
  id: string;
  drawing_number: string;
  title: string;
  category: string;
  current_revision: string;
  uploaded_at: string;
  file_url: string | null;
  revisions?: DrawingRevision[];
}

interface DrawingRevision {
  id: string;
  revision: string;
  description: string | null;
  uploaded_at: string;
  file_url: string | null;
}

export default function DrawingsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    drawing_number: "",
    title: "",
    category: "",
    file: null as File | null,
  });

  const { data: drawings = [], isLoading } = useQuery<Drawing[]>({
    queryKey: ["drawings", id],
    queryFn: () => apiFetch(`/api/projects/${id}/drawings`, { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch(`/api/projects/${id}/drawings`, {
        token: token!,
        method: "POST",
        body: formData,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drawings", id] });
      setShowForm(false);
      setForm({ drawing_number: "", title: "", category: "", file: null });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("drawing_number", form.drawing_number);
    fd.append("title", form.title);
    fd.append("category", form.category);
    if (form.file) fd.append("file", form.file);
    createMutation.mutate(fd);
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
                className="w-full border rounded px-3 py-2" required />
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
              className="w-full border rounded px-3 py-2" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createMutation.isPending}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {createMutation.isPending ? "アップロード中..." : "登録"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="border px-6 py-2 rounded-lg hover:bg-gray-50">キャンセル</button>
          </div>
          {createMutation.isError && (
            <p className="text-red-600 text-sm">{(createMutation.error as Error).message}</p>
          )}
        </form>
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
                <div>
                  <p className="font-mono text-sm text-gray-500">{d.drawing_number}</p>
                  <p className="font-semibold mt-1">{d.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{d.category}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Rev.{d.current_revision}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(d.uploaded_at)}</p>
                </div>
              </div>
              {d.revisions && d.revisions.length > 0 && (
                <div className="mt-3 border-t pt-2">
                  <button
                    onClick={() => toggleExpand(d.id)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    改訂履歴 ({d.revisions.length})
                    {expandedId === d.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {expandedId === d.id && (
                    <div className="mt-2 space-y-1">
                      {d.revisions.map(rev => (
                        <div key={rev.id} className="text-xs text-gray-600 flex justify-between">
                          <span>Rev.{rev.revision} {rev.description && `- ${rev.description}`}</span>
                          <span>{formatDate(rev.uploaded_at)}</span>
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
