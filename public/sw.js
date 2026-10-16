// Minimal service worker — exists mainly to satisfy PWA install criteria
// (Chrome requires a registered SW with a fetch handler before it offers
// "Install app"). Intentionally does NOT cache the app shell or API responses,
// since this app is SSR'd and its data changes — caching that would risk
// showing stale/broken screens. It only caches the small static icon set so
// they still resolve if the network hiccups for a moment.
const STATIC_CACHE = "connect-hub-static-v1";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request)),
    );
    return;
  }
  // Everything else (pages, API calls): always go to the network. No offline
  // fallback on purpose — this app needs a live connection to be useful.
});
