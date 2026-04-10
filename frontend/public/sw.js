/* ============================================================
   Service Worker - 工事管理SaaS
   Network-first for API, cache-first for static assets
   IndexedDB queue for failed POST/PUT during offline
   Photo upload queue with retry on network restore
   "オフライン" banner notification to clients
   ============================================================ */

const CACHE_NAME = "kouji-kanri-v1";
const OFFLINE_QUEUE_DB = "offline-queue";
const OFFLINE_QUEUE_STORE = "requests";

const STATIC_ASSETS = [
  "/",
  "/today",
  "/capture",
  "/projects",
  "/manifest.json",
  "/favicon.ico",
];

/* ---- Install: cache static shell ---- */
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignore errors for missing static files in dev
      });
    })
  );
});

/* ---- Activate: clean old caches ---- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---- IndexedDB helpers ---- */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_QUEUE_DB, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        const store = db.createObjectStore(OFFLINE_QUEUE_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueRequest(url, method, body, headers) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, "readwrite");
    tx.objectStore(OFFLINE_QUEUE_STORE).add({
      url,
      method,
      body,
      headers,
      timestamp: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getQueuedRequests() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, "readonly");
    const req = tx.objectStore(OFFLINE_QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteQueuedRequest(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, "readwrite");
    tx.objectStore(OFFLINE_QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---- Fetch: network-first for API, cache-first for static ---- */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Photo upload - special handling with queue on failure
  if (request.method === "POST" && url.pathname.includes("/photos")) {
    event.respondWith(handlePhotoUpload(request));
    return;
  }

  // Other mutable requests (POST/PUT/PATCH) - queue offline
  if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
    event.respondWith(handleMutableRequest(request));
    return;
  }

  // API calls: network-first, fall back to cache
  if (url.pathname.startsWith("/api/") || url.hostname === "127.0.0.1") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets: cache-first
  event.respondWith(cacheFirst(request));
});

async function handlePhotoUpload(request) {
  try {
    return await fetch(request);
  } catch {
    // No network - store photo in IndexedDB queue
    try {
      const body = await request.arrayBuffer();
      const headers = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });
      await queueRequest(request.url, request.method, body, headers);

      // Notify clients about queued upload
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({ type: "PHOTO_QUEUED", url: request.url });
      });

      return new Response(
        JSON.stringify({
          queued: true,
          message: "オフライン: 写真をキューに追加しました。接続回復時に自動送信されます。",
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (queueError) {
      return new Response(
        JSON.stringify({ error: "写真のキューイングに失敗しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "オフラインです。データを取得できません。" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("オフライン", { status: 503 });
  }
}

async function handleMutableRequest(request) {
  try {
    return await fetch(request);
  } catch {
    // Queue the request for later
    try {
      const body = await request.text();
      const headers = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });
      await queueRequest(request.url, request.method, body, headers);
      return new Response(
        JSON.stringify({
          queued: true,
          message: "オフラインのためキューに追加されました。接続回復時に送信されます。",
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (queueError) {
      return new Response(
        JSON.stringify({ error: "リクエストのキューイングに失敗しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
}

/* ---- Background Sync ---- */
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-queue" || event.tag === "photo-upload-retry") {
    event.waitUntil(syncQueue());
  }
});

async function syncQueue() {
  const requests = await getQueuedRequests();
  const results = { synced: 0, failed: 0 };

  for (const req of requests) {
    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
      if (response.ok || response.status < 500) {
        await deleteQueuedRequest(req.id);
        results.synced++;
      } else {
        results.failed++;
      }
    } catch {
      results.failed++;
      // Still offline - stop retrying
      break;
    }
  }

  // Notify all clients
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "SYNC_COMPLETE", ...results });
  });

  return results;
}

/* ---- Message handling ---- */
self.addEventListener("message", async (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data.type === "SYNC_NOW" || event.data === "retry-uploads") {
    const results = await syncQueue();
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: "SYNC_RESULT", ...results });
    }
  }
  if (event.data.type === "GET_QUEUE_COUNT" || event.data === "get-queue-count") {
    const requests = await getQueuedRequests();
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: "QUEUE_COUNT", count: requests.length });
    } else if (event.source) {
      event.source.postMessage({ type: "QUEUE_COUNT", count: requests.length });
    }
  }
});

/*
  Client-side offline banner integration:
  Add to your layout/root component:

  useEffect(() => {
    const showBanner = () => {
      // Show "オフライン" banner
    };
    const hideBanner = () => {
      // Hide banner, trigger sync
      navigator.serviceWorker?.controller?.postMessage({ type: "SYNC_NOW" });
    };
    window.addEventListener('offline', showBanner);
    window.addEventListener('online', hideBanner);
    return () => {
      window.removeEventListener('offline', showBanner);
      window.removeEventListener('online', hideBanner);
    };
  }, []);
*/
