// ─── Ask Lizzie — service worker ────────────────────────────────
// Privacy-first caching: only the offline fallback page is cached.
// Document content is never cached. Nothing from /api is cached.
// Cache name is versioned so old caches clear on deploy.

const CACHE = "lizzie-v2";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Navigation requests: network-first, fall back to the offline page.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
  // Never intercept API requests. Document analysis must always go to
  // the server and must never be served from a cache under any condition.
  // Other requests (static assets) are handled by the browser cache,
  // not by the service worker.
});
