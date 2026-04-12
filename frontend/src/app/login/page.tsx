"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Building2, Fingerprint } from "lucide-react";
import {
  canUseBiometric,
  isBiometricRegistered,
  authenticateWithBiometric,
  registerBiometric,
} from "@/lib/biometric-auth";

/**
 * D28: Login page with KAMO construction branding.
 * Uses deep green gradient background and gold accent bar.
 */
export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showRegisterBiometric, setShowRegisterBiometric] = useState(false);
  const [lastLoginToken, setLastLoginToken] = useState<string | null>(null);
  const [lastLoginUserId, setLastLoginUserId] = useState<string | null>(null);

  useEffect(() => {
    setBiometricAvailable(canUseBiometric());
    setBiometricRegistered(isBiometricRegistered());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      if (biometricAvailable && !biometricRegistered) {
        const storedToken = localStorage.getItem("kk_token");
        setLastLoginToken(storedToken);
        setLastLoginUserId(email);
        setShowRegisterBiometric(true);
      } else {
        window.location.href = "/";
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setError("");
    try {
      const token = await authenticateWithBiometric();
      if (token) {
        localStorage.setItem("kk_token", token);
        window.location.href = "/";
      } else {
        setError("生体認証に失敗しました。パスワードでログインしてください。");
      }
    } catch {
      setError("生体認証でエラーが発生しました");
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleRegisterBiometric = async () => {
    if (!lastLoginToken || !lastLoginUserId) {
      window.location.href = "/";
      return;
    }
    setBiometricLoading(true);
    try {
      await registerBiometric(lastLoginUserId, lastLoginToken);
      setBiometricRegistered(true);
    } catch {
      // Registration failed — continue anyway
    } finally {
      setBiometricLoading(false);
      window.location.href = "/";
    }
  };

  // Biometric registration prompt after password login
  if (showRegisterBiometric) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "linear-gradient(135deg, #0d2b1e 0%, #1a4d3e 60%, #0f3426 100%)" }}
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <Fingerprint className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            生体認証を登録しますか？
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            次回から指紋・顔認証でログインできます。
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRegisterBiometric}
              disabled={biometricLoading}
              className="w-full py-3 rounded-xl text-white hover:opacity-90 disabled:opacity-50 transition-opacity font-semibold"
              style={{ backgroundColor: "#1a4d3e" }}
            >
              {biometricLoading ? "登録中..." : "生体認証を登録する"}
            </button>
            <button
              onClick={() => { window.location.href = "/"; }}
              className="w-full border border-gray-300 text-gray-600 py-3 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              スキップ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #0d2b1e 0%, #1a4d3e 60%, #0f3426 100%)" }}
    >
      <div className="w-full max-w-md">
        {/* Gold accent bar */}
        <div className="h-1 rounded-t-3xl" style={{ backgroundColor: "#c9a84c" }} />

        <div className="bg-white rounded-b-3xl shadow-2xl px-8 py-8">
          {/* KAMO branding header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1a4d3e, #0d2b1e)" }}
            >
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1
                className="text-xl font-extrabold leading-tight tracking-tight"
                style={{ color: "#1a4d3e" }}
              >
                KAMO construction
              </h1>
              <p className="text-xs text-gray-400 tracking-wide">施工管理システム</p>
            </div>
          </div>

          {/* Gold divider */}
          <div
            className="w-10 h-0.5 mx-auto mb-6 rounded-full"
            style={{ backgroundColor: "#c9a84c" }}
          />

          {/* Biometric login */}
          {biometricAvailable && biometricRegistered && (
            <>
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={biometricLoading}
                className="w-full mb-4 flex items-center justify-center gap-3 text-white py-3 rounded-xl disabled:opacity-50 transition-all font-semibold shadow-lg"
                style={{ background: "linear-gradient(90deg, #1a4d3e, #2d7a5e)" }}
              >
                <Fingerprint className="w-5 h-5" />
                {biometricLoading ? "認証中..." : "生体認証でログイン"}
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">またはパスワードでログイン</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            </>
          )}

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
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:outline-none transition-all"
                style={{ "--tw-ring-color": "#1a4d3e" } as React.CSSProperties}
                placeholder="admin@demo.co.jp"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs hover:underline"
                  style={{ color: "#1a4d3e" }}
                >
                  パスワードを忘れた
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:outline-none transition-all"
                placeholder="admin123"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-xl disabled:opacity-50 transition-opacity font-semibold shadow-md mt-2"
              style={{ background: "linear-gradient(90deg, #1a4d3e, #2d7a5e)" }}
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            デモ: admin@demo.co.jp / admin123
          </p>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "rgba(201,168,76,0.7)" }}>
          © 2024 KAMO construction. All rights reserved.
        </p>
      </div>
    </div>
  );
}
