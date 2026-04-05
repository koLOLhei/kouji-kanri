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
