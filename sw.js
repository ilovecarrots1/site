/* NeuroDifference service worker — app-shell cache, offline-first reads. */

const VERSION = "nd-v2.1.4";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./icon-maskable.svg",
  "./app/styles.css",
  "./app/main.js",
  "./app/core.js",
  "./app/srs.js",
  "./app/data/compounds.js",
  "./app/data/compounds-a.js",
  "./app/data/compounds-b.js",
  "./app/data/compounds-c.js",
  "./app/data/compounds-d.js",
  "./app/data/neuro.js",
  "./app/data/interactions.js",
  "./app/data/learn.js",
  "./app/views/ui.js",
  "./app/views/home.js",
  "./app/views/compounds.js",
  "./app/views/neuro.js",
  "./app/views/lab.js",
  "./app/views/learn.js",
  "./app/views/evidence.js",
  "./app/views/ask.js",
  "./app/views/notes.js",
  "./app/views/settings.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Navigations: network first, fall back to the cached shell so deep links work offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Same-origin assets: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});