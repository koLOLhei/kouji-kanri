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
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body as string,
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

      if (response.ok || response.status < 500) {
        if (item.id != null) await deleteQueueItem(item.id);
        results.synced++;
      } else {
        results.failed++;
        // A failed POST means subsequent requests to the same resource may be invalid
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
