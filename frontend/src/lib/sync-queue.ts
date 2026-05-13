"use client";

/* ============================================================
   IndexedDB Offline Queue Operations
   ============================================================ */

export interface SyncConflictRecord {
  entity_type: string;
  entity_id: string;
  local_data: Record<string, unknown>;
  local_updated_at: string;
  server_data: Record<string, unknown>;
  server_updated_at: string;
}

const CONFLICTS_KEY = "sync_conflicts";

const DB_NAME = "offline-queue";
const STORE_NAME = "requests";

function openQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

export interface QueuedRequest {
  id?: number;
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
  timestamp: number;
}

export async function queueOfflineRequest(
  url: string,
  method: string,
  body: unknown
): Promise<void> {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    // Grab auth token from localStorage if available
    const token = localStorage.getItem("kk_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({
      url,
      method,
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers,
      timestamp: Date.now(),
    } as QueuedRequest);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineQueueCount(): Promise<number> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

export async function getOfflineQueue(): Promise<QueuedRequest[]> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as QueuedRequest[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteQueueItem(id: number): Promise<void> {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ============================================================
   Sync Queue on Reconnect
   ============================================================ */

/**
 * Extract the base URL path without trailing ID segment.
 * e.g. "http://127.0.0.1:8001/api/projects/123/photos/456" -> "/api/projects/123/photos"
 */
function getBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing UUID/ID segment (simple heuristic: last segment if it looks like an ID)
    const parts = parsed.pathname.split("/").filter(Boolean);
    // If the last part looks like a UUID or numeric ID, strip it
    if (
      parts.length > 1 &&
      /^[0-9a-f-]{8,}$/i.test(parts[parts.length - 1])
    ) {
      parts.pop();
    }
    return "/" + parts.join("/");
  } catch {
    return url;
  }
}

/* ============================================================
   Conflict Storage Helpers
   ============================================================ */

export function getStoredConflicts(): SyncConflictRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONFLICTS_KEY);
    return raw ? (JSON.parse(raw) as SyncConflictRecord[]) : [];
  } catch {
    return [];
  }
}

export function addConflict(conflict: SyncConflictRecord): void {
  if (typeof window === "undefined") return;
  const existing = getStoredConflicts().filter(
    (c) => !(c.entity_type === conflict.entity_type && c.entity_id === conflict.entity_id)
  );
  localStorage.setItem(CONFLICTS_KEY, JSON.stringify([...existing, conflict]));
}

export function clearConflicts(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONFLICTS_KEY);
}

export function removeConflict(entity_type: string, entity_id: string): void {
  if (typeof window === "undefined") return;
  const updated = getStoredConflicts().filter(
    (c) => !(c.entity_type === entity_type && c.entity_id === entity_id)
  );
  localStorage.setItem(CONFLICTS_KEY, JSON.stringify(updated));
}

/* ============================================================
   Sync Queue on Reconnect
   ============================================================ */

