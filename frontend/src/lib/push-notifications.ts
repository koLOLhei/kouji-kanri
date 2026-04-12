"use client";

import { useState, useEffect } from "react";

/* ============================================================
   Push Notification Helpers
   ============================================================ */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

export function useNotificationPermission(): "granted" | "denied" | "default" {
  const [permission, setPermission] = useState<
    "granted" | "denied" | "default"
  >("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  return permission;
}

export function showLocalNotification(
  title: string,
  body: string,
  options?: NotificationOptions
): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const defaultOptions: NotificationOptions = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    tag: "kouji-kanri",
    ...options,
  };

  // Prefer using service worker for notifications (persistent)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, defaultOptions);
    });
  } else {
    new Notification(title, defaultOptions);
  }
}

/* ============================================================
   Notification settings storage helpers
   ============================================================ */

export interface NotificationSettings {
  pushEnabled: boolean;
  approvalRequests: boolean;
  deadlineAlerts: boolean;
  comments: boolean;
}

const SETTINGS_KEY = "notification_settings";

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") {
    return {
      pushEnabled: false,
      approvalRequests: true,
      deadlineAlerts: true,
      comments: false,
    };
  }
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored) as NotificationSettings;
  } catch {
    // ignore
  }
  return {
    pushEnabled: false,
    approvalRequests: true,
    deadlineAlerts: true,
    comments: false,
  };
}

export function saveNotificationSettings(
  settings: NotificationSettings
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/* ============================================================
   Web Push Subscription (server-backed)
   ============================================================ */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8001";

/**
 * Convert a URL-safe base64 string to a Uint8Array (required by
 * pushManager.subscribe for applicationServerKey).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export interface PushSubscribeResult {
  success: boolean;
  error?: string;
}

/**
 * Request notification permission, subscribe to Web Push, and register the
 * subscription with the backend at /api/push/subscribe.
 *
 * VAPID_PUBLIC_KEY must be set via NEXT_PUBLIC_VAPID_PUBLIC_KEY env var.
 */
export async function subscribeToPush(token: string): Promise<PushSubscribeResult> {
  if (typeof window === "undefined") {
    return { success: false, error: "サーバーサイドでは利用できません" };
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { success: false, error: "このブラウザはプッシュ通知に対応していません" };
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    return { success: false, error: "通知の許可が拒否されました" };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return { success: false, error: "VAPID公開キーが設定されていません" };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await existing.unsubscribe();
    }

    const appKey = urlBase64ToUint8Array(vapidPublicKey);
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appKey.buffer as ArrayBuffer,
    });

    const subJson = subscription.toJSON();
    const keys = subJson.keys as { p256dh?: string; auth?: string } | undefined;

    const res = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh_key: keys?.p256dh ?? "",
        auth_key: keys?.auth ?? "",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      return { success: false, error: err.detail ?? "サーバー登録に失敗しました" };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "プッシュ購読に失敗しました",
    };
  }
}

/**
 * Unsubscribe from Web Push and remove the subscription from the server.
 */
export async function unsubscribeFromPush(token: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch(`${API_BASE}/api/push/subscriptions`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      await sub.unsubscribe();
    }
  } catch {
    // best-effort
  }
}
