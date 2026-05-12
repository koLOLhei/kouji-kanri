"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const OUTDOOR_MODE_KEY = "outdoor_mode";

function applyOutdoorMode(enabled: boolean): void {
  if (typeof document === "undefined") return;
  if (enabled) {
    document.documentElement.classList.add("outdoor-mode");
  } else {
    document.documentElement.classList.remove("outdoor-mode");
  }
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === OUTDOOR_MODE_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getClientSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(OUTDOOR_MODE_KEY) === "true";
}

function getServerSnapshot(): boolean {
  return false;
}

export function useOutdoorMode(): [boolean, () => void] {
  const outdoor = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    applyOutdoorMode(outdoor);
  }, [outdoor]);

  const toggle = useCallback(() => {
    if (typeof window === "undefined") return;
    const next = !(localStorage.getItem(OUTDOOR_MODE_KEY) === "true");
    localStorage.setItem(OUTDOOR_MODE_KEY, String(next));
    window.dispatchEvent(new StorageEvent("storage", { key: OUTDOOR_MODE_KEY, newValue: String(next) }));
  }, []);

  return [outdoor, toggle];
}
