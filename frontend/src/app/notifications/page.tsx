"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { Bell, CheckCheck, Circle } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link: string | null;
  type: string | null;
}

export default function NotificationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch("/api/notifications", { token: token! }),
    enabled: !!token,
  });

  const markRead = useMutation({
    mutationFn: (notifId: string) =>
      apiFetch(`/api/notifications/${notifId}/read`, {
        token: token!,
        method: "PUT",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () =>
      apiFetch("/api/notifications/mark-all-read", {
        token: token!,
        method: "PUT",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" /> 通知
          {unreadCount > 0 && (
            <span className="text-sm bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="ml-auto flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <CheckCheck className="w-4 h-4" /> すべて既読にする
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : notifications.length === 0 ? (
        <p className="text-gray-500">通知がありません</p>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => { if (!n.is_read) markRead.mutate(n.id); }}
              className={`bg-white border rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${
                !n.is_read ? "border-blue-200 bg-blue-50" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {n.is_read ? (
                    <Circle className="w-2 h-2 text-transparent" />
                  ) : (
                    <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm ${!n.is_read ? "font-bold" : "font-medium"}`}>
                      {n.title}
                    </h3>
                    <span className="text-xs text-gray-400">{formatDate(n.created_at)}</span>
                  </div>
                  <p className={`text-sm mt-1 ${!n.is_read ? "text-gray-800" : "text-gray-600"}`}>
                    {n.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
