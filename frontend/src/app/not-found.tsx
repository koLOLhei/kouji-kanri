/**
 * D26: Custom 404 page — shown when Next.js cannot find a route.
 */

import Link from "next/link";
import { Building2, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-green-900 px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md text-center">
        {/* KAMO branding */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-800 rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-lg font-bold text-gray-900 leading-none">KAMO construction</h1>
            <p className="text-xs text-gray-400">工事管理SaaS</p>
          </div>
        </div>

        {/* 404 display */}
        <div className="mb-6">
          <p
            className="text-8xl font-extrabold"
            style={{ color: "#1a4d3e", lineHeight: 1 }}
          >
            404
          </p>
          <div className="w-16 h-1 bg-amber-400 rounded-full mx-auto mt-3 mb-6" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            ページが見つかりません
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            お探しのページは移動・削除されたか、<br />
            URLが正しくない可能性があります。
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold transition-colors"
            style={{ backgroundColor: "#1a4d3e" }}
          >
            <Home className="w-4 h-4" />
            ダッシュボードへ戻る
          </Link>
          <Link
            href="/projects"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            案件一覧を見る
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          問題が続く場合は管理者にお問い合わせください
        </p>
      </div>
    </div>
  );
}
