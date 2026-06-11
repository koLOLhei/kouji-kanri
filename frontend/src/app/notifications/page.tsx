"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, formatDate } from "@/lib/utils";
import { Bell, CheckCheck, Circle } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  link_url: string | null;
  notification_type: string | null;
}

interface NotificationListResponse {
  items: Notification[];
  total: number;
  limit: number;
  offset: number;
}

export default function NotificationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<NotificationListResponse>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch("/api/notifications", { token: token! }),
    enabled: !!token,
  });

  const notifications: Notification[] = data?.items ?? [];

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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
          <Bell className="w-6 h-6" /> 通知
          {unreadCount > 0 && (
            <span className="text-sm bg-red-600 text-white px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="ml-auto flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-700 active:bg-gray-900 disabled:opacity-50"
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
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.is_read) markRead.mutate(n.id);
                if (n.link_url) {
                  window.location.href = n.link_url;
                }
              }}
              className={`bg-white border rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${
                !n.is_read ? "border-gray-300 bg-gray-50" : "border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {n.is_read ? (
                    <Circle className="w-2 h-2 text-transparent" />
                  ) : (
                    <Circle className="w-2 h-2 fill-gray-900 text-gray-900" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3
                      className={`text-sm text-gray-900 ${
                        !n.is_read ? "font-bold" : "font-medium"
                      }`}
                    >
                      {n.title}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                  {n.message && (
                    <p
                      className={`text-sm mt-1 ${
                        !n.is_read ? "text-gray-900" : "text-gray-700"
                      }`}
                    >
                      {n.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
