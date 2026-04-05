"use client";

import { useState, useEffect } from "react";
import { WifiOff, RefreshCw, CheckCircle, X } from "lucide-react";
import { useOnlineStatus, useOfflineQueueCount, syncOfflineQueue } from "@/lib/offline";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const queueCount = useOfflineQueueCount();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    failed: number;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed when going offline
  useEffect(() => {
    if (!online) setDismissed(false);
  }, [online]);

  // Clear sync result after 4 seconds
  useEffect(() => {
    if (!syncResult) return;
    const id = setTimeout(() => setSyncResult(null), 4000);
    return () => clearTimeout(id);
  }, [syncResult]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncOfflineQueue();
      setSyncResult(result);
    } finally {
      setSyncing(false);
    }
  };

  // Show sync success banner when back online with queued items that were synced
  if (online && syncResult && !dismissed) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between gap-3 bg-green-600 text-white px-4 py-2.5 text-sm font-medium shadow-lg animate-slide-in">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            {syncResult.synced}件のデータを同期しました
            {syncResult.failed > 0 && `（${syncResult.failed}件失敗）`}
          </span>
        </div>
        <button
          onClick={() => setSyncResult(null)}
          className="p-1 rounded hover:bg-green-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Show offline banner
  if (!online && !dismissed) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between gap-3 bg-amber-600 text-white px-4 py-2.5 text-sm font-medium shadow-lg">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            オフラインモード - データは接続回復時に同期されます
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-amber-700 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Show queue badge when online but has pending items
  if (online && queueCount > 0 && !dismissed) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between gap-3 bg-blue-600 text-white px-4 py-2.5 text-sm font-medium shadow-lg animate-slide-in">
        <div className="flex items-center gap-2">
          <RefreshCw className={cn("w-4 h-4 flex-shrink-0", syncing && "animate-spin")} />
          <span>{queueCount}件の未送信データがあります</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            {syncing ? "同期中..." : "今すぐ同期"}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-blue-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
