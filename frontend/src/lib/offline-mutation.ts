/**
 * Offline-aware mutation helper.
 *
 * Pattern:
 *   const submit = useOfflineMutation();
 *   try {
 *     await submit("/api/projects/X/daily-reports", { method: "POST", body: {...} });
 *   } catch { ... }
 *
 * Behaviour:
 *   - When `navigator.onLine` is true, performs the fetch immediately.
 *   - When offline (or fetch throws a network error), enqueues to IndexedDB
 *     and resolves with `{ queued: true }` so the UI can show "保留中".
 *   - Service worker drains the queue when connectivity returns.
 */

"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { queueOfflineRequest } from "@/lib/sync-queue";
import { API_BASE } from "@/lib/api-base";

export interface OfflineMutateOptions {
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** If true, never queue — only attempt online (e.g. reads should not queue). */
  noQueue?: boolean;
}

export interface OfflineMutateResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  /** True when the request was offline-queued instead of sent. */
  queued: boolean;
  /** Error detail (only when ok=false). */
  error?: string;
}

function isNetworkError(err: unknown): boolean {
  if (typeof err === "object" && err !== null) {
    const message = String((err as { message?: unknown }).message ?? "");
    return /failed to fetch|network|offline|timeout/i.test(message);
  }
  return false;
}

export function useOfflineMutation() {
  const { token } = useAuth();

  const mutate = useCallback(
    async <T = unknown>(
      path: string,
      opts: OfflineMutateOptions = {},
    ): Promise<OfflineMutateResult<T>> => {
      const method = opts.method ?? "POST";
      const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const isOnline =
        typeof navigator === "undefined" ? true : navigator.onLine;

      // Queue immediately if offline and queueing is allowed
      if (!isOnline && !opts.noQueue) {
        await queueOfflineRequest(url, method, opts.body ?? {});
        // Notify subscribers (offline banner / queue counter) — service worker
        // may pick it up too via registered Background Sync.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("kk-offline-queued", { detail: { url, method } }));
        }
        return { ok: true, status: 0, queued: true };
      }

      try {
        const res = await fetch(url, {
          method,
          headers,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        });
        const text = await res.text();
        let data: unknown = undefined;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
        }
        if (!res.ok) {
          const errMsg =
            typeof data === "object" && data !== null && "detail" in data
              ? String((data as { detail: unknown }).detail)
              : `HTTP ${res.status}`;
          return { ok: false, status: res.status, queued: false, error: errMsg };
        }
        return { ok: true, status: res.status, queued: false, data: data as T };
      } catch (err) {
        // Network error → queue and inform caller
        if (isNetworkError(err) && !opts.noQueue) {
          await queueOfflineRequest(url, method, opts.body ?? {});
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("kk-offline-queued", { detail: { url, method } }));
          }
          return { ok: true, status: 0, queued: true };
        }
        const message = err instanceof Error ? err.message : "送信に失敗しました";
        return { ok: false, status: 0, queued: false, error: message };
      }
    },
    [token],
  );

  return mutate;
}
