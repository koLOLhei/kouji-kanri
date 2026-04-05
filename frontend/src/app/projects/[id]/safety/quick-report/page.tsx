"use client";

import { useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { ArrowLeft, Camera, AlertTriangle, CheckCircle2, X } from "lucide-react";

const SEVERITY_OPTIONS = [
  { key: "low", label: "軽微", desc: "注意が必要", color: "bg-blue-100 text-blue-700 border-blue-300", activeColor: "bg-blue-600 text-white border-blue-600" },
  { key: "medium", label: "中程度", desc: "対処が必要", color: "bg-yellow-100 text-yellow-700 border-yellow-300", activeColor: "bg-yellow-500 text-white border-yellow-500" },
  { key: "high", label: "重大", desc: "即時対応", color: "bg-orange-100 text-orange-700 border-orange-300", activeColor: "bg-orange-500 text-white border-orange-500" },
  { key: "critical", label: "緊急", desc: "作業停止", color: "bg-red-100 text-red-700 border-red-300", activeColor: "bg-red-600 text-white border-red-600" },
] as const;

type Severity = "low" | "medium" | "high" | "critical";

export default function QuickReportPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();

  const [severity, setSeverity] = useState<Severity>("medium");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setPhoto(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const clearPhoto = () => {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("説明を入力してください");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("description", description.trim());
      form.append("severity", severity);
      if (photo) form.append("file", photo);

      const res = await fetch(`http://127.0.0.1:8001/api/projects/${id}/safety/quick-incident`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "送信に失敗しました");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/projects/${id}/safety`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 p-8 text-center">
        <div className="animate-bounce mb-6">
          <CheckCircle2 className="w-24 h-24 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-green-700 mb-2">報告完了！</h2>
        <p className="text-green-600 mb-6">ヒヤリハット報告を受け付けました</p>
        <p className="text-sm text-gray-500">安全管理ページへ戻ります...</p>
      </div>
    );
  }

  const selectedSev = SEVERITY_OPTIONS.find(s => s.key === severity)!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href={`/projects/${id}/safety`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          ヒヤリハット簡易報告
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-4 space-y-6">
        {/* Step 1: Photo */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            1. 写真（任意）
          </p>
          {photoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="プレビュー" className="w-full h-48 object-cover rounded-xl border" />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              {/* Camera capture */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-300 rounded-xl bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Camera className="w-10 h-10 text-gray-400" />
                <span className="text-sm text-gray-500">カメラで撮影</span>
              </button>
              {/* File picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-300 rounded-xl bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <span className="text-3xl">🖼️</span>
                <span className="text-sm text-gray-500">ライブラリから</span>
              </button>
            </div>
          )}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Step 2: Severity */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            2. 重大度を選択
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SEVERITY_OPTIONS.map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSeverity(opt.key)}
                className={`py-4 px-3 rounded-xl border-2 font-medium text-left transition-all ${
                  severity === opt.key ? opt.activeColor : opt.color
                }`}
              >
                <div className="text-lg font-bold">{opt.label}</div>
                <div className="text-xs opacity-80 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Description */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            3. 内容を入力
          </p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="何が起きたか、どこで起きたか、どんな危険があったかを簡潔に..."
            rows={3}
            maxLength={500}
            className="w-full border-2 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 resize-none"
            required
          />
          <p className="text-xs text-gray-400 text-right mt-1">{description.length}/500</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || !description.trim()}
          className={`w-full py-5 rounded-2xl text-xl font-bold transition-all shadow-lg ${
            submitting || !description.trim()
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : `${selectedSev.activeColor} shadow-md active:scale-95`
          }`}
        >
          {submitting ? "送信中..." : "報告する"}
        </button>

        <p className="text-center text-xs text-gray-400">
          報告内容は安全担当者に通知されます
        </p>
      </form>
    </div>
  );
}
