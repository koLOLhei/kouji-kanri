"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Building2, Fingerprint } from "lucide-react";
import {
  canUseBiometric,
  isBiometricRegistered,
  authenticateWithBiometric,
  registerBiometric,
} from "@/lib/biometric-auth";

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
      // After successful password login, offer biometric registration
      if (biometricAvailable && !biometricRegistered) {
        // Retrieve the token that was just stored by login()
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
        // Store token using the same key as auth.tsx
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
      // Registration failed - continue anyway
    } finally {
      setBiometricLoading(false);
      window.location.href = "/";
    }
  };

  // Show biometric registration prompt after password login
  if (showRegisterBiometric) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <Fingerprint className="w-16 h-16 text-blue-600 mx-auto mb-4" />
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
              className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold"
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Building2 className="w-10 h-10 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">工事管理SaaS</h1>
            <p className="text-sm text-gray-500">案件管理・写真管理・書類自動生成</p>
          </div>
        </div>

        {/* Biometric login button */}
        {biometricAvailable && biometricRegistered && (
          <button
            type="button"
            onClick={handleBiometricLogin}
            disabled={biometricLoading}
            className="w-full mb-4 flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all font-semibold shadow-lg shadow-blue-300/30"
          >
            <Fingerprint className="w-5 h-5" />
            {biometricLoading ? "認証中..." : "生体認証でログイン"}
          </button>
        )}

        {biometricAvailable && biometricRegistered && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">またはパスワードでログイン</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin@demo.co.jp"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin123"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          デモ: admin@demo.co.jp / admin123
        </p>
      </div>
    </div>
  );
}
