"use client";

/**
 * D29: Forgot password page.
 * Sends the user's email to POST /api/auth/forgot-password.
 */

import { useState } from "react";
import Link from "next/link";
import { Building2, ArrowLeft, Mail, CheckCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "エラーが発生しました");
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #0d2b1e 0%, #1a4d3e 60%, #0f3426 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="h-1 rounded-t-3xl" style={{ backgroundColor: "#c9a84c" }} />
        <div className="bg-white rounded-b-3xl shadow-2xl px-8 py-8">
          {/* Header */}
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
              <p className="text-xs text-gray-400">パスワードリセット</p>
            </div>
          </div>

          {sent ? (
            /* Success state */
            <div className="text-center">
              <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                メールを送信しました
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                登録済みのメールアドレスの場合、パスワードリセット用のリンクを送信しました。
                メールをご確認ください。
              </p>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium hover:underline"
                style={{ color: "#1a4d3e" }}
              >
                <ArrowLeft className="w-4 h-4" />
                ログインページへ戻る
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <p className="text-sm text-gray-600 mb-6 text-center">
                登録済みのメールアドレスを入力してください。<br />
                パスワードリセット用のリンクをお送りします。
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div role="alert" className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:outline-none"
                      placeholder="admin@demo.co.jp"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white py-3 rounded-xl disabled:opacity-50 transition-opacity font-semibold shadow-md"
                  style={{ background: "linear-gradient(90deg, #1a4d3e, #2d7a5e)" }}
                >
                  {loading ? "送信中..." : "リセットメールを送信"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-1 text-sm hover:underline"
                  style={{ color: "#1a4d3e" }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  ログインへ戻る
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
