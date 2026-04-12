"use client";

/* ============================================================
   Service Worker Registration and Update Handling
   ============================================================ */

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      // When a new SW is waiting, tell it to skip waiting so it takes control immediately
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New version available — activate it immediately
            newWorker.postMessage("SKIP_WAITING");
          }
        });
      });

      // Reload the page when the new SW takes control
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });

      // Register background sync when online
      if ("sync" in registration) {
        navigator.serviceWorker.ready.then((reg) => {
          (
            reg as ServiceWorkerRegistration & {
              sync: { register: (tag: string) => Promise<void> };
            }
          ).sync
            .register("sync-offline-queue")
            .catch(() => {
              // Background sync not available, fall back to manual sync
            });
        });
      }
    } catch (err) {
      console.error("[SW] Registration failed:", err);
    }
  });

  // Listen for sync completion messages
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.type === "SYNC_COMPLETE") {
      window.dispatchEvent(
        new CustomEvent("sw-sync-complete", { detail: event.data })
      );
    }
  });
}
