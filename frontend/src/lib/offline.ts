"use client";

import { useState, useEffect, useCallback } from "react";

/* ============================================================
   Service Worker Registration
   ============================================================ */

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("[SW] Registered:", registration.scope);

      // Check for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New content available
            console.log("[SW] New version available");
          }
        });
      });

      // Register background sync when online
      if ("sync" in registration) {
        navigator.serviceWorker.ready.then((reg) => {
          (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync
            .register("sync-offline-queue")
            .catch(() => {
              // Background sync not available, fall back to manual sync
            });
        });
      }
    } catch (err) {
      console.error("[SW] Registration failed:", err);
    }
  });

  // Listen for sync completion messages
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.type === "SYNC_COMPLETE") {
      console.log("[SW] Sync complete:", event.data);
      window.dispatchEvent(
        new CustomEvent("sw-sync-complete", { detail: event.data })
      );
    }
  });
}

/* ============================================================
   IndexedDB Queue Helpers (client-side mirror of SW helpers)
   ============================================================ */

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

async function deleteQueueItem(id: number): Promise<void> {
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

  // Fallback: process queue directly
  const queue = await getOfflineQueue();
  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body as string,
      });
      if (response.ok || response.status < 500) {
        if (item.id != null) await deleteQueueItem(item.id);
        results.synced++;
      } else {
        results.failed++;
      }
    } catch {
      results.failed++;
    }
  }
  return results;
}

/* ============================================================
   Hooks
   ============================================================ */

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Auto-sync when back online
      syncOfflineQueue().catch(() => {});
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}

export function useOfflineQueueCount(): number {
  const [count, setCount] = useState(0);
  const online = useOnlineStatus();

  const refresh = useCallback(async () => {
    const c = await getOfflineQueueCount();
    setCount(c);
  }, []);

  useEffect(() => {
    refresh();
  }, [online, refresh]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("sw-sync-complete", handler);
    return () => window.removeEventListener("sw-sync-complete", handler);
  }, [refresh]);

  // Poll every 5 seconds
  useEffect(() => {
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  return count;
}
