"use client";

/**
 * D27: Next.js error boundary — shown when an unhandled error is thrown in a
 * route segment. The `reset` function retries rendering the segment.
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md text-center">
        {/* Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          エラーが発生しました
        </h1>
        <p className="text-sm text-gray-500 mb-2">
          予期しない問題が発生しました。もう一度試してください。
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded px-2 py-1 mb-6 inline-block">
            エラーID: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-3 mt-4">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            再試行
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            ダッシュボードへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
