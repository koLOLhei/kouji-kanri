"use client";

import { useState, useEffect, useCallback } from "react";

const OUTDOOR_MODE_KEY = "outdoor_mode";

function applyOutdoorMode(enabled: boolean): void {
  if (typeof document === "undefined") return;
  if (enabled) {
    document.documentElement.classList.add("outdoor-mode");
  } else {
    document.documentElement.classList.remove("outdoor-mode");
  }
}

export function useOutdoorMode(): [boolean, () => void] {
  const [outdoor, setOutdoor] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(OUTDOOR_MODE_KEY) === "true";
  });

  useEffect(() => {
    applyOutdoorMode(outdoor);
  }, [outdoor]);

  // Apply on initial load from storage
  useEffect(() => {
    const stored = localStorage.getItem(OUTDOOR_MODE_KEY) === "true";
    setOutdoor(stored);
    applyOutdoorMode(stored);
  }, []);

  const toggle = useCallback(() => {
    setOutdoor((prev) => {
      const next = !prev;
      localStorage.setItem(OUTDOOR_MODE_KEY, String(next));
      applyOutdoorMode(next);
      return next;
    });
  }, []);

  return [outdoor, toggle];
}