export async function syncOfflineQueue(): Promise<{
  synced: number;
  failed: number;
}> {
  const results = { synced: 0, failed: 0 };

  // If service worker is available, delegate to it
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve({ synced: event.data.synced, failed: event.data.failed });
      };
      navigator.serviceWorker.controller!.postMessage(
        { type: "SYNC_NOW" },
        [channel.port2]
      );
      // Timeout fallback
      setTimeout(() => resolve(results), 10000);
    });
  }

  // Fallback: process queue sequentially in FIFO order (by timestamp)
  const queue = await getOfflineQueue();
  // Sort ascending by timestamp to ensure FIFO
  const ordered = [...queue].sort((a, b) => a.timestamp - b.timestamp);

  // Track base URLs where a POST failed, to block dependent PUT/DELETE
  const blockedBaseUrls = new Set<string>();

  for (const item of ordered) {
    const baseUrl = getBaseUrl(item.url);

    // If this item's base URL is blocked (a prior POST failed), skip it
    if (blockedBaseUrls.has(baseUrl) && item.method !== "POST") {
      results.failed++;
      continue;
    }

    try {
      // multipart 疑似リクエスト判定: body が { _multipart: true, ... } の JSON ならば
      // FormData に再構築してから送信する。base64 でエンコードされたファイルは Blob に戻す。
      const bodyStr = typeof item.body === "string" ? item.body : JSON.stringify(item.body);
      let bodyForRequest: BodyInit = bodyStr;
      const reqHeaders: Record<string, string> = { ...item.headers };
      try {
        const parsed = JSON.parse(bodyStr) as Record<string, unknown>;
        if (parsed && parsed._multipart === true) {
          const fd = new FormData();
          for (const [k, v] of Object.entries(parsed)) {
            if (k === "_multipart") continue;
            if (k === "file_base64" && typeof v === "string") {
              const fname = String(parsed.file_name ?? "upload.bin");
              const ftype = String(parsed.file_type ?? "application/octet-stream");
              const bin = atob(v);
              const arr = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
              fd.append("file", new Blob([arr], { type: ftype }), fname);
              continue;
            }
            if (k === "photo_base64" && typeof v === "string") {
              const fname = String(parsed.photo_name ?? "photo.jpg");
              const ftype = String(parsed.photo_type ?? "image/jpeg");
              const bin = atob(v);
              const arr = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
              fd.append("file", new Blob([arr], { type: ftype }), fname);
              continue;
            }
            if (k === "file_name" || k === "file_type" || k === "photo_name" || k === "photo_type") continue;
            if (v === null || v === undefined) continue;
            fd.append(k, typeof v === "string" ? v : JSON.stringify(v));
          }
          bodyForRequest = fd;
          // FormData: ブラウザに boundary を付けさせるため Content-Type を消す
          delete reqHeaders["Content-Type"];
          delete reqHeaders["content-type"];
        }
      } catch {
        // body が JSON で無ければ通常の文字列ボディとして送信
      }
      const response = await fetch(item.url, {
        method: item.method,
        headers: reqHeaders,
        body: bodyForRequest,
      });

      if (response.status === 409) {
        // Conflict — store for user resolution
        try {
          const conflictPayload = await response.json() as {
            entity_type?: string;
            entity_id?: string;
            server_data?: Record<string, unknown>;
            server_updated_at?: string;
          };
          const localBody = typeof item.body === "string"
            ? (JSON.parse(item.body) as Record<string, unknown>)
            : (item.body as Record<string, unknown>);
          const entityType = conflictPayload.entity_type ?? "unknown";
          const entityId = conflictPayload.entity_id ?? (localBody["id"] as string | undefined) ?? "";
          addConflict({
            entity_type: entityType,
            entity_id: entityId,
            local_data: localBody,
            local_updated_at: (localBody["updated_at"] as string | undefined) ?? new Date(item.timestamp).toISOString(),
            server_data: conflictPayload.server_data ?? {},
            server_updated_at: conflictPayload.server_updated_at ?? "",
          });
        } catch {
          // If we can't parse the 409 body, just count as failed
        }
        results.failed++;
        continue;
      }

      // 認証失効 (401/403) は queue から削除しない — トークンが切れただけで
      // データ自体は有効なので、再ログイン後に再送できる状態を保つ。
      // バリデーション失敗 (422) は永続的なエラーなので queue から削除する。
      if (response.ok) {
        if (item.id != null) await deleteQueueItem(item.id);
        results.synced++;
      } else if (response.status === 401 || response.status === 403) {
        // 認証エラー: queue に残す。UI で再ログインを促すために event 発火
        results.failed++;
        if (typeof self !== "undefined" && "dispatchEvent" in self) {
          try {
            (self as { dispatchEvent: (e: Event) => boolean }).dispatchEvent(
              new CustomEvent("kk-queue-auth-failure", { detail: { url: item.url } })
            );
          } catch {
            // dispatchEvent unsupported (Worker context等)
          }
        }
      } else if (response.status >= 400 && response.status < 500) {
        // 4xx (422 等) は永続エラー: queue から削除して loop を防ぐ
        if (item.id != null) await deleteQueueItem(item.id);
        results.failed++;
      } else {
        results.failed++;
        // 5xx は一時的エラーとして queue に残す
        if (item.method === "POST") {
          blockedBaseUrls.add(baseUrl);
        }
      }
    } catch {
      results.failed++;
      // Network error on POST — block subsequent dependent requests
      if (item.method === "POST") {
        blockedBaseUrls.add(baseUrl);
      }
      // Still offline — stop processing further to avoid wasting retries
      break;
    }
  }
  return results;
}
