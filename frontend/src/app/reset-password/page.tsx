"use client";

/**
 * D29: Reset password page — accepts token from URL query param.
 * Sends POST /api/auth/reset-password with token + new password.
 */

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, ArrowLeft, KeyRound, CheckCircle, Eye, EyeOff } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("パスワードが一致しません");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上にしてください");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "エラーが発生しました");
      }
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-red-600 text-sm mb-4">無効なリセットリンクです</p>
        <Link href="/forgot-password" className="text-sm underline" style={{ color: "#1a4d3e" }}>
          パスワードリセットを再度リクエストする
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">パスワードを更新しました</h2>
        <p className="text-sm text-gray-500 mb-6">新しいパスワードでログインしてください。</p>
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm font-medium hover:underline"
          style={{ color: "#1a4d3e" }}
        >
          <ArrowLeft className="w-4 h-4" />
          ログインページへ
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          新しいパスワード
        </label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:outline-none"
            placeholder="8文字以上"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowPw((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPw ? "パスワードを隠す" : "パスワードを表示"}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
          パスワード（確認）
        </label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:outline-none"
          placeholder="同じパスワードを入力"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full text-white py-3 rounded-xl disabled:opacity-50 transition-opacity font-semibold shadow-md"
        style={{ background: "linear-gradient(90deg, #1a4d3e, #2d7a5e)" }}
      >
        {loading ? "更新中..." : "パスワードを更新する"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #0d2b1e 0%, #1a4d3e 60%, #0f3426 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="h-1 rounded-t-3xl" style={{ backgroundColor: "#c9a84c" }} />
        <div className="bg-white rounded-b-3xl shadow-2xl px-8 py-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1a4d3e, #0d2b1e)" }}
            >
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-tight" style={{ color: "#1a4d3e" }}>
                KAMO construction
              </h1>
              <p className="text-xs text-gray-400">パスワードをリセット</p>
            </div>
          </div>
          <Suspense fallback={<div className="text-center text-sm text-gray-400">読み込み中...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
