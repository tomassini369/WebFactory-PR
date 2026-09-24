const CACHE_NAME = "webfactory-pr-v3";

const ADMIN_SHELLS = {
  "/webfactory-admin": "./webfactory-admin/index.html",
  "/client-admin": "./client-admin/index.html"
};

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./manifest-webfactory-admin.webmanifest",
  "./manifest-client-admin.webmanifest",
  "./webfactory-admin/index.html",
  "./client-admin/index.html",
  "./webfactory-pr-logo.png",
  "./apple-touch-icon-clean.png",
  "./icon-clean-192.png",
  "./icon-clean-512.png",
  "./icon-clean-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    const path = new URL(event.request.url).pathname.replace(/\/$/, "") || "/";
    const fallback = ADMIN_SHELLS[path] || "./index.html";
    event.respondWith(fetch(event.request).catch(() => caches.match(fallback)));
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
