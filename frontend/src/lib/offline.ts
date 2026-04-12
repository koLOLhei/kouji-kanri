"use client";

import { useState, useEffect, useCallback } from "react";
import {
  syncOfflineQueue as _syncOfflineQueue,
  getOfflineQueueCount as _getOfflineQueueCount,
} from "@/lib/sync-queue";

/* ============================================================
   Re-exports from focused modules (backward compatibility)
   ============================================================ */

export { registerServiceWorker } from "@/lib/sw-manager";

export {
  type QueuedRequest,
  queueOfflineRequest,
  getOfflineQueueCount,
  getOfflineQueue,
  deleteQueueItem,
  syncOfflineQueue,
} from "@/lib/sync-queue";

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
      _syncOfflineQueue().catch(() => {});
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
    const c = await _getOfflineQueueCount();
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
