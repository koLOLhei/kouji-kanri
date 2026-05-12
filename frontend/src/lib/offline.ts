"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
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

function _subscribeOnline(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleOnline = () => {
    _syncOfflineQueue().catch(() => {});
    callback();
  };
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", callback);
  };
}

function _getOnlineSnapshot(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function _getOnlineServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(_subscribeOnline, _getOnlineSnapshot, _getOnlineServerSnapshot);
}

export function useOfflineQueueCount(): number {
  const [count, setCount] = useState(0);
  const online = useOnlineStatus();

  const refresh = useCallback(async () => {
    const c = await _getOfflineQueueCount();
    setCount(c);
  }, []);

  // refresh() is intentionally called from effects when online state flips —
  // it updates the count via setState, but only because online state actually changed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
