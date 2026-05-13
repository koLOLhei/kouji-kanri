/**
 * API base URL の一元化。
 *
 * 優先順位:
 *   1. NEXT_PUBLIC_API_BASE (ビルド時 env)
 *   2. NEXT_PUBLIC_API_URL  (旧名サポート)
 *   3. NODE_ENV === "production" なら本番 API、それ以外は localhost
 *
 * Vercel 上で env vars 設定が漏れても本番 URL に向かう (Failed to fetch 防止)。
 * dev では .env.local で NEXT_PUBLIC_API_BASE=http://127.0.0.1:8001 を設定。
 */

export const PRODUCTION_API_BASE = "https://kouji-kanri-api.onrender.com";
export const DEV_API_BASE = "http://127.0.0.1:8001";

export function getApiBase(): string {
  const explicit =
    process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL;
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "production") return PRODUCTION_API_BASE;
  return DEV_API_BASE;
}

export const API_BASE = getApiBase();
