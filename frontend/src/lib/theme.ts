/**
 * D22: Dark mode hook.
 * Persists preference to localStorage; applies/removes the `dark` class on <html>.
 */
"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "kk_theme";

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return null;
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getClientSnapshot(): Theme {
  return readStoredTheme() ?? getSystemTheme();
}

function getServerSnapshot(): Theme {
  return "light";
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  // Apply class whenever theme changes (DOM is an external system, fine in effect)
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newTheme);
      // Trigger storage event manually for same-tab subscribers
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: newTheme }));
    }
  }, []);

  return [theme, setTheme];
}
